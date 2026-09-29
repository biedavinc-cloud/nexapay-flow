import { getUserIdFromRequest } from "./session.js";

// Superadmin/admin session check (role read from Neon, never trusted from the client).
export async function requireAdmin(sql, env, request) {
  const userId = await getUserIdFromRequest(env, request);
  if (!userId) return null;
  const rows = await sql`select role from nexapay_auth_users where id = ${userId} limit 1`;
  const role = rows[0]?.role;
  if (role !== "admin" && role !== "SUPER_ADMIN") return null;
  return userId;
}
