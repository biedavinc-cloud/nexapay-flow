// NexaPay direct crypto execution engine — real signed REST connectors (KuCoin, Binance,
// BingX, Coinbase) with automatic fallback, and a dev/mock mode when no exchange keys are configured.
// Server-only: imported by backend functions, never from the client bundle.

import { secrets } from "base44:runtime";

const enc = new TextEncoder();

function safeSecret(name) {
  try {
    return secrets.get(name);
  } catch {
    return undefined;
  }
}

function b64std(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

async function hmacSha256Hex(key, msg) {
  const ck = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256B64(key, msg) {
  const ck = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(msg));
  return b64std(new Uint8Array(sig));
}

function genMockHash() {
  const hex = () => Array.from({ length: 16 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  return `${hex()}${hex()}${hex()}${hex()}`;
}

// --- KuCoin ---
async function kucoinRequest(creds, method, path, body) {
  const ts = Date.now().toString();
  // KuCoin API key version 2 requires the passphrase HMAC-encrypted with the secret (base64).
  const encPass = await hmacSha256B64(creds.secret, creds.passphrase);
  const sign = await hmacSha256B64(creds.secret, `${ts}${method.toUpperCase()}${path}${body || ""}`);
  const r = await fetch("https://api.kucoin.com" + path, {
    method,
    headers: {
      "KC-API-KEY": creds.key,
      "KC-API-SIGN": sign,
      "KC-API-TIMESTAMP": ts,
      "KC-API-PASSPHRASE": encPass,
      "KC-API-KEY-VERSION": "2",
      "Content-Type": "application/json",
    },
    body: body || undefined,
  });
  const d = await r.json();
  if (d?.code !== "200000") throw new Error(d?.msg || "KuCoin API error");
  return d;
}

async function kucoinBuyAndWithdraw({ amount, asset, network, wallet, creds }) {
  // Real on-chain USDT withdrawal to the receiving wallet — no third-party PSP. NexaPay funds the
  // USDT balance on its own exchange account; the client's payment is the trigger.
  const d = await kucoinRequest(creds, "POST", "/api/v1/withdrawals", JSON.stringify({
    currency: asset,
    amount: String(amount),
    address: wallet,
    chain: network,
  }));
  return { tx_hash: d?.data?.withdrawalId || d?.data?.id || `kucoin-${Date.now()}` };
}

// --- Binance ---
async function binanceRequest(creds, method, path, query) {
  const ts = Date.now();
  const qs = `${query}${query ? "&" : ""}timestamp=${ts}`;
  const sig = await hmacSha256Hex(creds.secret, qs);
  const r = await fetch(`https://api.binance.com${path}?${qs}&signature=${sig}`, {
    method,
    headers: { "X-MBX-APIKEY": creds.key, "Content-Type": "application/json" },
  });
  const d = await r.json();
  if (d?.code && d.code !== 200) throw new Error(d?.msg || "Binance API error");
  return d;
}

async function binanceBuyAndWithdraw({ amount, asset, network, wallet, creds }) {
  const netMap = { TRC20: "TRX", ERC20: "ETH", POLYGON: "MATIC" };
  // Real on-chain USDT withdrawal to the receiving wallet — no third-party PSP. NexaPay funds the
  // USDT balance on its own exchange account; the client's payment is the trigger.
  const d = await binanceRequest(creds, "POST", "/sapi/v1/capital/withdraw/apply", `coin=${asset}&network=${netMap[network] || network}&address=${wallet}&amount=${amount}`);
  return { tx_hash: d?.id || `binance-${Date.now()}` };
}

// --- BingX (signed, best-effort) ---
async function bingxRequest(creds, path, query) {
  const ts = Date.now().toString();
  const sign = await hmacSha256Hex(creds.secret, `${ts}\n${path}\n${query || ""}\n`);
  const url = `https://open-api.bingx.com${path}${query ? "?" + query : ""}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "BINGX-API-KEY": creds.key, "BINGX-SIGN": sign, "BINGX-TIMESTAMP": ts, "Content-Type": "application/json" },
  });
  const d = await r.json();
  if (d?.code !== 0) throw new Error(d?.msg || "BingX API error");
  return d;
}

async function bingxBuyAndWithdraw({ amount, asset, network, wallet, creds }) {
  const d = await bingxRequest(creds, "/openApi/spot/v1/withdraw", `coin=${asset}&network=${network}&address=${wallet}&amount=${amount}`);
  return { tx_hash: d?.data?.id || `bingx-${Date.now()}` };
}

// --- Coinbase (signed, best-effort) ---
async function coinbaseRequest(creds, method, path, body) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sign = await hmacSha256B64(creds.secret, `${ts}${method.toUpperCase()}${path}${body || ""}`);
  const r = await fetch("https://api.exchange.coinbase.com" + path, {
    method,
    headers: { "CB-ACCESS-KEY": creds.key, "CB-ACCESS-SIGN": sign, "CB-ACCESS-TIMESTAMP": ts, "Content-Type": "application/json" },
    body: body || undefined,
  });
  const d = await r.json();
  if (d?.message && d.message !== "success") throw new Error(d?.message || "Coinbase API error");
  return d;
}

async function coinbaseBuyAndWithdraw({ amount, asset, network, wallet, creds }) {
  const d = await coinbaseRequest(creds, "POST", "/api/v3/brokerage/withdrawals/crypto", JSON.stringify({
    amount: String(amount),
    currency: asset,
    crypto_address: wallet,
    network: network,
  }));
  return { tx_hash: d?.id || `coinbase-${Date.now()}` };
}

// --- Engine: tries each configured exchange, falls back to dev/mock when none are ready ---
export async function executeCryptoOrder({ amount, asset, network, wallet, fiatAmount, fiatCurrency }) {
  const candidates = [
    { name: "KUCOIN", run: kucoinBuyAndWithdraw, creds: { key: safeSecret("KUCOIN_API_KEY"), secret: safeSecret("KUCOIN_API_SECRET"), passphrase: safeSecret("KUCOIN_PASSPHRASE") } },
    { name: "BINANCE", run: binanceBuyAndWithdraw, creds: { key: safeSecret("BINANCE_API_KEY"), secret: safeSecret("BINANCE_API_SECRET") } },
    { name: "BINGX", run: bingxBuyAndWithdraw, creds: { key: safeSecret("BINGX_API_KEY"), secret: safeSecret("BINGX_API_SECRET") } },
    { name: "COINBASE", run: coinbaseBuyAndWithdraw, creds: { key: safeSecret("COINBASE_API_KEY"), secret: safeSecret("COINBASE_API_SECRET") } },
  ];

  let ready = 0;
  let lastError = null;
  let lastProvider = null;
  for (const c of candidates) {
    const isReady = c.creds.key && c.creds.secret && wallet && (c.name !== "KUCOIN" || c.creds.passphrase);
    if (!isReady) continue;
    ready++;
    lastProvider = c.name;
    try {
      const res = await c.run({ amount, asset, network, wallet, creds: c.creds, fiatAmount, fiatCurrency });
      return { provider: c.name, tx_hash: res.tx_hash, live: true };
    } catch (e) {
      lastError = e.message;
    }
  }

  // Dev/mock mode: no exchange keys configured at all → complete in simulation so the flow works
  // end-to-end without credentials. When keys ARE configured but a real withdrawal fails, surface
  // the error (FAILED) so the merchant can retry — silently simulating a real payment would mask a
  // genuine problem (invalid/non-whitelisted address, insufficient USDT balance, wrong chain...).
  if (ready === 0) {
    return { provider: "KUCOIN", tx_hash: genMockHash(), live: false, note: "dev mock (no exchange keys configured)" };
  }
  return { error: `Live withdrawal failed on all configured exchanges. Last: ${lastError}.` };
}

export const SUPPORTED_EXCHANGES = ["KUCOIN", "BINANCE", "BINGX", "COINBASE"];