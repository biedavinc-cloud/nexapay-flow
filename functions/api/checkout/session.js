import { getDb } from "../../_lib/db.js";
import {
  getPublishableKey, createClientSecret, verifyClientSecret, extractBearer,
  resolveApiKey, normCurrency, normText,
} from "../../_lib/checkout.js";
import { getTenant } from "../../_lib/tenants.js";

// Merchant-server API: create a checkout session (amount fixed server-side,
// tamper-proof) and get back the checkout URL to embed. Equivalent of the
// former createCheckoutSession.
//  - Create: POST + Authorization: Bearer <SECRET key> { amount, currency, order_id }
//  - Retrieve (widget): POST { client_secret } -> non-sensitive session details.
function genSessionId() { return `cs_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`; }

export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  try {
    const body = await request.json().catch(() => ({}));
    const bearer = extractBearer(request);
    const auth = bearer ? await resolveApiKey(sql, env, bearer) : null;

    if (body.client_secret && !(auth && auth.type === "secret")) {
      const session = await verifyClientSecret(env, body.client_secret);
      if (!session) return Response.json({ error: "Invalid client_secret." }, { status: 401 });
      return Response.json({ session_id: session.session_id, amount: session.amount, currency: session.currency, order_id: session.order_id });
    }

    if (!auth || auth.type !== "secret") return Response.json({ error: "Unauthorized: missing or invalid secret API key." }, { status: 401 });
    if (auth.record) sql`update nexapay_api_keys set last_used = now() where id = ${auth.record.id}`.catch(() => {});

    const tenant = await getTenant(sql, auth.tenant_id);
    if (auth.tenant_id && (!tenant || tenant.has_paid_access === false)) {
      return Response.json({ error: "Merchant access not active." }, { status: 403 });
    }

    const amount = Number(body.amount);
    const currency = normCurrency(body.currency);
    const order_id = normText(body.order_id);
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "amount must be a positive number." }, { status: 400 });

    const session_id = genSessionId();
    const client_secret = await createClientSecret(env, {
      session_id, amount, currency, order_id, tenant_id: auth.tenant_id || null,
      network: tenant?.blockchain === "TRC20" ? "TRC20" : "POLYGON", created: Date.now(),
    });
    const publishable = auth.record?.publishable_key || getPublishableKey(env);
    const params = new URLSearchParams({ embed: "true", amount: String(amount), currency, order_id, client_secret, publishable_key: publishable });
    const checkout_url = `${new URL(request.url).origin}/payments/new?${params.toString()}`;

    return Response.json({ session_id, client_secret, checkout_url, publishable_key: publishable, amount, currency, order_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
