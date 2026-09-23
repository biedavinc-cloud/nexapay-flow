// Public, read-only pre-payment quote: returns the live USDT estimate + commission for an
// order, so the white-label checkout can display "You will receive ~X USDT" before the
// client pays. No auth required (the payer opening the checkout is not logged in).
import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { computeQuote } from "../../shared/pricing.ts";

async function resolveTenant(base44, tenantId) {
  if (!tenantId) return null;
  try {
    const list = await base44.asServiceRole.entities.Tenant.filter({ id: tenantId });
    return (list && list[0]) || null;
  } catch {
    return null;
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch {}
    const amount = Number(body.amount);
    const currency = body.currency || "EUR";
    const tenantId = (body.tenant_id || "").toString().trim();
    if (!amount || amount <= 0) return Response.json({ error: "Invalid amount." }, { status: 400 });

    const tenant = await resolveTenant(base44, tenantId);
    const quote = await computeQuote({ amount, currency, tenant });
    return Response.json(quote);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}