import { getUserIdFromRequest } from "./session.js";

// Any authenticated user with a tenant_id (or admin/SUPER_ADMIN, who can act
// on behalf of any tenant via an explicit tenant_id param). Returns
// { userId, tenantId, role } or null.
export async function requireMerchant(sql, env, request) {
  const userId = await getUserIdFromRequest(env, request);
  if (!userId) return null;
  const rows = await sql`select tenant_id, role from nexapay_auth_users where id = ${userId} limit 1`;
  const row = rows[0];
  if (!row) return null;
  const isAdmin = row.role === "admin" || row.role === "SUPER_ADMIN";
  if (!row.tenant_id && !isAdmin) return null;
  return { userId, tenantId: row.tenant_id || null, role: row.role, isAdmin };
}
