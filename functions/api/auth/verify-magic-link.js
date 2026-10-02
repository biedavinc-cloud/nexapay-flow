import { getDb } from "../../_lib/db.js";
import { sha256Hex } from "../../_lib/password.js";
import { jsonError, withErrors } from "../../_lib/http.js";
import { findUserByEmail } from "../../_lib/users.js";
import { createSessionToken, setSessionCookieHeader } from "../../_lib/session.js";
import { ensureSuperAdmin } from "../../_lib/superadminWhitelist.js";

const MAX_ATTEMPTS = 5;

function redirect(location, headers = {}) {
  return new Response(null, { status: 302, headers: { Location: location, ...headers } });
}

// GET because this is opened by clicking a link in an email client, not
// called by the SPA. On success it sets the session cookie and redirects
// straight into the app -- no code to type, no extra request from the user.
export const onRequestGet = withErrors(async ({ request, env }) => {
  const url = new URL(request.url);
  const email = (url.searchParams.get("email") || "").toLowerCase().trim();
  const token = url.searchParams.get("token") || "";
  const fail = (reason) => redirect(`/register?error=${encodeURIComponent(reason)}`);

  if (!email || !token) return fail("invalid_link");

  const user = await findUserByEmail(env, email);
  if (!user || !user.otp_code_hash || !user.otp_expires_at) return fail("invalid_link");
  if (user.otp_attempts >= MAX_ATTEMPTS) return fail("too_many_attempts");
  if (new Date(user.otp_expires_at).getTime() < Date.now()) return fail("expired_link");

  const sql = getDb(env);
  const providedHash = await sha256Hex(token);
  if (providedHash !== user.otp_code_hash) {
    await sql`update nexapay_auth_users set otp_attempts = otp_attempts + 1 where id = ${user.id}`;
    return fail("invalid_link");
  }

  let [updated] = await sql`
    update nexapay_auth_users
    set email_verified = true, otp_code_hash = null, otp_expires_at = null, otp_attempts = 0
    where id = ${user.id}
    returning *
  `;
  updated = await ensureSuperAdmin(sql, updated);

  const sessionToken = await createSessionToken(env, updated.id);
  const dest = updated.tenant_id ? "/dashboard" : "/onboarding";
  return redirect(dest, { "Set-Cookie": setSessionCookieHeader(sessionToken) });
});
