import { generateToken } from "../../../_lib/password.js";

// Signed, short-lived state cookie protects against CSRF on the callback and
// carries the post-login returnTo path through the redirect round-trip.
export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID) {
    return new Response("Google login is not configured", { status: 501 });
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/dashboard";
  const state = generateToken(24);
  const appUrl = env.APP_URL || url.origin;

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${appUrl}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  const stateCookie = `google_oauth_state=${encodeURIComponent(
    JSON.stringify({ state, returnTo })
  )}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      "Set-Cookie": stateCookie,
    },
  });
}
