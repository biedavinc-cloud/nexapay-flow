// Cloudflare-native port of base44/shared/korapay.ts (direct card charge, no
// redirect). Keys come from Neon (nexapay_psp_configs, AES-256-GCM
// encrypted) instead of Base44 secrets.
import { settleFiatCaptured, markFailed, logTx } from "./settlement.js";

const BASE_URL = "https://api.korapay.com";
const enc = new TextEncoder();

async function encryptChargeData(encryptionKey, paymentData) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", enc.encode(encryptionKey), { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, enc.encode(paymentData));
  const out = new Uint8Array(buf);
  const ct = out.slice(0, out.length - 16);
  const tag = out.slice(out.length - 16);
  const toHex = (b) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${toHex(iv)}:${toHex(ct)}:${toHex(tag)}`;
}

function authHeaders(secretKey) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${secretKey}` };
}

export async function chargeCard(keys, { reference, card, amount, currency, redirectUrl, customer, metadata }) {
  const payload = JSON.stringify({ reference, card, amount, currency, redirect_url: redirectUrl, customer, metadata: metadata || {} });
  const chargeData = await encryptChargeData(keys.encryption_key, payload);
  const r = await fetch(`${BASE_URL}/merchant/api/v1/charges/card`, { method: "POST", headers: authHeaders(keys.secret_key), body: JSON.stringify({ charge_data: chargeData }) });
  const d = await r.json().catch(() => ({}));
  if (!d?.status) throw new Error(d?.message || `Korapay card charge failed (${r.status})`);
  return d;
}

export async function verifyCharge(keys, reference) {
  const r = await fetch(`${BASE_URL}/merchant/api/v1/charges/${encodeURIComponent(reference)}`, { method: "GET", headers: authHeaders(keys.secret_key) });
  const d = await r.json().catch(() => ({}));
  if (!d?.status) throw new Error(d?.message || `Korapay verify failed (${r.status})`);
  return d;
}

export async function verifyKorapayWebhookSignature(keys, bodyData, signatureHeader) {
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(keys.secret_key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(JSON.stringify(bodyData)));
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return computed === String(signatureHeader).toLowerCase();
}

// Idempotent settle-by-reference: re-verifies live with Korapay before ever
// touching crypto or fiat status -- never trusts a webhook body alone.
export async function settleKorapayCharge(sql, env, keys, korapayRef) {
  let rows = await sql`select * from nexapay_transactions where korapay_reference = ${korapayRef} limit 1`;
  let tx = rows[0];
  if (!tx) {
    rows = await sql`select * from nexapay_transactions where reference_fiat = ${korapayRef} limit 1`;
    tx = rows[0];
  }
  if (!tx) return { status: "NOT_FOUND" };
  if (tx.status === "COMPLETED") return { status: "COMPLETED", transaction_id: tx.id, reference: tx.reference_fiat };
  if (tx.status === "CRYPTO_FAILED") return { status: "CRYPTO_FAILED", transaction_id: tx.id, reference: tx.reference_fiat, error: tx.error_message };

  let korapayStatus = "processing";
  try {
    const v = await verifyCharge(keys, tx.korapay_reference || korapayRef);
    korapayStatus = (v?.data?.status || v?.status || "processing").toLowerCase();
  } catch (e) {
    return { status: "ERROR", error: e.message };
  }

  if (korapayStatus !== "success") {
    if (korapayStatus === "failed" || korapayStatus === "cancelled") {
      return await markFailed(sql, tx, "KORAPAY", `Card payment ${korapayStatus} at PSP.`);
    }
    return { status: "PENDING", transaction_id: tx.id, reference: tx.reference_fiat };
  }

  await sql`update nexapay_transactions set status = 'FIAT_APPROVED', payment_method = 'CARD', updated_date = now() where id = ${tx.id}`;
  await logTx(sql, tx, tx.status, "FIAT_APPROVED", `Card confirmed (${tx.amount_fiat} ${tx.currency_fiat}).`, "INFO", "korapay");
  return await settleFiatCaptured(sql, env, { tx: { ...tx, status: "FIAT_APPROVED" }, provider: "KORAPAY" });
}
