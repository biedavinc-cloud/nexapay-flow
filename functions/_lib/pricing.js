// Mirrors base44/shared/pricing.ts -- live fiat->USDT rate (CoinGecko) + commission calc.
const CG_IDS = { EUR: "eur", USD: "usd", XAF: "xaf", XOF: "xof", GHS: "ghs", NGN: "ngn", ZAR: "zar", KES: "kes" };
const FALLBACK_RATE = { EUR: 1.08, USD: 1.0, XAF: 0.00165, XOF: 0.00165, GHS: 0.065, NGN: 0.00062, ZAR: 0.055, KES: 0.0077 };

export async function resolveRate(currency) {
  const cur = (currency || "EUR").toUpperCase();
  const vs = CG_IDS[cur] || "usd";
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=${vs}`);
    const d = await r.json();
    const price = d?.tether?.[vs];
    if (price > 0) return { rate: 1 / price, live: true };
  } catch {}
  return { rate: FALLBACK_RATE[cur] || 1, live: false };
}

export function defaultCommissionPercent(env) {
  const v = parseFloat(env.NEXAPAY_DEFAULT_COMMISSION_PERCENT);
  return Number.isFinite(v) && v >= 0 ? v : 3.9;
}

export async function computeQuote(env, { amount, currency, tenant }) {
  const amt = Number(amount) || 0;
  const cur = (currency || "EUR").toUpperCase();
  const pct = tenant?.commission_rate && tenant.commission_rate > 0 ? tenant.commission_rate : defaultCommissionPercent(env);
  const feeFiat = Math.round((amt * pct) / 100 * 100) / 100;
  const netFiat = Math.round((amt - feeFiat) * 100) / 100;
  const { rate, live } = await resolveRate(cur);
  const usdtEstimated = Math.round(netFiat * rate * 1e6) / 1e6;
  const usdtGross = Math.round(amt * rate * 1e6) / 1e6;
  const commissionUsdt = Math.round((usdtGross - usdtEstimated) * 1e6) / 1e6;
  return { pct, feeFiat, netFiat, rate, live, usdtEstimated, usdtGross, commissionUsdt };
}
