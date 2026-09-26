import { isUnlimited } from "./tiers.js";

export async function getTenant(sql, tenantId) {
  if (!tenantId) return null;
  const rows = await sql`select * from nexapay_tenants where id = ${tenantId} limit 1`;
  return rows[0] || null;
}

// Returns an error message if the daily limit is exceeded, else null.
export async function checkDailyLimit(sql, tenantId, dailyLimit, amount) {
  if (isUnlimited(dailyLimit)) return null;
  const since = new Date(Date.now() - 86400000).toISOString();
  const rows = await sql`select coalesce(sum(amount_fiat),0) as total from nexapay_transactions where tenant_id = ${tenantId} and created_date >= ${since}`;
  const sum = Number(rows[0]?.total || 0);
  if (sum + amount > dailyLimit) return `Daily limit ${dailyLimit} exceeded.`;
  return null;
}
