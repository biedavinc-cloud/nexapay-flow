import { getDb } from "../../_lib/db.js";
import { generateToken, sha256Hex } from "../../_lib/password.js";
import { sendEmail, resetPasswordEmailHtml } from "../../_lib/email.js";
import { json, jsonError, readJson, isValidEmail } from "../../_lib/http.js";
import { findUserByEmail } from "../../_lib/users.js";

export async function onRequestPost({ request, env }) {
  const { email } = await readJson(request);
  if (!isValidEmail(email)) return jsonError("A valid email is required", 400);

  const user = await findUserByEmail(env, email);
  // Always return ok -- never reveal whether an account exists.
  if (!user) return json({ ok: true });

  const token = generateToken(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const sql = getDb(env);
  await sql`
    update users set reset_token_hash = ${tokenHash}, reset_token_expires_at = ${expires}
    where id = ${user.id}
  `;

  const appUrl = env.APP_URL || new URL(request.url).origin;
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  await sendEmail(env, {
    to: email,
    subject: "Reset your NexaPay password",
    html: resetPasswordEmailHtml(resetUrl),
  });

  return json({ ok: true });
}
