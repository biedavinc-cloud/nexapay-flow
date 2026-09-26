// AES-256-GCM encryption for PSP secret keys stored in Neon (nexapay_psp_configs.encrypted_keys).
// Requires env.PSP_ENCRYPTION_KEY (32 random bytes, base64) -- set once via
// `openssl rand -base64 32` and stored as a Cloudflare Pages secret, never in code.
async function importKey(env) {
  if (!env.PSP_ENCRYPTION_KEY) throw new Error("PSP_ENCRYPTION_KEY not configured");
  const raw = Uint8Array.from(atob(env.PSP_ENCRYPTION_KEY), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptKeys(env, obj) {
  const key = await importKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const payload = new Uint8Array(iv.length + cipher.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...payload));
}

export async function decryptKeys(env, encoded) {
  if (!encoded) return null;
  const key = await importKey(env);
  const raw = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const cipher = raw.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}

// Reads + decrypts a provider's keys from Neon. Returns null if not configured/active.
export async function resolvePspCredentials(sql, env, provider) {
  const rows = await sql`select * from nexapay_psp_configs where provider = ${provider} and active = true limit 1`;
  const row = rows[0];
  if (!row || !row.encrypted_keys) return null;
  try {
    return { keys: await decryptKeys(env, row.encrypted_keys), config: row };
  } catch {
    return null;
  }
}
