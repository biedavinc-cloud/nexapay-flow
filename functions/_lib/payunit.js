// Cloudflare-native port of base44/shared/payunit.ts.
import { settleFiatCaptured, markFailed, logTx } from "./settlement.js";
import { decodePayload } from "./checkout.js";

const BASE_URL = "https://gateway.payunit.net";

function payunitHeaders(keys) {
  const basic = btoa(`${keys.api_user}:${keys.api_password}`);
  return { "Content-Type": "application/json", "x-api-key": keys.api_key, mode: keys.mode || "live", Authorization: `Basic ${basic}` };
}

export async function getPaymentStatus(keys, transaction_id) {
  const r = await fetch(`${BASE_URL}/api/gateway/paymentstatus/${encodeURIComponent(transaction_id)}`, { method: "GET", headers: payunitHeaders(keys) });
  const d = await r.json().catch(() => ({}));
  if (d?.status !== "SUCCESS") throw new Error(d?.message || `Payunit status failed (${r.status})`);
  return d.data;
}

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
  return GATEWAY_MAP[country]?.[operator] || "";
}

export async function makePayment(keys, { gateway, amount, currency, transaction_id, return_url, notify_url, phone_number }) {
  const body = { gateway, amount, transaction_id, return_url, notify_url, phone_number, currency, paymentType: "button" };
  const r = await fetch(`${BASE_URL}/api/gateway/makepayment`, { method: "POST", headers: payunitHeaders(keys), body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (d?.status !== "SUCCESS") throw new Error(d?.message || `Payunit makepayment failed (${r.status})`);
  return d.data;
}

// Idempotent: verify live with PayUnit, then settle. Safe to call from both
// the notify webhook and client polling.
export async function verifyAndSettle(sql, env, keys, ref) {
  const rows = await sql`select * from nexapay_transactions where reference_fiat = ${ref} limit 1`;
  const tx = rows[0];
  if (!tx) return { status: "NOT_FOUND" };
  if (tx.status === "COMPLETED") return { status: "COMPLETED", transaction_id: tx.id, reference: ref, amount: tx.amount_fiat, currency: tx.currency_fiat };
  if (tx.status === "FAILED") return { status: "FAILED", transaction_id: tx.id, reference: ref, error: tx.error_message || "Payment failed." };

  const meta = decodePayload(tx.payload_base64);
  const payunitTxId = meta.payunit_tx_id;
  if (!payunitTxId) return { status: "ERROR", error: "Missing PayUnit transaction id." };

  let payunitStatus = "PENDING", gateway = "";
  try {
    const ps = await getPaymentStatus(keys, payunitTxId);
    payunitStatus = (ps.transaction_status || "PENDING").toUpperCase();
    gateway = ps.transaction_gateway || "";
  } catch (e) {
    return { status: "ERROR", error: e.message };
  }

  if (payunitStatus !== "SUCCESS") {
    if (payunitStatus === "FAILED" || payunitStatus === "CANCELLED") {
      return await markFailed(sql, tx, "PAYUNIT", `Payment ${payunitStatus} at PayUnit${gateway ? ` (${gateway})` : ""}.`);
    }
    return { status: "PENDING", transaction_id: tx.id, reference: ref };
  }

  const method = /ORANGE|MTN|MOBILE|MOMO/i.test(gateway) ? "MOBILE_MONEY" : tx.payment_method;
  await sql`update nexapay_transactions set status = 'FIAT_APPROVED', payment_method = ${method}, updated_date = now() where id = ${tx.id}`;
  await logTx(sql, tx, tx.status, "FIAT_APPROVED", `PayUnit payment confirmed (${tx.amount_fiat} ${tx.currency_fiat}${gateway ? `, ${gateway}` : ""}).`, "INFO", "payunit");
  return await settleFiatCaptured(sql, env, { tx: { ...tx, status: "FIAT_APPROVED" }, provider: "PAYUNIT" });
}
