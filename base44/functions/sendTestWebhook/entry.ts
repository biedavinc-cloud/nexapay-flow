import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { signWebhook, resolveWebhookSecret, genReference } from "../../shared/checkout.ts";

// Simulate sending a signed webhook event to an external marketplace URL,
// to verify the partner endpoint is reachable and signature verification works.
// Admin-only (the signing secret must never be exposable to regular users).
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const url = (body.url || "").toString().trim();
    const event = (body.event || "payment.succeeded").toString();
    const orderId = (body.order_id || genReference()).toString();
    const amount = Number(body.amount) || 0;
    const currency = (body.currency || "EUR").toString().toUpperCase();
    if (!url) return Response.json({ error: "url required" }, { status: 400 });
    if (!/^https?:\/\//i.test(url)) return Response.json({ error: "url must start with http(s)://" }, { status: 400 });

    const payload = {
      id: `evt_${Date.now().toString(36)}`,
      type: event,
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: orderId,
          amount,
          currency,
          status: event === "payment.failed" ? "failed" : "succeeded",
        },
      },
    };

    const secret = await resolveWebhookSecret(base44, url);
    const { raw, header } = await signWebhook(payload, secret);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "NexaPay-Signature": header },
      body: raw,
    });
    const text = await res.text();
    const snippet = text.slice(0, 500);

    await base44.asServiceRole.entities.WebhookLog.create({
      endpoint_url: url,
      event,
      order_id: orderId,
      status: res.ok ? "SUCCESS" : "FAILED",
      http_status: res.status,
      attempts: 1,
      response_snippet: snippet,
    });

    return Response.json({
      ok: res.ok,
      http_status: res.status,
      signature_header: header,
      payload: raw,
      response_snippet: snippet,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}