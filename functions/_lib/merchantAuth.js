import { getUserIdFromRequest } from "./session.js";

// Any authenticated user. tenantId is null until onboarding completes --
// callers decide what to do with that (some return an empty list, others a
// clear "complete onboarding" error) rather than getting a bare 401 here,
// which would be indistinguishable from "not logged in at all".
export async function requireMerchant(sql, env, request) {
  const userId = await getUserIdFromRequest(env, request);
  if (!userId) return null;
  const rows = await sql`select tenant_id, role from nexapay_auth_users where id = ${userId} limit 1`;
  const row = rows[0];
  if (!row) return null;
  const isAdmin = row.role === "admin" || row.role === "SUPER_ADMIN";
  return { userId, tenantId: row.tenant_id || null, role: row.role, isAdmin };
}

// Any authenticated user (with or without a tenant). Returns { userId, tenantId, role, email } or null.
export async function requireUser(sql, env, request) {
  const userId = await getUserIdFromRequest(env, request);
  if (!userId) return null;
  const rows = await sql`select id, email, tenant_id, role from nexapay_auth_users where id = ${userId} limit 1`;
  const row = rows[0];
  if (!row) return null;
  return { userId, tenantId: row.tenant_id || null, role: row.role, email: row.email };
}
