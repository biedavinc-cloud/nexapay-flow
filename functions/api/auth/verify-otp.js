import { getDb } from "../../_lib/db.js";
import { sha256Hex } from "../../_lib/password.js";
import { json, jsonError, readJson, isValidEmail } from "../../_lib/http.js";
import { findUserByEmail, publicUser } from "../../_lib/users.js";
import { createSessionToken, setSessionCookieHeader } from "../../_lib/session.js";

const MAX_ATTEMPTS = 5;

export async function onRequestPost({ request, env }) {
  const { email, otpCode } = await readJson(request);
  if (!isValidEmail(email) || typeof otpCode !== "string") {
    return jsonError("Email and code are required", 400);
  }

  const user = await findUserByEmail(env, email);
  if (!user || !user.otp_code_hash || !user.otp_expires_at) {
    return jsonError("Invalid or expired code", 400);
  }
  if (user.otp_attempts >= MAX_ATTEMPTS) {
    return jsonError("Too many attempts. Request a new code.", 429);
  }
  if (new Date(user.otp_expires_at).getTime() < Date.now()) {
    return jsonError("Code has expired. Request a new one.", 400);
  }

  const sql = getDb(env);
  const providedHash = await sha256Hex(otpCode.trim());
  if (providedHash !== user.otp_code_hash) {
    await sql`update nexapay_auth_users set otp_attempts = otp_attempts + 1 where id = ${user.id}`;
    return jsonError("Invalid or expired code", 400);
  }

  const [updated] = await sql`
    update nexapay_auth_users
    set email_verified = true, otp_code_hash = null, otp_expires_at = null, otp_attempts = 0
    where id = ${user.id}
    returning *
  `;

  const token = await createSessionToken(env, updated.id);
  return json(
    { ok: true, user: publicUser(updated) },
    { headers: { "Set-Cookie": setSessionCookieHeader(token) } }
  );
}
