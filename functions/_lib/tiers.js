// Mirrors base44/shared/tiers.ts -- keep both in sync if changed.
export const TIERS = {
  BASIC: { id: "BASIC", label: "Basic", price: 200, daily_limit: 200, commission: 3.9 },
  ADVANCED: { id: "ADVANCED", label: "Advanced", price: 619, daily_limit: 5000, commission: 2.4 },
  PRO: { id: "PRO", label: "Pro", price: 1099, daily_limit: 9999999, commission: 1.2 },
};
export const UNLIMITED_SENTINEL = 9999999;
export function isUnlimited(dailyLimit) { return !dailyLimit || dailyLimit >= UNLIMITED_SENTINEL; }
