import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  PUBLISHABLE_KEY,
  createClientSecret,
  verifyClientSecret,
  extractBearer,
  genSessionId,
  normCurrency,
  normText,
  resolveApiKey,
} from "../../shared/checkout.ts";

// NexaPay checkout session API.
//  - Create mode (merchant): POST with Authorization: Bearer <API_KEY> and { amount, currency, order_id, webhook_url }
//    -> returns { session_id, client_secret, checkout_url, amount, currency, order_id }
//  - Retrieve mode (iframe): POST { client_secret } (no merchant key) -> returns session details (amount fallback).

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const body = await req.json().catch(() => ({}));
    const bearer = extractBearer(req);

    // Retrieve mode: the embedded iframe fetches the amount when it is not in the URL.
    if (body.client_secret && !(bearer && (await resolveApiKey(base44, bearer))?.type === "secret")) {
      const session = await verifyClientSecret(body.client_secret);
      if (!session) {
        return Response.json({ error: "Invalid client_secret." }, { status: 401 });
      }
      return Response.json({
        session_id: session.session_id,
        amount: session.amount,
        currency: session.currency,
        order_id: session.order_id,
      });
    }

    // Create mode: merchant authenticates with a secret API key (DB-backed or legacy dev key).
    const auth = bearer ? await resolveApiKey(base44, bearer) : null;
    if (!auth || auth.type !== "secret") {
      return Response.json({ error: "Unauthorized: missing or invalid API key." }, { status: 401 });
    }
    const publishable = auth.record?.publishable_key || PUBLISHABLE_KEY;
    if (auth.record) {
      base44.asServiceRole.entities.ApiKey.update(auth.record.id, { last_used: new Date().toISOString() }).catch(() => {});
    }

    const amount = Number(body.amount);
    const currency = normCurrency(body.currency);
    const order_id = normText(body.order_id);
    const webhook_url = normText(body.webhook_url);

    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json({ error: "amount must be a positive number." }, { status: 400 });
    }

    const session_id = genSessionId();
    const client_secret = await createClientSecret({
      session_id,
      amount,
      currency,
      order_id,
      webhook_url,
      created: Date.now(),
    });

    const origin = new URL(req.url).origin;
    const params = new URLSearchParams({
      embed: "true",
      amount: String(amount),
      currency,
      order_id,
      client_secret,
      publishable_key: publishable,
    });
    const checkout_url = `${origin}/payments/new?${params.toString()}`;

    return Response.json({
      session_id,
      client_secret,
      checkout_url,
      publishable_key: publishable,
      amount,
      currency,
      order_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}