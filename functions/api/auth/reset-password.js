import { getDb } from "../../_lib/db.js";
import { hashPassword, sha256Hex } from "../../_lib/password.js";
import { json, jsonError, readJson } from "../../_lib/http.js";
import { findUserByResetTokenHash } from "../../_lib/users.js";

export async function onRequestPost({ request, env }) {
  const { resetToken, newPassword } = await readJson(request);
  if (typeof resetToken !== "string" || !resetToken) {
    return jsonError("Invalid or expired reset link", 400);
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return jsonError("Password must be at least 8 characters", 400);
  }

  const tokenHash = await sha256Hex(resetToken);
  const user = await findUserByResetTokenHash(env, tokenHash);
  if (!user) return jsonError("Invalid or expired reset link", 400);

  const passwordHash = await hashPassword(newPassword);
  const sql = getDb(env);
  await sql`
    update nexapay_auth_users
    set password_hash = ${passwordHash}, reset_token_hash = null, reset_token_expires_at = null
    where id = ${user.id}
  `;

  return json({ ok: true });
}
