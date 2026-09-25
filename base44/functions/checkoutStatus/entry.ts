import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { settleKorapayCharge, setKorapayKeys } from "../../shared/korapay.ts";
import { verifyAndSettle, setPayunitKeys } from "../../shared/payunit.ts";
import { resolvePspCredentials } from "../../shared/pspCrypto.ts";
import { resolveApiKey, extractBearer } from "../../shared/checkout.ts";

// Single, PSP-agnostic status endpoint for the checkout documented in
// ApiDocs.jsx. Internally dispatches to whichever real PSP handled this
// transaction (Korapay direct charge or PayUnit Mobile Money push) and maps
// its provider-specific vocabulary onto the public one: succeeded / failed /
// pending. Callers never need to know which PSP was used -- that's the
// point: NexaPay's checkout surface doesn't leak which third party
// processed a given payment.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const bearer = (body && body.key ? String(body.key) : "") || extractBearer(req);
    const auth = bearer ? await resolveApiKey(base44, bearer) : null;
    if (!auth) return Response.json({ error: "Unauthorized: missing or invalid key." }, { status: 401 });

    const reference = url.searchParams.get("reference") || body.reference
      || url.searchParams.get("transaction_id") || body.transaction_id;
    if (!reference) return Response.json({ error: "Missing reference or transaction_id." }, { status: 400 });

    const byRef = await base44.asServiceRole.entities.Transaction.filter({ reference_fiat: reference });
    const tx = byRef[0] || (await base44.asServiceRole.entities.Transaction.get(reference).catch(() => null));
    if (!tx) return Response.json({ error: "Transaction not found." }, { status: 404 });

    // Same-tenant check: a merchant's key can only poll its own transactions.
    const tenantId = auth.record && auth.record.tenant_id;
    if (tenantId && tx.tenant_id && tx.tenant_id !== tenantId) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    if (tx.psp_provider === "KORAPAY") {
      setKorapayKeys((await resolvePspCredentials(base44, "KORAPAY"))?.keys || null);
      const r = await settleKorapayCharge(base44, tx.korapay_reference || tx.reference_fiat);
      return Response.json(mapStatus(r, tx));
    }

    if (tx.psp_provider === "PAYUNIT") {
      setPayunitKeys((await resolvePspCredentials(base44, "PAYUNIT"))?.keys || null);
      const r = await verifyAndSettle(base44, tx.reference_fiat);
      return Response.json(mapStatus(r, tx));
    }

    return Response.json({ status: statusToPublic(tx.status), transaction_id: tx.id, reference: tx.reference_fiat });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function statusToPublic(internal) {
  if (internal === "COMPLETED") return "succeeded";
  if (internal === "FAILED") return "failed";
  return "pending";
}

function mapStatus(r, tx) {
  return {
    status: statusToPublic(r.status),
    transaction_id: r.transaction_id || tx.id,
    reference: r.reference || tx.reference_fiat,
    crypto_tx_hash: r.crypto_tx_hash,
    error: r.error,
  };
}
