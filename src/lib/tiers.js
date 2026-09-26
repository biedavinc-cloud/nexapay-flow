// NexaPay multi-tenant billing tiers — frontend copy (backend uses base44/shared/tiers.ts).
export const TIERS = {
  BASIC: { id: "BASIC", label: "Basic", price: 200, daily_limit: 200, commission: 3.9 },
  ADVANCED: { id: "ADVANCED", label: "Advanced", price: 619, daily_limit: 5000, commission: 2.4 },
  PRO: { id: "PRO", label: "Pro", price: 1099, daily_limit: 9999999, commission: 1.2 },
};

export function tierConfig(tier) {
  return TIERS[tier] || TIERS.BASIC;
}