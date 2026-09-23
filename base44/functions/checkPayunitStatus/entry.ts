import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { verifyAndSettle, setPayunitKeys } from "../../shared/payunit.ts";
import { resolvePspCredentials } from "../../shared/pspCrypto.ts";

// Polled by the client-facing return page after the Payunit redirect. Idempotent:
// re-queries Payunit's live status and settles (crypto payout + marketplace webhook)
// the first time it sees SUCCESS, then returns the current state on subsequent calls.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  setPayunitKeys((await resolvePspCredentials(base44, "PAYUNIT"))?.keys || null);
  try {
    let ref = null;
    const url = new URL(req.url);
    ref = url.searchParams.get("ref");
    if (!ref) {
      try { const body = await req.json(); ref = body?.ref; } catch {}
    }
    if (!ref) return Response.json({ error: "Missing ref" }, { status: 400 });

    const result = await verifyAndSettle(base44, ref);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}