import { getDb } from "../../_lib/db.js";
import { requireMerchant } from "../../_lib/merchantAuth.js";

function genKey(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const b64url = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${prefix}${b64url}`;
}

export async function onRequestGet({ request, env }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.tenantId) return Response.json([]);

  const rows = await sql`select id, label, publishable_key, active, last_used, created_date from nexapay_api_keys where tenant_id = ${auth.tenantId} order by created_date desc limit 200`;
  // Never return secret_key on list -- only at creation time, once.
  return Response.json(rows.map((r) => ({ ...r, secret_key: "••••••••" })));
}

export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.tenantId) return Response.json({ error: "No merchant account linked to this session." }, { status: 422 });

  const body = await request.json().catch(() => ({}));
  const label = String(body.label || "").trim() || "API key";
  // Server-generated (crypto.getRandomValues), never trust a client-supplied secret_key/publishable_key.
  const secret_key = genKey("nexa_sk_live_");
  const publishable_key = genKey("nexa_pk_live_");

  const [row] = await sql`
    insert into nexapay_api_keys (id, tenant_id, label, secret_key, publishable_key, active, created_date, updated_date)
    values (gen_random_uuid()::text, ${auth.tenantId}, ${label}, ${secret_key}, ${publishable_key}, true, now(), now())
    returning id, label, publishable_key, active, created_date
  `;
  // Only this response ever carries the plaintext secret_key.
  return Response.json({ ...row, secret_key });
}
