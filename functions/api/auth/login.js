import { verifyPassword } from "../../_lib/password.js";
import { json, jsonError, readJson, isValidEmail, withErrors } from "../../_lib/http.js";
import { findUserByEmail, publicUser } from "../../_lib/users.js";
import { createSessionToken, setSessionCookieHeader } from "../../_lib/session.js";
import { getDb } from "../../_lib/db.js";
import { ensureSuperAdmin } from "../../_lib/superadminWhitelist.js";

export const onRequestPost = withErrors(async ({ request, env }) => {
  const { email, password } = await readJson(request);
  if (!isValidEmail(email) || typeof password !== "string") {
    return jsonError("Invalid email or password", 401);
  }

  let user = await findUserByEmail(env, email);
  // Same error for "no such user" and "wrong password" -- don't leak which.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return jsonError("Invalid email or password", 401);
  }
  if (!user.email_verified) {
    return jsonError("Please verify your email before logging in", 403);
  }

  user = await ensureSuperAdmin(getDb(env), user);

  const token = await createSessionToken(env, user.id);
  return json(
    { ok: true, user: publicUser(user) },
    { headers: { "Set-Cookie": setSessionCookieHeader(token) } }
  );
});
