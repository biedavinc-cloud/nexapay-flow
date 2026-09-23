// NexaPay ↔ Korapay PSP integration — white-label direct CARD charge.
// Korapay is used for CARD capture only (headless NexaPay UI); Mobile Money is
// handled by PayUnit (direct flow). Card data is AES-256-GCM encrypted with the
// Korapay encryption key, charged via /charges/card. On charge.success (NO_AUTH
// or post-3DS) the fiat is captured and the real crypto payout runs.
// Docs: https://developers.korapay.com/docs/accepting-card-payments-with-apis

import { secrets, waitUntil } from "base44:runtime";
import { executeCryptoOrder } from "./crypto.ts";
import { signWebhook, resolveWebhookSecret } from "./checkout.ts";
import { mirrorTransaction, mirrorLog } from "./neon.ts";

const BASE_URL = "https://api.korapay.com";
const enc = new TextEncoder();

function safeSecret(name) {
  try {
    return secrets.get(name);
  } catch {
    return undefined;
  }
}

// Dynamic key cache — populated per-request from the Back-Office PspConfig (DB).
// Falls back to Base44 Secrets (env) when no active DB config exists.
let _keys = null;
export function setKorapayKeys(k) { _keys = k; }
export function korapayConfigured() {
  return !!(secretKey() && encKey());
}
function secretKey() {
  return _keys?.secret_key || safeSecret("KORAPAY_SECRET_KEY");
}
function encKey() {
  return _keys?.encryption_key || safeSecret("KORAPAY_ENCRYPTION_KEY");
}

// AES-256-GCM encryption of the card charge payload → "iv:ciphertext:authTag" (all hex),
// matching Korapay's reference Node implementation.
async function encryptChargeData(encryptionKey, paymentData) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(encryptionKey),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    enc.encode(paymentData)
  );
  const out = new Uint8Array(buf);
  const ctLen = out.length - 16;
  const ct = out.slice(0, ctLen);
  const tag = out.slice(ctLen);
  const toHex = (b) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${toHex(iv)}:${toHex(ct)}:${toHex(tag)}`;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secretKey()}`,
  };
}

// Charge a card directly. Returns the raw Korapay charge response.
export async function chargeCard({ reference, card, amount, currency, redirectUrl, customer, metadata }) {
  const payload = JSON.stringify({
    reference,
    card,
    amount,
    currency,
    redirect_url: redirectUrl,
    customer,
    metadata: metadata || {},
  });
  const chargeData = await encryptChargeData(encKey(), payload);
  const r = await fetch(`${BASE_URL}/merchant/api/v1/charges/card`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ charge_data: chargeData }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d?.status) {
    throw new Error(d?.message || `Korapay card charge failed (${r.status})`);
  }
  return d;
}

