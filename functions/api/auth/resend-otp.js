import { getDb } from "../../_lib/db.js";
import { generateToken, sha256Hex } from "../../_lib/password.js";
import { sendEmail, magicLinkEmailHtml } from "../../_lib/email.js";
import { json, jsonError, readJson, isValidEmail, withErrors } from "../../_lib/http.js";
import { findUserByEmail } from "../../_lib/users.js";

export const onRequestPost = withErrors(async ({ request, env }) => {
  const { email } = await readJson(request);
  if (!isValidEmail(email)) return jsonError("A valid email is required", 400);

  const user = await findUserByEmail(env, email);
  // Always respond ok to avoid leaking whether the email is registered.
  if (!user || user.email_verified) return json({ ok: true });

  const token = generateToken(32);
  const tokenHash = await sha256Hex(token);
  const tokenExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const sql = getDb(env);
  await sql`
    update nexapay_auth_users
    set otp_code_hash = ${tokenHash}, otp_expires_at = ${tokenExpires}, otp_attempts = 0
    where id = ${user.id}
  `;

  const host = request.headers.get("host") || "";
  const appUrl = host ? `https://${host}` : (env.APP_URL || "");
  const verifyUrl = `${appUrl}/api/auth/verify-magic-link?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email.toLowerCase())}`;
  await sendEmail(env, { to: email, subject: "Verify your NexaPay email", html: magicLinkEmailHtml(verifyUrl) });

  return json({ ok: true });
});
