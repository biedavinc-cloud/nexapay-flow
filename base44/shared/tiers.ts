// NexaPay multi-tenant billing tiers.
// One-time access pass unlocks production; commission is deducted at source per transaction.
// PRO daily_limit uses a large sentinel (9999999) instead of Infinity for JSON-safe storage.

export const TIERS = {
  BASIC: { id: "BASIC", label: "Basic", price: 200, daily_limit: 200, commission: 3.9 },
  ADVANCED: { id: "ADVANCED", label: "Advanced", price: 619, daily_limit: 5000, commission: 2.4 },
  PRO: { id: "PRO", label: "Pro", price: 1099, daily_limit: 9999999, commission: 1.2 },
} as const;

export type TierId = keyof typeof TIERS;

export function tierConfig(tier: string) {
  return TIERS[tier] || TIERS.BASIC;
}

export const UNLIMITED_SENTINEL = 9999999;

export function isUnlimited(dailyLimit: number) {
  return !dailyLimit || dailyLimit >= UNLIMITED_SENTINEL;
}

// Commission in USDT, deducted at source from the gross USDT amount.
export function computeCommissionUsdt(usdtGross: number, commissionRatePct: number) {
  return Math.round(usdtGross * (commissionRatePct || 0)) / 100;
}

export function computeNetUsdt(usdtGross: number, commissionRatePct: number) {
  const c = computeCommissionUsdt(usdtGross, commissionRatePct);
  return Math.round((usdtGross - c) * 1e6) / 1e6;
}