import { getDb } from "../../_lib/db.js";
import { generateOtp, sha256Hex } from "../../_lib/password.js";
import { sendEmail, otpEmailHtml } from "../../_lib/email.js";
import { json, jsonError, readJson, isValidEmail } from "../../_lib/http.js";
import { findUserByEmail } from "../../_lib/users.js";

export async function onRequestPost({ request, env }) {
  const { email } = await readJson(request);
  if (!isValidEmail(email)) return jsonError("A valid email is required", 400);

  const user = await findUserByEmail(env, email);
  // Always respond ok to avoid leaking whether the email is registered.
  if (!user || user.email_verified) return json({ ok: true });

  const otp = generateOtp();
  const otpHash = await sha256Hex(otp);
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const sql = getDb(env);
  await sql`
    update users
    set otp_code_hash = ${otpHash}, otp_expires_at = ${otpExpires}, otp_attempts = 0
    where id = ${user.id}
  `;

  await sendEmail(env, {
    to: email,
    subject: "Your NexaPay verification code",
    html: otpEmailHtml(otp),
  });

  return json({ ok: true });
}
