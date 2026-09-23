// Korapay webhook receiver — verifies x-korapay-signature (HMAC-SHA256 of body.data),
// then on charge.success settles the real crypto payout. Public endpoint (no user auth);
// authenticity is guaranteed by the signature check. The webhook URL registered in the
// Korapay dashboard is https://<app>/functions/korapayWebhook
import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { verifyWebhookSignatureAsync, settleKorapayCharge, setKorapayKeys } from "../../shared/korapay.ts";
import { resolvePspCredentials } from "../../shared/pspCrypto.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    setKorapayKeys((await resolvePspCredentials(base44, "KORAPAY"))?.keys || null);
    const body = await req.json().catch(() => ({}));
    const signature = req.headers.get("x-korapay-signature") || req.headers.get("X-Korapay-Signature") || "";

    const data = body?.data || {};
    const ok = await verifyWebhookSignatureAsync(data, signature);
    if (!ok) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }

    if (body?.event !== "charge.success") {
      // Non-success events are acknowledged without settlement.
      return Response.json({ status: "ignored", event: body?.event });
    }

    const ref = data.reference || data.payment_reference;
    if (!ref) return Response.json({ error: "missing reference" }, { status: 400 });

    const result = await settleKorapayCharge(base44, ref);
    return Response.json({ status: "ok", result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}