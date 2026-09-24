import { getDb } from "../../_lib/db.js";
import { hashPassword, generateOtp, sha256Hex } from "../../_lib/password.js";
import { sendEmail, otpEmailHtml } from "../../_lib/email.js";
import { json, jsonError, readJson, isValidEmail } from "../../_lib/http.js";
import { findUserByEmail } from "../../_lib/users.js";

export async function onRequestPost({ request, env }) {
  const { email, password } = await readJson(request);

  if (!isValidEmail(email)) return jsonError("A valid email is required", 400);
  if (typeof password !== "string" || password.length < 8) {
    return jsonError("Password must be at least 8 characters", 400);
  }

  const existing = await findUserByEmail(env, email);
  if (existing?.email_verified) {
    // Don't reveal account existence precisely, but a verified account
    // genuinely can't re-register -- direct them to log in instead.
    return jsonError("An account with this email already exists", 409);
  }

  const passwordHash = await hashPassword(password);
  const otp = generateOtp();
  const otpHash = await sha256Hex(otp);
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const sql = getDb(env);
  if (existing) {
    // Re-registering before verifying: refresh password + OTP.
    await sql`
      update users
      set password_hash = ${passwordHash},
          otp_code_hash = ${otpHash},
          otp_expires_at = ${otpExpires},
          otp_attempts = 0
      where id = ${existing.id}
    `;
  } else {
    await sql`
      insert into users (email, password_hash, otp_code_hash, otp_expires_at, otp_attempts)
      values (${email.toLowerCase()}, ${passwordHash}, ${otpHash}, ${otpExpires}, 0)
    `;
  }

  const result = await sendEmail(env, {
    to: email,
    subject: "Your NexaPay verification code",
    html: otpEmailHtml(otp),
  });
  if (!result.sent) {
    // Registration still succeeds (user can hit "resend"), but tell the
    // client so it can show a warning instead of a false "check your email".
    return json({ ok: true, email_sent: false });
  }

  return json({ ok: true, email_sent: true });
}
