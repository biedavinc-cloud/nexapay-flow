import { getDb } from "../../_lib/db.js";
import { encryptKeys, decryptKeys } from "../../_lib/pspCrypto.js";
import { getUserIdFromRequest } from "../../_lib/session.js";

// Superadmin-only PSP key management (Korapay/PayUnit/etc.), backed by Neon.
// This is the ONLY place PSP keys are configured -- the Cloudflare checkout
// path (functions/api/checkout/*) reads exclusively from
// nexapay_psp_configs, so whatever is saved here takes effect immediately,
// with no separate Base44 config to keep in sync.
async function requireAdmin(sql, env, request) {
  const userId = await getUserIdFromRequest(env, request);
  if (!userId) return null;
  const rows = await sql`select role from nexapay_auth_users where id = ${userId} limit 1`;
  const role = rows[0]?.role;
  if (role !== "admin" && role !== "SUPER_ADMIN") return null;
  return userId;
}

function maskValue(v) {
  const s = String(v || "");
  if (s.length <= 4) return "••••";
  return `••••${s.slice(-4)}`;
}

export async function onRequestGet({ request, env }) {
  const sql = getDb(env);
  if (!(await requireAdmin(sql, env, request))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const rows = await sql`select * from nexapay_psp_configs order by provider`;
  const configs = [];
  for (const row of rows) {
    let masked_keys = {};
    let has_keys = false;
    if (row.encrypted_keys) {
      try {
        const keys = await decryptKeys(env, row.encrypted_keys);
        has_keys = true;
        masked_keys = Object.fromEntries(Object.entries(keys || {}).map(([k, v]) => [k, maskValue(v)]));
      } catch { /* undecryptable (wrong PSP_ENCRYPTION_KEY?) -- report as not configured */ }
    }
    configs.push({
      provider: row.provider, active: row.active, environment: row.environment,
      priority_card: row.priority_card, priority_momo: row.priority_momo, notes: row.notes,
      has_keys, masked_keys, updated_date: row.updated_date,
    });
  }
  return Response.json({ configs });
}

export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  if (!(await requireAdmin(sql, env, request))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const provider = String(body.provider || "").toUpperCase();
  if (!provider) return Response.json({ error: "provider is required" }, { status: 400 });

  // Merge with existing decrypted keys so a partial update (rotating one
  // field) never wipes the others -- the admin UI only sends fields the
  // user actually typed a new value into.
  const existingRows = await sql`select encrypted_keys from nexapay_psp_configs where provider = ${provider} limit 1`;
  let mergedKeys = {};
  if (existingRows[0]?.encrypted_keys) {
    try { mergedKeys = (await decryptKeys(env, existingRows[0].encrypted_keys)) || {}; } catch {}
  }
  const incoming = body.credentials || body.keys || {};
  for (const [k, v] of Object.entries(incoming)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") mergedKeys[k] = String(v).trim();
  }

  const encrypted = await encryptKeys(env, mergedKeys);
  await sql`
    insert into nexapay_psp_configs (id, provider, active, environment, priority_card, priority_momo, notes, encrypted_keys, created_date, updated_date)
    values (gen_random_uuid()::text, ${provider}, ${body.active !== false}, ${body.environment || "sandbox"}, ${body.priority_card ?? 100}, ${body.priority_momo ?? 100}, ${body.notes || ""}, ${encrypted}, now(), now())
    on conflict (provider) do update set
      active = excluded.active,
      environment = excluded.environment,
      priority_card = excluded.priority_card,
      priority_momo = excluded.priority_momo,
      notes = excluded.notes,
      encrypted_keys = excluded.encrypted_keys,
      updated_date = now()
  `;
  return Response.json({ ok: true, provider });
}
