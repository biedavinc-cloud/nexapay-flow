import { getDb } from "./db.js";

// Fields safe to send to the frontend (never the hashes/tokens).
export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    email_verified: row.email_verified,
    full_name: row.full_name,
    country: row.country,
    city: row.city,
    phone: row.phone,
    role: row.role,
    tenant_id: row.tenant_id,
    kyc_status: row.kyc_status,
    created_at: row.created_at,
  };
}

export async function findUserByEmail(env, email) {
  const sql = getDb(env);
  const rows = await sql`select * from users where email = ${email.toLowerCase()} limit 1`;
  return rows[0] || null;
}

export async function findUserById(env, id) {
  const sql = getDb(env);
  const rows = await sql`select * from users where id = ${id} limit 1`;
  return rows[0] || null;
}

export async function findUserByGoogleId(env, googleId) {
  const sql = getDb(env);
  const rows = await sql`select * from users where google_id = ${googleId} limit 1`;
  return rows[0] || null;
}

export async function findUserByResetTokenHash(env, tokenHash) {
  const sql = getDb(env);
  const rows = await sql`
    select * from users
    where reset_token_hash = ${tokenHash} and reset_token_expires_at > now()
    limit 1
  `;
  return rows[0] || null;
}
