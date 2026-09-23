// Dynamic PSP credential vault: AES-256-GCM encrypted storage for PSP API keys held in the
// PspConfig entity, plus resolution of the active credentials at request time (DB-first,
// env-secrets fallback) so Back-Office key rotation takes effect immediately — no restart.
import { secrets } from "base44:runtime";

const enc = new TextEncoder();
const dec = new TextDecoder();

function masterKey() {
  try { return secrets.get("PSP_MASTER_KEY"); } catch { return undefined; }
}

// Derive a 32-byte AES key (SHA-256 of the master secret) so any master-key length works.
async function deriveKey(mk, usage) {
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(mk));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM", length: 256 }, false, usage);
}

const toHex = (b) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h) => new Uint8Array((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)));

// Encrypt a credential object → "iv:ciphertext:authTag" (hex).
export async function encryptConfig(plain) {
  const mk = masterKey();
  if (!mk) throw new Error("PSP_MASTER_KEY not configured. Set it in App Secrets.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(mk, ["encrypt"]);
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, enc.encode(JSON.stringify(plain)));
  const out = new Uint8Array(buf);
  const ctLen = out.length - 16;
  return `${toHex(iv)}:${toHex(out.slice(0, ctLen))}:${toHex(out.slice(ctLen))}`;
}

export async function decryptConfig(cipher) {
  try {
    const mk = masterKey();
    if (!mk || !cipher) return null;
    const parts = cipher.split(":");
    if (parts.length !== 3) return null;
    const iv = fromHex(parts[0]);
    const ct = fromHex(parts[1]);
    const tag = fromHex(parts[2]);
    const key = await deriveKey(mk, ["decrypt"]);
    const combined = new Uint8Array(ct.length + tag.length);
    combined.set(ct, 0);
    combined.set(tag, ct.length);
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, combined);
    return JSON.parse(dec.decode(buf));
  } catch {
    return null;
  }
}

// Resolve the active credentials for a PSP from the DB (current environment). Returns null
// when no active DB config exists → callers fall back to Base44 Secrets (env).
export async function resolvePspCredentials(base44, provider) {
  try {
    const list = await base44.asServiceRole.entities.PspConfig.filter({ provider, active: true }, "-updated_date", 5);
    const cfg = list && list[0];
    if (!cfg || !cfg.config_encrypted) return null;
    const all = await decryptConfig(cfg.config_encrypted);
    if (!all) return null;
    const env = cfg.environment || "sandbox";
    let keys = all[env] || all.sandbox || all.live || all;
    if (!keys || Array.isArray(keys)) keys = {};
    if (provider === "PAYUNIT" && keys && !keys.mode) keys.mode = env === "live" ? "live" : "test";
    return { environment: env, keys };
  } catch {
    return null;
  }
}

export function maskValue(v) {
  if (!v || typeof v !== "string") return "";
  if (v.length <= 8) return "•".repeat(v.length);
  return v.slice(0, 4) + "•".repeat(Math.min(8, v.length - 8)) + v.slice(-4);
}

export function maskKeys(keys) {
  if (!keys) return {};
  const out = {};
  for (const [k, v] of Object.entries(keys)) out[k] = maskValue(v);
  return out;
}