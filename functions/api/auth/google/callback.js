import { getDb } from "../../../_lib/db.js";
import { findUserByGoogleId, findUserByEmail } from "../../../_lib/users.js";
import { createSessionToken, setSessionCookieHeader, readCookie } from "../../../_lib/session.js";

function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const rawCookie = readCookie(request, "google_oauth_state");
  let expectedState, returnTo;
  try {
    ({ state: expectedState, returnTo } = JSON.parse(rawCookie || "{}"));
  } catch {
    return redirect("/login?error=oauth_state");
  }

  if (!code || !returnedState || returnedState !== expectedState) {
    return redirect("/login?error=oauth_state");
  }

  const appUrl = env.APP_URL || url.origin;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${appUrl}/api/auth/google/callback`,
    }),
  });
  if (!tokenRes.ok) return redirect("/login?error=oauth_exchange");
  const tokens = await tokenRes.json();

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userInfoRes.ok) return redirect("/login?error=oauth_userinfo");
  const profile = await userInfoRes.json(); // { sub, email, email_verified, name, ... }

  const sql = getDb(env);
  let user = await findUserByGoogleId(env, profile.sub);
  if (!user) {
    // Link to an existing email/password account if one matches, else create.
    const byEmail = await findUserByEmail(env, profile.email);
    if (byEmail) {
      [user] = await sql`
        update users set google_id = ${profile.sub}, email_verified = true
        where id = ${byEmail.id}
        returning *
      `;
    } else {
      [user] = await sql`
        insert into users (email, google_id, email_verified, full_name)
        values (${profile.email.toLowerCase()}, ${profile.sub}, true, ${profile.name || null})
        returning *
      `;
    }
  }

  const token = await createSessionToken(env, user.id);
  return redirect(returnTo || "/dashboard", [
    setSessionCookieHeader(token),
    "google_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
  ]);
}
