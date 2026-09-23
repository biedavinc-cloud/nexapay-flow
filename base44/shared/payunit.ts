// NexaPay ↔ Payunit PSP integration.
// Payunit is a real payment service provider (card + Mobile Money) for Africa.
// Flow: initPayment (hosted page) → client pays on Payunit → notify webhook + return redirect
// → verifyAndSettle checks the live Payunit status and, on SUCCESS, runs the real crypto
// payout (Binance/KuCoin) to NexaPay's wallet + signs the marketplace webhook.
// Docs: https://developer.payunit.net/rest-api

import { secrets, waitUntil } from "base44:runtime";
import { executeCryptoOrder } from "./crypto.ts";
import { signWebhook, resolveWebhookSecret } from "./checkout.ts";
import { mirrorTransaction, mirrorLog } from "./neon.ts";

const BASE_URL = "https://gateway.payunit.net";

function safeSecret(name) {
  try {
    return secrets.get(name);
  } catch {
    return undefined;
  }
}

// Dynamic key cache — populated per-request from the Back-Office PspConfig (DB).
let _keys = null;
export function setPayunitKeys(k) { _keys = k; }
export function payunitConfigured() {
  return !!(apiKey() && apiUser() && apiPassword());
}
function apiKey() { return _keys?.api_key || safeSecret("PAYUNIT_API_KEY"); }
function apiUser() { return _keys?.api_user || safeSecret("PAYUNIT_API_USER"); }
function apiPassword() { return _keys?.api_password || safeSecret("PAYUNIT_API_PASSWORD"); }
function apiMode() { return _keys?.mode || safeSecret("PAYUNIT_MODE") || "test"; }
function payunitHeaders() {
  const basic = btoa(`${apiUser()}:${apiPassword()}`);
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey(),
    mode: apiMode(),
    Authorization: `Basic ${basic}`,
  };
}

// Initialize a Payunit transaction → returns the hosted payment page URL.
export async function initPayment({ total_amount, currency, transaction_id, return_url, notify_url, payment_country }) {
  const body = { total_amount, currency, transaction_id, return_url, notify_url };
  if (payment_country) body.payment_country = payment_country;
  const r = await fetch(`${BASE_URL}/api/gateway/initialize`, {
    method: "POST",
    headers: payunitHeaders(),
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (d?.status !== "SUCCESS" || !d?.data?.transaction_url) {
    throw new Error(d?.message || `Payunit initialize failed (${r.status})`);
  }
  return d.data;
}

// Query the live payment status from Payunit.
export async function getPaymentStatus(transaction_id) {
  const r = await fetch(`${BASE_URL}/api/gateway/paymentstatus/${encodeURIComponent(transaction_id)}`, {
    method: "GET",
    headers: payunitHeaders(),
  });
  const d = await r.json().catch(() => ({}));
  if (d?.status !== "SUCCESS") throw new Error(d?.message || `Payunit status failed (${r.status})`);
  return d.data; // { transaction_status, transaction_gateway, ... }
}

// PayUnit direct Mobile Money charge (no redirect): /api/gateway/makepayment.
// The customer receives a USSD/OTP push on their phone and validates with their PIN;
// the checkout polls the status until confirmed — the user never leaves NexaPay.
const GATEWAY_MAP = {
  CM: { "Orange Money": "CM_ORANGE", "MTN Mobile Money": "CM_MTN", "Nextel Money": "CM_NEXTTEL" },
  CI: { "Orange Money": "CI_ORANGE", "MTN MoMo": "CI_MTN", "Moov Money": "CI_MOOV", "Wave": "CI_WAVE" },
  SN: { "Orange Money": "SN_ORANGE", "Wave": "SN_WAVE", "Free Money": "SN_FREE" },
  ML: { "Orange Money": "ML_ORANGE", "Moov Money": "ML_MOOV" },
  BF: { "Orange Money": "BF_ORANGE", "Moov Money": "BF_MOOV" },
  BJ: { "MTN MoMo": "BJ_MTN", "Moov Money": "BJ_MOOV" },
  NE: { "Moov Money": "NE_MOOV", "Airtel Money": "NE_AIRTEL" },
  TG: { "Moov Money": "TG_MOOV", "Togocel Money": "TG_TOGOCEL" },
  NG: { "MTN MoMo": "NG_MTN", "Airtel Money": "NG_AIRTEL" },
  GH: { "MTN MoMo": "GH_MTN", "Airtel Money": "GH_AIRTEL" },
};

export function resolveGateway(country, operator) {
  const map = GATEWAY_MAP[country];
  if (!map) return "";
  return map[operator] || "";
}

// Direct Mobile Money charge. Returns { id, transaction_id, payment_status, provider_transaction_id }.
export async function makePayment({ gateway, amount, currency, transaction_id, return_url, notify_url, phone_number }) {
  const body = { gateway, amount, transaction_id, return_url, notify_url, phone_number, currency, paymentType: "button" };
  const r = await fetch(`${BASE_URL}/api/gateway/makepayment`, {
    method: "POST",
    headers: payunitHeaders(),
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (d?.status !== "SUCCESS") throw new Error(d?.message || `Payunit makepayment failed (${r.status})`);
  return d.data;
}

function decodePayload(b64) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(b64 || ""))));
  } catch {
    return {};
  }
}

