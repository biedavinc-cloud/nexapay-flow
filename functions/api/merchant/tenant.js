import { getDb } from "../../_lib/db.js";
import { requireMerchant } from "../../_lib/merchantAuth.js";
import { validateWallet } from "../../_lib/wallet.js";

// Self-service fields only. Anything with billing/compliance impact
// (commission_rate, tier, has_paid_access, kyc_status, account_status) is
// deliberately excluded -- those change only through the superadmin path.
const ALLOWED = ["company_name", "checkout_primary_color", "logo_url", "receiving_wallet", "blockchain", "statement_descriptor"];

export async function onRequestGet({ request, env }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth || !auth.tenantId) return Response.json({ error: "No merchant account linked to this session." }, { status: 404 });

  const rows = await sql`select * from nexapay_tenants where id = ${auth.tenantId} limit 1`;
  if (!rows[0]) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ tenant: rows[0] });
}

export async function onRequestPatch({ request, env }) {
  const sql = getDb(env);
  const auth = await requireMerchant(sql, env, request);
  if (!auth || !auth.tenantId) return Response.json({ error: "No merchant account linked to this session." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const updates = {};
  for (const key of ALLOWED) if (key in body) updates[key] = body[key];
  if (Object.keys(updates).length === 0) return Response.json({ error: "No valid fields to update" }, { status: 400 });

  // A wrong payout address is an irreversible loss of the merchant's funds.
  if ("receiving_wallet" in updates || "blockchain" in updates) {
    const cur = (await sql`select receiving_wallet, blockchain from nexapay_tenants where id = ${auth.tenantId}`)[0] || {};
    const chain = updates.blockchain || cur.blockchain || "POLYGON";
    const addr = "receiving_wallet" in updates ? updates.receiving_wallet : cur.receiving_wallet;
    const err = validateWallet(chain, addr);
    if (err) return Response.json({ error: err }, { status: 400 });
  }
  if ("statement_descriptor" in updates) updates.statement_descriptor = String(updates.statement_descriptor || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

  const [row] = await sql`
    update nexapay_tenants set
      company_name = coalesce(${updates.company_name ?? null}, company_name),
      checkout_primary_color = coalesce(${updates.checkout_primary_color ?? null}, checkout_primary_color),
      logo_url = coalesce(${updates.logo_url ?? null}, logo_url),
      receiving_wallet = coalesce(${updates.receiving_wallet ?? null}, receiving_wallet),
      blockchain = coalesce(${updates.blockchain ?? null}, blockchain),
      statement_descriptor = coalesce(${updates.statement_descriptor ?? null}, statement_descriptor)
    where id = ${auth.tenantId}
    returning *
  `;
  return Response.json({ tenant: row });
}
