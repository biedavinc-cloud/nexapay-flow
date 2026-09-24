import { verifyPassword } from "../../_lib/password.js";
import { json, jsonError, readJson, isValidEmail } from "../../_lib/http.js";
import { findUserByEmail, publicUser } from "../../_lib/users.js";
import { createSessionToken, setSessionCookieHeader } from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  const { email, password } = await readJson(request);
  if (!isValidEmail(email) || typeof password !== "string") {
    return jsonError("Invalid email or password", 401);
  }

  const user = await findUserByEmail(env, email);
  // Same error for "no such user" and "wrong password" -- don't leak which.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return jsonError("Invalid email or password", 401);
  }
  if (!user.email_verified) {
    return jsonError("Please verify your email before logging in", 403);
  }

  const token = await createSessionToken(env, user.id);
  return json(
    { ok: true, user: publicUser(user) },
    { headers: { "Set-Cookie": setSessionCookieHeader(token) } }
  );
}
