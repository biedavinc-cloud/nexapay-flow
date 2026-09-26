import { getDb } from "../../_lib/db.js";
import { resolvePspCredentials } from "../../_lib/pspCrypto.js";
import { settleKorapayCharge } from "../../_lib/korapay.js";
import { verifyAndSettle } from "../../_lib/payunit.js";
import { resolveApiKey, extractBearer } from "../../_lib/checkout.js";

function statusToPublic(internal) {
  if (internal === "COMPLETED") return "succeeded";
  if (internal === "FAILED") return "failed";
  return "pending";
}
function mapStatus(r, tx) {
  return { status: statusToPublic(r.status), transaction_id: r.transaction_id || tx.id, reference: r.reference || tx.reference_fiat, crypto_tx_hash: r.crypto_tx_hash, error: r.error };
}

async function handle({ request, env }) {
  const sql = getDb(env);
  try {
    const url = new URL(request.url);
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const bearer = (body.key ? String(body.key) : "") || extractBearer(request);
    const auth = bearer ? await resolveApiKey(sql, env, bearer) : null;
    if (!auth) return Response.json({ error: "Unauthorized: missing or invalid key." }, { status: 401 });

    const reference = url.searchParams.get("reference") || body.reference || url.searchParams.get("transaction_id") || body.transaction_id;
    if (!reference) return Response.json({ error: "Missing reference or transaction_id." }, { status: 400 });

    let rows = await sql`select * from nexapay_transactions where reference_fiat = ${reference} limit 1`;
    let tx = rows[0];
    if (!tx) { rows = await sql`select * from nexapay_transactions where id = ${reference} limit 1`; tx = rows[0]; }
    if (!tx) return Response.json({ error: "Transaction not found." }, { status: 404 });
    if (auth.tenant_id && tx.tenant_id && tx.tenant_id !== auth.tenant_id) return Response.json({ error: "Not found." }, { status: 404 });

    if (tx.payment_method === "CARD") {
      const cred = await resolvePspCredentials(sql, env, "KORAPAY");
      if (!cred) return Response.json({ status: statusToPublic(tx.status), transaction_id: tx.id, reference: tx.reference_fiat });
      const r = await settleKorapayCharge(sql, env, cred.keys, tx.korapay_reference || tx.reference_fiat);
      return Response.json(mapStatus(r, tx));
    }
    const cred = await resolvePspCredentials(sql, env, "PAYUNIT");
    if (!cred) return Response.json({ status: statusToPublic(tx.status), transaction_id: tx.id, reference: tx.reference_fiat });
    const r = await verifyAndSettle(sql, env, cred.keys, tx.reference_fiat);
    return Response.json(mapStatus(r, tx));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
export const onRequestGet = handle;
export const onRequestPost = handle;
