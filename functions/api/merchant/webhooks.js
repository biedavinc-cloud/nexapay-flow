import { getDb } from "../../_lib/db.js";
import { requireMerchant } from "../../_lib/merchantAuth.js";

function genSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const b64url = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `whsec_${b64url}`;
}

export async function onRequestGet({ request, env }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.tenantId) return Response.json([]);

  const rows = await sql`select id, label, url, active, events, created_date from nexapay_webhook_endpoints where tenant_id = ${auth.tenantId} order by created_date desc limit 200`;
  return Response.json(rows.map((r) => ({ ...r, signing_secret: "••••••••" })));
}

export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.tenantId) return Response.json({ error: "No merchant account linked to this session." }, { status: 422 });

  const body = await request.json().catch(() => ({}));
  const label = String(body.label || "").trim() || "Webhook";
  const url = String(body.url || "").trim();
  if (!url || !/^https:\/\//i.test(url)) return Response.json({ error: "A valid https:// URL is required" }, { status: 400 });
  const events = String(body.events || "payment.succeeded,payment.failed").trim();
  const signing_secret = genSecret();

  const [row] = await sql`
    insert into nexapay_webhook_endpoints (id, tenant_id, label, url, signing_secret, active, events, created_date, updated_date)
    values (gen_random_uuid()::text, ${auth.tenantId}, ${label}, ${url}, ${signing_secret}, true, ${events}, now(), now())
    returning id, label, url, active, events, created_date
  `;
  return Response.json({ ...row, signing_secret });
}
