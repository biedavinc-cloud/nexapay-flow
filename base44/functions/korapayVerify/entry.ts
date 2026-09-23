// Korapay charge verification + settlement (polled by the checkout after a 3DS redirect or
// a pending charge). Idempotent: verifies the live Korapay charge status and, on success,
// runs the real crypto payout. Safe to call repeatedly.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { settleKorapayCharge, setKorapayKeys } from "../../shared/korapay.ts";
import { resolvePspCredentials } from "../../shared/pspCrypto.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    setKorapayKeys((await resolvePspCredentials(base44, "KORAPAY"))?.keys || null);
    const body = await req.json().catch(() => ({}));
    const reference = body.reference || body.payment_reference;
    if (!reference) return Response.json({ error: "missing reference" }, { status: 400 });

    const result = await settleKorapayCharge(base44, reference);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}