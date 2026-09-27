import { getDb } from "../../_lib/db.js";
import { requireMerchant } from "../../_lib/merchantAuth.js";

function genSlug() {
  return `nx_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export async function onRequestGet({ request, env }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.tenantId && !auth.isAdmin) return Response.json({ links: [] });

  const rows = auth.tenantId
    ? await sql`select * from nexapay_payment_links where tenant_id = ${auth.tenantId} order by created_date desc limit 200`
    : await sql`select * from nexapay_payment_links order by created_date desc limit 200`;
  return Response.json({ links: rows });
}

export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.tenantId) return Response.json({ error: "No merchant account linked to this session." }, { status: 422 });

  const body = await request.json().catch(() => ({}));
  const label = String(body.label || "").trim();
  const amount = Number(body.amount);
  if (!label || !Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "label and a positive amount are required" }, { status: 400 });
  }

  const [row] = await sql`
    insert into nexapay_payment_links (id, tenant_id, label, amount, currency, network, description, slug, active, created_date, updated_date)
    values (gen_random_uuid()::text, ${auth.tenantId}, ${label}, ${amount}, ${body.currency || "EUR"}, ${body.network || "TRC20"}, ${body.description || ""}, ${genSlug()}, true, now(), now())
    returning *
  `;
  return Response.json({ link: row });
}
