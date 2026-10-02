import { getDb } from "../../_lib/db.js";
import { hashPassword, generateToken, sha256Hex } from "../../_lib/password.js";
import { sendEmail, magicLinkEmailHtml } from "../../_lib/email.js";
import { json, jsonError, readJson, isValidEmail, withErrors } from "../../_lib/http.js";
import { findUserByEmail } from "../../_lib/users.js";

// Passwordless email verification via a one-click magic link (replaces the
// OTP code flow). The token is stored hashed (otp_code_hash/otp_expires_at
// columns, reused -- same purpose: a single-use, time-limited credential).
export const onRequestPost = withErrors(async ({ request, env }) => {
  const { email, password, country, city, phone } = await readJson(request);

  if (!isValidEmail(email)) return jsonError("A valid email is required", 400);
  if (typeof password !== "string" || password.length < 8) {
    return jsonError("Password must be at least 8 characters", 400);
  }

  const existing = await findUserByEmail(env, email);
  if (existing?.email_verified) {
    return jsonError("An account with this email already exists", 409);
  }

  const passwordHash = await hashPassword(password);
  const token = generateToken(32);
  const tokenHash = await sha256Hex(token);
  const tokenExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const sql = getDb(env);
  if (existing) {
    await sql`
      update nexapay_auth_users
      set password_hash = ${passwordHash}, otp_code_hash = ${tokenHash}, otp_expires_at = ${tokenExpires}, otp_attempts = 0,
          country = coalesce(${country || null}, country), city = coalesce(${city || null}, city), phone = coalesce(${phone || null}, phone)
      where id = ${existing.id}
    `;
  } else {
    await sql`
      insert into nexapay_auth_users (email, password_hash, otp_code_hash, otp_expires_at, otp_attempts, country, city, phone)
      values (${email.toLowerCase()}, ${passwordHash}, ${tokenHash}, ${tokenExpires}, 0, ${country || null}, ${city || null}, ${phone || null})
    `;
  }

  const host = request.headers.get("host") || "";
  const appUrl = host ? `https://${host}` : (env.APP_URL || "");
  if (!appUrl) return jsonError("Server misconfigured: no APP_URL available to build the verification link.", 500);
  const verifyUrl = `${appUrl}/api/auth/verify-magic-link?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email.toLowerCase())}`;
  const result = await sendEmail(env, { to: email, subject: "Verify your NexaPay email", html: magicLinkEmailHtml(verifyUrl) });
  if (!result.sent) {
    return json({ ok: true, email_sent: false });
  }
  return json({ ok: true, email_sent: true });
});
