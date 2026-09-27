// Mirrors src/lib/superadminWhitelist.js -- keep both in sync.
// These emails get SUPER_ADMIN (full, unrestricted platform access) the
// moment they authenticate, regardless of how their row was created.
export const SUPERADMIN_EMAILS = [
  "vincentnogue@yahoo.com",
  "vincentnogue2@gmail.com",
  "webdxb1@gmail.com",
];

export async function ensureSuperAdmin(sql, user) {
  if (!user || user.role === "SUPER_ADMIN") return user;
  if (!SUPERADMIN_EMAILS.includes((user.email || "").toLowerCase())) return user;
  const [updated] = await sql`update nexapay_auth_users set role = 'SUPER_ADMIN' where id = ${user.id} returning *`;
  return updated;
}
