import { json, withErrors } from "../../_lib/http.js";
import { clearSessionCookieHeader } from "../../_lib/session.js";

export const onRequestPost = withErrors(async () => {
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookieHeader() } });
});
