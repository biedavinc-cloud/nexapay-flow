import { getDb } from "../../../_lib/db.js";
import { requireMerchant } from "../../../_lib/merchantAuth.js";

async function loadOwned(sql, auth, id) {
  const rows = await sql`select * from nexapay_webhook_endpoints where id = ${id} limit 1`;
  const row = rows[0];
  if (!row) return null;
  if (!auth.isAdmin && row.tenant_id !== auth.tenantId) return null;
  return row;
}

export async function onRequestPatch({ request, env, params }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await loadOwned(sql, auth, params.id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const active = typeof body.active === "boolean" ? body.active : existing.active;
  await sql`update nexapay_webhook_endpoints set active = ${active}, updated_date = now() where id = ${params.id}`;
  return Response.json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await loadOwned(sql, auth, params.id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  await sql`delete from nexapay_webhook_endpoints where id = ${params.id}`;
  return Response.json({ ok: true });
}
