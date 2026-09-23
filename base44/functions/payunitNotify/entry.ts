import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { verifyAndSettle, setPayunitKeys } from "../../shared/payunit.ts";
import { resolvePspCredentials } from "../../shared/pspCrypto.ts";

// Payunit server-to-server webhook (notify_url). Payunit posts the payment result here.
// The NexaPay reference is carried in the `ref` query param of the notify_url we provided.
// Anyone can reach this endpoint, so we trust only the live Payunit status (verifyAndSettle
// re-queries Payunit's status API before settling — never the request body).
export default async function (req) {
  const base44 = createClientFromRequest(req);
  setPayunitKeys((await resolvePspCredentials(base44, "PAYUNIT"))?.keys || null);
  try {
    let ref = null;
    const url = new URL(req.url);
    ref = url.searchParams.get("ref");
    if (!ref) {
      try {
        const body = await req.json();
        ref = body?.ref || body?.transaction_id || body?.data?.transaction_id;
      } catch {}
    }
    if (!ref) return Response.json({ error: "Missing ref" }, { status: 400 });

    const result = await verifyAndSettle(base44, ref);
    // Always ack 200 so Payunit doesn't keep retrying; the actual settlement is
    // authoritative via the Payunit status API, not this response.
    return Response.json({ received: true, status: result.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}