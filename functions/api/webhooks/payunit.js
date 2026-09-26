import { getDb } from "../../_lib/db.js";
import { resolvePspCredentials } from "../../_lib/pspCrypto.js";
import { verifyAndSettle } from "../../_lib/payunit.js";

// PayUnit notify webhook: same idempotent re-verify-then-settle pattern.
export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  try {
    const url = new URL(request.url);
    const ref = url.searchParams.get("ref");
    if (!ref) return new Response("missing ref", { status: 400 });
    const cred = await resolvePspCredentials(sql, env, "PAYUNIT");
    if (!cred) return new Response("not configured", { status: 503 });
    await verifyAndSettle(sql, env, cred.keys, ref);
    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
export async function onRequestGet(ctx) { return onRequestPost(ctx); }
