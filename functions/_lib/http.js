export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function jsonError(message, status = 400) {
  return json({ error: message }, { status });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function withErrors(handler) {
  return async (ctx) => {
    try {
      return await handler(ctx);
    } catch (error) {
      console.error("auth function error:", error);
      return jsonError(error?.message || "Internal error", 500);
    }
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email) && email.length <= 254;
}
