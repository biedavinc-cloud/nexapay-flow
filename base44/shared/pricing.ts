// NexaPay pricing — single source of truth for commission + live USDT estimate.
// Shared by korapayCharge (charge) and quoteCheckout (pre-payment estimate).
import { secrets } from "base44:runtime";
import { resolveRate, normCurrency } from "./checkout.ts";

function safeSecret(name) {
  try {
    return secrets.get(name);
  } catch {
    return undefined;
  }
}

export function defaultCommissionPercent() {
  const v = parseFloat(safeSecret("NEXAPAY_DEFAULT_COMMISSION_PERCENT"));
  return Number.isFinite(v) && v >= 0 ? v : 3.5;
}

// Compute the order economics: fiat commission, net fiat, live USDT rate, gross/net USDT,
// and the NexaPay commission expressed in USDT (deducted at source).
// `tenant` is the resolved Tenant record (optional — falls back to the default commission).
export async function computeQuote({ amount, currency, tenant }) {
  const cur = normCurrency(currency || "EUR");
  const amt = Number(amount);
  const pct = tenant?.commission_rate && tenant.commission_rate > 0 ? tenant.commission_rate : defaultCommissionPercent();
  const feeFiat = Math.round((amt * pct) / 100 * 100) / 100;
  const netFiat = Math.round((amt - feeFiat) * 100) / 100;

  const { rate, live } = await resolveRate(cur);
  const usdtEstimated = Math.round(netFiat * rate * 1e6) / 1e6; // net of commission (merchant receives)
  const usdtGross = Math.round(amt * rate * 1e6) / 1e6;
  const commissionUsdt = Math.round((usdtGross - usdtEstimated) * 1e6) / 1e6;

  return {
    currency: cur,
    commission_pct: pct,
    fee_fiat: feeFiat,
    net_fiat: netFiat,
    rate,
    rate_live: live,
    usdt_gross: usdtGross,
    usdt_estimated: usdtEstimated,
    commission_usdt: commissionUsdt,
  };
}