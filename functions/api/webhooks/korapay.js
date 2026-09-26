import { getDb } from "../../_lib/db.js";
import { resolvePspCredentials } from "../../_lib/pspCrypto.js";
import { verifyKorapayWebhookSignature, settleKorapayCharge } from "../../_lib/korapay.js";

// Korapay webhook: signature is checked, but the outcome is NEVER trusted
// from the body alone -- settleKorapayCharge re-verifies live with Korapay's
// own status API before touching fiat/crypto state (idempotent).
export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  try {
    const body = await request.json().catch(() => ({}));
    const cred = await resolvePspCredentials(sql, env, "KORAPAY");
    if (!cred) return new Response("not configured", { status: 503 });

    const sig = request.headers.get("x-korapay-signature");
    const ok = await verifyKorapayWebhookSignature(cred.keys, body?.data || {}, sig);
    if (!ok) return new Response("invalid signature", { status: 401 });

    const ref = body?.data?.payment_reference || body?.data?.reference;
    if (!ref) return new Response("missing reference", { status: 400 });

    await settleKorapayCharge(sql, env, cred.keys, ref);
    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