// Idempotent: verifies the Payunit payment for `ref` (reference_fiat) and, on SUCCESS,
// settles the crypto payout. Safe to call repeatedly (webhook + polling).
export async function verifyAndSettle(base44, ref) {
  const matches = await base44.asServiceRole.entities.Transaction.filter({ reference_fiat: ref });
  const tx = matches && matches[0];
  if (!tx) return { status: "NOT_FOUND" };

  if (tx.status === "COMPLETED") {
    return { status: "COMPLETED", transaction_id: tx.id, reference: ref, amount: tx.amount_fiat, currency: tx.currency_fiat };
  }
  if (tx.status === "FAILED") {
    return { status: "FAILED", transaction_id: tx.id, reference: ref, error: tx.error_message || "Échec du paiement." };
  }

  const meta = decodePayload(tx.payload_base64);
  const payunitTxId = meta.payunit_tx_id;
  if (!payunitTxId) return { status: "ERROR", error: "Identifiant Payunit manquant." };

  let payunitStatus = "PENDING";
  let gateway = "";
  try {
    const ps = await getPaymentStatus(payunitTxId);
    payunitStatus = (ps.transaction_status || "PENDING").toUpperCase();
    gateway = ps.transaction_gateway || "";
  } catch (e) {
    return { status: "ERROR", error: e.message };
  }

  const log = async (from, to, message, level = "INFO", actor = "system") => {
    const rec = await base44.asServiceRole.entities.TransactionLog.create({
      transaction_id: tx.id, reference_fiat: ref, from_status: from || "", to_status: to, level, message, actor,
    });
    waitUntil(mirrorLog(rec).catch(() => {}));
  };

  // Payunit not yet successful → keep waiting.
  if (payunitStatus !== "SUCCESS") {
    if (payunitStatus === "FAILED" || payunitStatus === "CANCELLED") {
      const updated = await base44.asServiceRole.entities.Transaction.update(tx.id, {
        status: "FAILED", error_message: `Paiement ${payunitStatus} côté Payunit.`,
      });
      await log(tx.status, "FAILED", `Paiement Payunit ${payunitStatus}${gateway ? ` (${gateway})` : ""}.`, "WARN", "payunit");
      waitUntil(mirrorTransaction(updated).catch(() => {}));
      return { status: "FAILED", transaction_id: tx.id, reference: ref, error: `Paiement ${payunitStatus}.` };
    }
    return { status: "PENDING", transaction_id: tx.id, reference: ref };
  }

  // Payunit SUCCESS → real fiat captured. Settle crypto.
  const method = /ORANGE|MTN|MOBILE|MOMO/i.test(gateway) ? "MOBILE_MONEY" : tx.payment_method;
  let updated = await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FIAT_APPROVED", payment_method: method });
  await log(tx.status, "FIAT_APPROVED", `Encaissement Payunit validé (${tx.amount_fiat} ${tx.currency_fiat}${gateway ? `, ${gateway}` : ""}). Cible: ${tx.usdt_amount} USDT sur ${tx.network}`, "INFO", "payunit");

  const usdtNet = tx.usdt_net_sent || tx.usdt_amount;
  const commissionUsdt = tx.nexapay_commission || 0;
  const receivingWallet = tx.destination_wallet;
  const network = tx.network;
  const order_id = meta.order_id;
  const webhook_url = meta.webhook_url;

  updated = await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "PROCESSING_CRYPTO" });
  await log("FIAT_APPROVED", "PROCESSING_CRYPTO", `Achat ${usdtNet} USDT (commission ${commissionUsdt}) → retrait vers ${receivingWallet}`, "INFO", "cryptoEngine");

  const purchase = await executeCryptoOrder({
    amount: usdtNet, asset: "USDT", network, wallet: receivingWallet,
    fiatAmount: tx.amount_fiat, fiatCurrency: tx.currency_fiat,
  });

  let webhookPayload;
  let resultStatus;
  if (purchase.provider) {
    updated = await base44.asServiceRole.entities.Transaction.update(tx.id, {
      status: "COMPLETED", crypto_provider: purchase.provider, tx_hash_crypto: purchase.tx_hash,
    });
    await log("PROCESSING_CRYPTO", "COMPLETED", `${usdtNet} USDT livré via ${purchase.provider}${purchase.live ? " (LIVE)" : ""} — ${purchase.tx_hash}`);
    webhookPayload = {
      event: "payment.succeeded", order_id, transaction_id: tx.id, reference: ref,
      amount: tx.amount_fiat, currency: tx.currency_fiat, usdt: tx.usdt_amount, usdt_net: usdtNet,
      nexapay_commission: commissionUsdt, network,
      crypto_payout_status: "COMPLETED", crypto_provider: purchase.provider,
      crypto_tx_hash: purchase.tx_hash, live: !!purchase.live,
    };
    resultStatus = "COMPLETED";
  } else {
    updated = await base44.asServiceRole.entities.Transaction.update(tx.id, {
      status: "FAILED", error_message: purchase.error,
    });
    await log("PROCESSING_CRYPTO", "FAILED", purchase.error, "ERROR", "cryptoEngine");
    webhookPayload = {
      event: "payment.failed", order_id, transaction_id: tx.id, reference: ref,
      amount: tx.amount_fiat, currency: tx.currency_fiat, usdt: tx.usdt_amount,
      crypto_payout_status: "FAILED", error: purchase.error,
    };
    resultStatus = "FAILED";
  }

  if (webhook_url) {
    const whSecret = await resolveWebhookSecret(base44, webhook_url);
    const { raw, header } = await signWebhook(webhookPayload, whSecret);
    waitUntil(
      (async () => {
        let httpStatus = 0;
        let deliveryStatus = "FAILED";
        try {
          const res = await fetch(webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "NexaPay-Signature": header },
            body: raw,
          });
          httpStatus = res.status;
          deliveryStatus = res.ok ? "SUCCESS" : "FAILED";
        } catch {
          deliveryStatus = "RETRYING";
        }
        await base44.asServiceRole.entities.WebhookLog.create({
          endpoint_url: webhook_url, event: webhookPayload.event, order_id: order_id || tx.id,
          status: deliveryStatus, http_status: httpStatus, attempts: 1, response_snippet: "",
        });
      })().catch(() => {})
    );
  }

  waitUntil(mirrorTransaction(updated).catch(() => {}));
  return {
    status: resultStatus, transaction_id: tx.id, reference: ref,
    crypto_provider: purchase.provider, crypto_tx_hash: purchase.tx_hash, error: purchase.error,
    amount: tx.amount_fiat, currency: tx.currency_fiat, order_id,
  };
}