// Verify a charge by reference (poll after 3DS or webhook).
export async function verifyCharge(reference) {
  const r = await fetch(`${BASE_URL}/merchant/api/v1/charges/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const d = await r.json().catch(() => ({}));
  if (!d?.status) {
    throw new Error(d?.message || `Korapay verify failed (${r.status})`);
  }
  return d;
}

// Verify an incoming Korapay webhook: x-korapay-signature = HMAC-SHA256(JSON.stringify(body.data), secretKey).
export async function verifyWebhookSignatureAsync(bodyData, signatureHeader) {
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(JSON.stringify(bodyData)));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === String(signatureHeader).toLowerCase();
}

function decodePayload(b64) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(b64 || ""))));
  } catch {
    return {};
  }
}

// Idempotent: settle a Korapay charge by reference. On success the fiat is captured;
// NexaPay buys + withdraws USDT to the merchant wallet. On crypto failure the fiat
// STAYS at Korapay (no fund loss) and a CryptoRetry entry is queued for the cron.
export async function settleKorapayCharge(base44, korapayRef) {
  const matches = await base44.asServiceRole.entities.Transaction.filter({ korapay_reference: korapayRef });
  const tx = matches && matches[0];
  if (!tx) {
    // Fallback: the charge reference might have been stored as the fiat reference too.
    const byFiat = await base44.asServiceRole.entities.Transaction.filter({ reference_fiat: korapayRef });
    if (byFiat && byFiat[0]) return settleKorapayCharge(base44, byFiat[0].korapay_reference || korapayRef);
    return { status: "NOT_FOUND" };
  }

  if (tx.status === "COMPLETED") {
    return { status: "COMPLETED", transaction_id: tx.id, reference: tx.reference_fiat };
  }
  if (tx.status === "CRYPTO_FAILED") {
    return { status: "CRYPTO_FAILED", transaction_id: tx.id, reference: tx.reference_fiat, error: tx.error_message };
  }

  const log = async (from, to, message, level = "INFO", actor = "system") => {
    const rec = await base44.asServiceRole.entities.TransactionLog.create({
      transaction_id: tx.id, reference_fiat: tx.reference_fiat, from_status: from || "", to_status: to,
      level, message, actor,
    });
    waitUntil(mirrorLog(rec).catch(() => {}));
  };

  // Confirm the charge is actually successful at Korapay before settling.
  let korapayStatus = "processing";
  try {
    const v = await verifyCharge(korapayRef);
    korapayStatus = (v?.data?.status || v?.status || "processing").toLowerCase();
  } catch (e) {
    return { status: "ERROR", error: e.message };
  }

  if (korapayStatus !== "success") {
    if (korapayStatus === "failed" || korapayStatus === "cancelled") {
      const updated = await base44.asServiceRole.entities.Transaction.update(tx.id, {
        status: "FAILED", error_message: `Paiement carte ${korapayStatus} côté PSP.`,
      });
      await log(tx.status, "FAILED", `Paiement carte ${korapayStatus}.`, "WARN", "korapay");
      waitUntil(mirrorTransaction(updated).catch(() => {}));
      return { status: "FAILED", transaction_id: tx.id, reference: tx.reference_fiat, error: `Paiement ${korapayStatus}.` };
    }
    return { status: "PENDING", transaction_id: tx.id, reference: tx.reference_fiat };
  }

  // Fiat captured → settle crypto payout.
  const meta = decodePayload(tx.payload_base64);
  const usdtNet = tx.usdt_net_sent || tx.usdt_amount_estimated || tx.usdt_amount;
  const commissionUsdt = tx.nexapay_commission || 0;
  const receivingWallet = tx.destination_wallet;
  const network = tx.network;
  const order_id = meta.order_id;
  const webhook_url = meta.webhook_url;

  let updated = await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FIAT_RECEIVED", payment_method: "CARD", psp_provider: "KORAPAY" });
  await log(tx.status, "FIAT_RECEIVED", `Carte validée (${tx.amount_fiat} ${tx.currency_fiat}, net ${tx.net_fiat_amount}). Cible: ${usdtNet} USDT sur ${network}`, "INFO", "korapay");

  updated = await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "CRYPTO_PROCESSING" });
  await log("FIAT_RECEIVED", "CRYPTO_PROCESSING", `Achat ${usdtNet} USDT (commission ${commissionUsdt}) → retrait vers ${receivingWallet}`, "INFO", "cryptoEngine");

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
    await log("CRYPTO_PROCESSING", "COMPLETED", `${usdtNet} USDT livré via ${purchase.provider}${purchase.live ? " (LIVE)" : ""} — ${purchase.tx_hash}`);
    webhookPayload = {
      event: "payment.succeeded", order_id, transaction_id: tx.id, reference: tx.reference_fiat,
      amount: tx.amount_fiat, currency: tx.currency_fiat, usdt: tx.usdt_amount, usdt_net: usdtNet,
      nexapay_commission: commissionUsdt, network,
      crypto_payout_status: "COMPLETED", crypto_provider: purchase.provider,
      crypto_tx_hash: purchase.tx_hash, live: !!purchase.live,
    };
    resultStatus = "COMPLETED";
  } else {
    // Crypto payout failed — fiat is safe at Korapay. Queue a retry; do NOT lose funds.
    updated = await base44.asServiceRole.entities.Transaction.update(tx.id, {
      status: "CRYPTO_FAILED", error_message: purchase.error,
    });
    await log("CRYPTO_PROCESSING", "CRYPTO_FAILED", purchase.error, "ERROR", "cryptoEngine");
    const nextRetry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.CryptoRetry.create({
      transaction_id: tx.id, reference_fiat: tx.reference_fiat, retry_count: 0,
      last_error: purchase.error, next_retry_at: nextRetry, status: "PENDING",
    });
    webhookPayload = {
      event: "payment.failed", order_id, transaction_id: tx.id, reference: tx.reference_fiat,
      amount: tx.amount_fiat, currency: tx.currency_fiat, usdt: tx.usdt_amount,
      crypto_payout_status: "CRYPTO_FAILED", error: purchase.error,
    };
    resultStatus = "CRYPTO_FAILED";
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
    status: resultStatus, transaction_id: tx.id, reference: tx.reference_fiat,
    crypto_provider: purchase.provider, crypto_tx_hash: purchase.tx_hash, error: purchase.error,
    amount: tx.amount_fiat, currency: tx.currency_fiat, order_id,
  };
}