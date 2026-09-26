// NexaPay checkout shared helpers — Stripe-style key model (secret / publishable / webhook),
// signed client_secret, signed webhook, LIVE fiat->USDT rate (CoinGecko).
// The crypto execution engine lives in crypto.ts (single source of truth).
import { secrets } from "base44:runtime";

// --- Keys (private PSP, single marketplace) ---
// SECURITY: these MUST come from Base44 project secrets (`base44 secrets set
// NEXAPAY_SECRET_KEY=... NEXAPAY_PUBLISHABLE_KEY=... NEXAPAY_WEBHOOK_SECRET=...`),
// never hardcoded in source. A key that has ever been committed to git must
// be treated as compromised -- rotating it here (setting a new secret value)
// is what actually invalidates the old, leaked one.
function requireSecret(name) {
  let v;
  try { v = secrets.get(name); } catch { v = undefined; }
  if (!v) {
    throw new Error(`Missing required secret: ${name}. Run: base44 secrets set ${name}=<value>`);
  }
  return v;
}

function getSecretKey() { return requireSecret("NEXAPAY_SECRET_KEY"); }
function getPublishableKey() { return requireSecret("NEXAPAY_PUBLISHABLE_KEY"); }
function getWebhookSecret() { return requireSecret("NEXAPAY_WEBHOOK_SECRET"); }
export { getPublishableKey };

const enc = new TextEncoder();

function b64url(input) {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input) {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function hmacB64(key, msg) {
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return b64url(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacHex(key, msg) {
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- client_secret (signed session token, bound to the order) ---
export async function createClientSecret(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = await hmacB64(getSecretKey(), body);
  return `${body}.${sig}`;
}

export async function verifyClientSecret(secret) {
  if (!secret) return null;
  const [body, sig] = secret.split(".");
  if (!body || !sig) return null;
  const expected = await hmacB64(getSecretKey(), body);
  if (expected !== sig) return null;
  try {
    return JSON.parse(b64urlDecode(body));
  } catch {
    return null;
  }
}

// --- Webhook signing (Stripe-Signature style: t=<ts>,v1=<hex-hmac>) ---
export async function signWebhook(payload, secret) {
  const raw = JSON.stringify(payload);
  const t = Math.floor(Date.now() / 1000);
  const v1 = await hmacHex(secret || getWebhookSecret(), `${t}.${raw}`);
  return { raw, header: `t=${t},v1=${v1}` };
}

export async function verifyWebhook(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(String(signatureHeader).split(",").map((kv) => kv.split("=")));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const expected = await hmacHex(secret || getWebhookSecret(), `${t}.${rawBody}`);
  return expected === v1;
}

// --- DB-backed API key resolution (real keys created in the dashboard) ---
// Returns { type: "secret"|"publishable", record, legacy } or null.
// The platform-level NEXAPAY_SECRET_KEY / NEXAPAY_PUBLISHABLE_KEY secrets are
// still accepted (for NexaPay's own onboarding flow, which has no tenant
// yet), but they now come from Base44 secrets, not from a literal anyone
// reading this file could copy.
export async function resolveApiKey(base44, bearer) {
  if (!bearer) return null;
  if (bearer === getPublishableKey()) return { type: "publishable", record: null, legacy: true };
  if (bearer === getSecretKey()) return { type: "secret", record: null, legacy: true };
  try {
    const keys = await base44.asServiceRole.entities.ApiKey.list("-created_date", 100);
    const rec = keys.find((k) => k.active && (k.secret_key === bearer || k.publishable_key === bearer));
    if (!rec) return null;
    return { type: rec.secret_key === bearer ? "secret" : "publishable", record: rec, legacy: false };
  } catch {
    return null;
  }
}

// Resolves the signing secret for a webhook target URL from the WebhookEndpoint config.
// Falls back to the global platform webhook secret when no matching endpoint is registered.
export async function resolveWebhookSecret(base44, url) {
  if (!url) return getWebhookSecret();
  try {
    const endpoints = await base44.asServiceRole.entities.WebhookEndpoint.list("-created_date", 100);
    const ep = endpoints.find((e) => e.active && e.url === url);
    return (ep && ep.signing_secret) || getWebhookSecret();
  } catch {
    return getWebhookSecret();
  }
}

// --- IDs ---
export function genSessionId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `cs_${stamp}${rand}`;
}

export function genTransactionId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NX-2026-${rand}`;
}

export function genReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NXP-${stamp}-${rand}`;
}

// --- LIVE USDT rate (CoinGecko public API, no key required) ---
// Returns USDT per 1 unit of `currency` (i.e. multiply fiat amount by this to get USDT).
export async function fetchLiveUsdtRate(currency) {
  const cur = (currency || "USD").toLowerCase();
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=${cur}`);
    if (!r.ok) throw new Error("rate api");
    const d = await r.json();
    const price = d?.tether?.[cur]; // price of 1 USDT in the fiat currency
    if (!price || price <= 0) return null;
    return 1 / price;
  } catch {
    return null;
  }
}

// Offline fallback quote (used if the live API is unreachable).
export function quoteRate(currency) {
  const base = currency === "EUR" ? 1.0825 : currency === "USD" ? 1.0 : 1.0825;
  const variance = 1 + (Math.random() * 0.004 - 0.002);
  return Math.round(base * variance * 10000) / 10000;
}

// Resolve the best rate: live first, fallback to quote.
export async function resolveRate(currency) {
  const live = await fetchLiveUsdtRate(currency);
  if (live && Number.isFinite(live) && live > 0) {
    return { rate: Math.round(live * 1e6) / 1e6, live: true };
  }
  return { rate: quoteRate(currency), live: false };
}

export function encodePayload(obj) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  } catch {
    return "";
  }
}

export function extractBearer(req) {
  const h = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export function normCurrency(value) {
  return (value || "EUR").toString().toUpperCase();
}

export function normText(value) {
  return (value || "").toString();
}

// --- formatting ---
export const ZERO_DECIMAL_CURRENCIES = ["XAF", "XOF", "JPY", "KRW", "CLP", "VUV", "XPF"];

export function formatTotal(amount, currency) {
  const code = (currency || "EUR").toUpperCase();
  const zero = ZERO_DECIMAL_CURRENCIES.includes(code);
  const value = zero ? Math.round(amount) : amount;
  const num = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: zero ? 0 : 2,
    maximumFractionDigits: zero ? 0 : 2,
  }).format(value);
  const symbols = { EUR: "€", USD: "$" };
  return `${num} ${symbols[code] || code}`;
}