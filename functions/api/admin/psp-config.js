import { getDb } from "../../_lib/db.js";
import { encryptKeys } from "../../_lib/pspCrypto.js";
import { getUserIdFromRequest } from "../../_lib/session.js";

// Superadmin-only PSP key management (Korapay/PayUnit/etc.), backed by Neon.
// Keys are AES-256-GCM encrypted at rest (pspCrypto.js) and never returned
// in GET responses -- only which providers are configured/active.
async function requireAdmin(sql, env, request) {
  const userId = await getUserIdFromRequest(env, request);
  if (!userId) return null;
  const rows = await sql`select role from nexapay_auth_users where id = ${userId} limit 1`;
  const role = rows[0]?.role;
  if (role !== "admin" && role !== "SUPER_ADMIN") return null;
  return userId;
}

export async function onRequestGet({ request, env }) {
  const sql = getDb(env);
  if (!(await requireAdmin(sql, env, request))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const rows = await sql`select provider, active, priority_card, priority_momo, (encrypted_keys is not null) as configured, updated_date from nexapay_psp_configs order by provider`;
  return Response.json({ providers: rows });
}

export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  if (!(await requireAdmin(sql, env, request))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const provider = String(body.provider || "").toUpperCase();
  if (!provider) return Response.json({ error: "provider is required" }, { status: 400 });
  if (!body.keys || typeof body.keys !== "object") return Response.json({ error: "keys object is required" }, { status: 400 });

  const encrypted = await encryptKeys(env, body.keys);
  await sql`
    insert into nexapay_psp_configs (id, provider, active, priority_card, priority_momo, encrypted_keys, created_date, updated_date)
    values (gen_random_uuid()::text, ${provider}, ${body.active !== false}, ${body.priority_card ?? 100}, ${body.priority_momo ?? 100}, ${encrypted}, now(), now())
    on conflict (provider) do update set
      active = excluded.active,
      priority_card = excluded.priority_card,
      priority_momo = excluded.priority_momo,
      encrypted_keys = excluded.encrypted_keys,
      updated_date = now()
  `;
  return Response.json({ ok: true, provider });
}
