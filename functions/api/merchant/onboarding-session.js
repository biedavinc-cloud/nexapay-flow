import { getDb } from "../../_lib/db.js";
import { requireUser } from "../../_lib/merchantAuth.js";
import { createClientSecret } from "../../_lib/checkout.js";
import { TIERS } from "../../_lib/tiers.js";

// Server-side pricing for the one-time onboarding fee. The client only says
// WHICH tier; the amount, currency, purpose and payer identity are decided
// and signed here, so the fee cannot be lowered or attributed to someone else.
export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  try {
    const user = await requireUser(sql, env, request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.tenantId) return Response.json({ error: "Onboarding already completed." }, { status: 409 });

    const { tier } = await request.json().catch(() => ({}));
    const t = TIERS[tier];
    if (!t) return Response.json({ error: "Unknown tier." }, { status: 400 });

    const client_secret = await createClientSecret(env, {
      session_id: `cs_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
      amount: t.price, currency: "USD", network: "TRC20",
      order_id: `ACCESS-${t.id}-${Date.now()}`,
      tenant_id: null, purpose: "onboarding", user_id: user.userId, tier: t.id, created: Date.now(),
    });
    return Response.json({ client_secret, amount: t.price, currency: "USD", tier: t.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
