// Cloudflare-native port of base44/shared/checkout.ts: signed client_secret,
// signed webhooks, API key resolution against Neon (nexapay_api_keys /
// nexapay_tenants) instead of Base44 entities.
const enc = new TextEncoder();

function requireSecret(env, name) {
  const v = env[name];
  if (!v) throw new Error(`Missing required secret: ${name}. Set it as a Cloudflare Pages environment variable.`);
  return v;
}
export function getSecretKey(env) { return requireSecret(env, "NEXAPAY_SECRET_KEY"); }
export function getPublishableKey(env) { return requireSecret(env, "NEXAPAY_PUBLISHABLE_KEY"); }
export function getWebhookSecret(env) { return requireSecret(env, "NEXAPAY_WEBHOOK_SECRET"); }

function b64url(s) { return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64urlDecode(s) { let t = s.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; return atob(t); }
async function hmacB64(key, msg) {
  const ck = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(msg));
  return b64url(String.fromCharCode(...new Uint8Array(sig)));
}
async function hmacHex(key, msg) {
  const ck = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createClientSecret(env, payload) {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${await hmacB64(getSecretKey(env), body)}`;
}
export async function verifyClientSecret(env, secret) {
  if (!secret) return null;
  const [body, sig] = secret.split(".");
  if (!body || !sig) return null;
  if ((await hmacB64(getSecretKey(env), body)) !== sig) return null;
  try { return JSON.parse(b64urlDecode(body)); } catch { return null; }
}

export async function signWebhook(env, payload, secret) {
  const raw = JSON.stringify(payload);
  const t = Math.floor(Date.now() / 1000);
  const v1 = await hmacHex(secret || getWebhookSecret(env), `${t}.${raw}`);
  return { raw, header: `t=${t},v1=${v1}` };
}
export async function verifyWebhookSignature(env, rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(String(signatureHeader).split(",").map((kv) => kv.split("=")));
  if (!parts.t || !parts.v1) return false;
  const expected = await hmacHex(secret || getWebhookSecret(env), `${parts.t}.${rawBody}`);
  return expected === parts.v1;
}

export function extractBearer(request) {
  const h = request.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : "";
}

// Returns { type: "secret"|"publishable", record, tenant_id } or null.
export async function resolveApiKey(sql, env, bearer) {
  if (!bearer) return null;
  if (bearer === getPublishableKey(env)) return { type: "publishable", record: null, tenant_id: null };
  if (bearer === getSecretKey(env)) return { type: "secret", record: null, tenant_id: null };
  const rows = await sql`select * from nexapay_api_keys where active = true and (secret_key = ${bearer} or publishable_key = ${bearer}) limit 1`;
  const rec = rows[0];
  if (!rec) return null;
  return { type: rec.secret_key === bearer ? "secret" : "publishable", record: rec, tenant_id: rec.tenant_id || null };
}

export async function resolveWebhookSecret(sql, env, url) {
  if (!url) return getWebhookSecret(env);
  const rows = await sql`select signing_secret from nexapay_webhook_endpoints where active = true and url = ${url} limit 1`;
  return rows[0]?.signing_secret || getWebhookSecret(env);
}

export function normText(v) { return (v == null ? "" : String(v)).trim(); }
export function normCurrency(v) { return normText(v).toUpperCase() || "EUR"; }
export function getAppUrlFallback(env) { return env.APP_URL || ""; }
export function genReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.getRandomValues(new Uint8Array(6));
  const randStr = Array.from(rand).map((b) => b.toString(36)).join("").toUpperCase().slice(0, 8);
  return `NXP-${stamp}-${randStr}`;
}
export function encodePayload(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
export function decodePayload(b64) {
  try { return JSON.parse(decodeURIComponent(escape(atob(b64 || "")))); } catch { return {}; }
}
