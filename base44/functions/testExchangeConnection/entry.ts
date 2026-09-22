import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from "base44:runtime";

const enc = new TextEncoder();

async function hmacB64(key: string, msg: string) {
  const ck = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacHex(key: string, msg: string) {
  const ck = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safe(name: string) {
  try { return secrets.get(name); } catch { return undefined; }
}

// Minimal read-only signed API calls to verify exchange keys are valid.
async function testKuCoin() {
  const key = safe("KUCOIN_API_KEY");
  const secret = safe("KUCOIN_API_SECRET");
  const passphrase = safe("KUCOIN_PASSPHRASE");
  if (!key || !secret || !passphrase) return { ok: false, message: "Clés KuCoin non configurées (KUCOIN_API_KEY / SECRET / PASSPHRASE)." };
  const path = "/api/v1/sub/user";
  const ts = Date.now().toString();
  // KuCoin API key version 2 requires the passphrase HMAC-encrypted with the secret (base64).
  const encPass = await hmacB64(secret, passphrase);
  const sign = await hmacB64(secret, `${ts}GET${path}`);
  const r = await fetch("https://api.kucoin.com" + path, {
    headers: { "KC-API-KEY": key, "KC-API-SIGN": sign, "KC-API-TIMESTAMP": ts, "KC-API-PASSPHRASE": encPass, "KC-API-KEY-VERSION": "2" },
  });
  const d = await r.json();
  if (d?.code !== "200000") throw new Error(d?.msg || `HTTP ${r.status}`);
  return { ok: true, message: "Connexion KuCoin validée." };
}

async function testBinance() {
  const key = safe("BINANCE_API_KEY");
  const secret = safe("BINANCE_API_SECRET");
  if (!key || !secret) return { ok: false, message: "Clés Binance non configurées (BINANCE_API_KEY / SECRET)." };
  const ts = Date.now();
  const qs = `timestamp=${ts}`;
  const sig = await hmacHex(secret, qs);
  const r = await fetch(`https://api.binance.com/sapi/v1/account/apiRestrictions?${qs}&signature=${sig}`, {
    headers: { "X-MBX-APIKEY": key },
  });
  const d = await r.json();
  if (d?.code && d.code !== 200) throw new Error(d?.msg || `HTTP ${r.status}`);
  return { ok: true, message: "Connexion Binance validée." };
}

async function testBingX() {
  const key = safe("BINGX_API_KEY");
  const secret = safe("BINGX_API_SECRET");
  if (!key || !secret) return { ok: false, message: "Clés BingX non configurées." };
  const path = "/openApi/spot/v1/account/balance";
  const ts = Date.now().toString();
  const sign = await hmacHex(secret, `${ts}\n${path}\n`);
  const r = await fetch(`https://open-api.bingx.com${path}`, {
    headers: { "BINGX-API-KEY": key, "BINGX-SIGN": sign, "BINGX-TIMESTAMP": ts },
  });
  const d = await r.json();
  if (d?.code !== 0) throw new Error(d?.msg || `HTTP ${r.status}`);
  return { ok: true, message: "Connexion BingX validée." };
}

async function testCoinbase() {
  const key = safe("COINBASE_API_KEY");
  const secret = safe("COINBASE_API_SECRET");
  if (!key || !secret) return { ok: false, message: "Clés Coinbase non configurées." };
  const path = "/users/self/verify";
  const ts = Math.floor(Date.now() / 1000).toString();
  const sign = await hmacB64(secret, `${ts}GET${path}`);
  const r = await fetch("https://api.exchange.coinbase.com" + path, {
    headers: { "CB-ACCESS-KEY": key, "CB-ACCESS-SIGN": sign, "CB-ACCESS-TIMESTAMP": ts },
  });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d?.message || `HTTP ${r.status}`); }
  return { ok: true, message: "Connexion Coinbase validée." };
}

const TESTERS = {
  KUCOIN: testKuCoin,
  BINANCE: testBinance,
  BINGX: testBingX,
  COINBASE: testCoinbase,
};

// Tests connectivity with configured exchange APIs to verify keys are valid.
// Admin-only. Accepts { provider } to test one, or no body to test all enabled providers.
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const providers = body.provider
      ? [String(body.provider).toUpperCase()]
      : ["KUCOIN", "BINANCE", "BINGX", "COINBASE"];

    const results = [];
    for (const name of providers) {
      const tester = TESTERS[name];
      if (!tester) { results.push({ provider: name, ok: false, message: "Fournisseur inconnu." }); continue; }
      try {
        const res = await tester();
        results.push({ provider: name, ...res });
      } catch (e) {
        results.push({ provider: name, ok: false, message: `Échec : ${e.message}` });
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}