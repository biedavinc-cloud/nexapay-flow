// NexaPay white-label CARD charge via Korapay direct API.
// The client enters card details on the NexaPay checkout (never sees Korapay).
// Returns: { status: "SUCCESS" } (NO_AUTH), { status: "3DS", auth_url } (needs 3DS modal),
// or an error. Commission is computed from the tenant fee structure / default and deducted.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { secrets } from "base44:runtime";
import { chargeCard, setKorapayKeys } from "../../shared/korapay.ts";
import { resolvePspCredentials } from "../../shared/pspCrypto.ts";
import { genReference, encodePayload, normCurrency, normText } from "../../shared/checkout.ts";
import { computeQuote } from "../../shared/pricing.ts";

function safeSecret(name) {
  try {
    return secrets.get(name);
  } catch {
    return undefined;
  }
}

async function resolveTenant(base44, tenantId) {
  if (!tenantId) return null;
  try {
    const list = await base44.asServiceRole.entities.Tenant.filter({ id: tenantId });
    return (list && list[0]) || null;
  } catch {
    return null;
  }
}

function defaultCommissionPercent() {
  const v = parseFloat(safeSecret("NEXAPAY_DEFAULT_COMMISSION_PERCENT"));
  return Number.isFinite(v) && v >= 0 ? v : 3.5;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    setKorapayKeys((await resolvePspCredentials(base44, "KORAPAY"))?.keys || null);
    const body = await req.json().catch(() => ({}));

    const amount = Number(body.amount);
    const currency = normCurrency(body.currency || "NGN");
    if (!amount || amount <= 0) return Response.json({ error: "Montant invalide." }, { status: 400 });

    const tenantId = normText(body.tenant_id);
    const customerName = normText(body.customer_name || body.client_name);
    const customerEmail = normText(body.customer_email);
    if (!customerEmail) return Response.json({ error: "Email client requis." }, { status: 400 });

    const card = body.card;
    if (!card || !card.number || !card.cvv || !card.expiry_month || !card.expiry_year) {
      return Response.json({ error: "Données carte incomplètes." }, { status: 400 });
    }

    const tenant = await resolveTenant(base44, tenantId);
    const receivingWallet = tenant?.receiving_wallet || normText(body.destination_wallet);
    const network = body.network || tenant?.blockchain || "TRC20";
    if (!receivingWallet) return Response.json({ error: "Wallet de réception non configuré." }, { status: 400 });

    // Commission + live USDT estimate (single source of truth: shared/pricing.ts).
    const q = await computeQuote({ amount, currency, tenant });
    const feeFiat = q.fee_fiat;
    const netFiat = q.net_fiat;
    const rate = q.rate;
    const live = q.rate_live;
    const usdtEstimated = q.usdt_estimated;
    const usdtGross = q.usdt_gross;
    const commissionUsdt = q.commission_usdt;

    const reference = body.reference || genReference();
    const orderId = normText(body.order_id);
    const webhookUrl = normText(body.webhook_url);
    const meta = encodePayload({ order_id: orderId, webhook_url: webhookUrl, psp: "KORAPAY" });

    // Record the transaction INITIATED before charging (fiat not yet captured).
    const tx = await base44.asServiceRole.entities.Transaction.create({
      tenant_id: tenantId || undefined,
      reference_fiat: reference,
      client_name: customerName,
      amount_fiat: amount,
      currency_fiat: currency,
      fee_amount_fiat: feeFiat,
      net_fiat_amount: netFiat,
      gateway_fee: 0,
      nexapay_commission: commissionUsdt,
      asset: "USDT",
      network,
      usdt_amount: usdtGross,
      usdt_amount_estimated: usdtEstimated,
      usdt_net_sent: usdtEstimated,
      exchange_rate: rate,
      payment_method: "CARD",
      psp_provider: "KORAPAY",
      destination_wallet: receivingWallet,
      status: "INITIATED",
      payload_base64: meta,
    });

    const returnUrl = body.return_url || (typeof self !== "undefined" && self.location?.origin ? `${self.location.origin}/pay/korapay-return` : "");

    let charge;
    try {
      charge = await chargeCard({
        reference,
        card: {
          name: customerName || "NexaPay Customer",
          number: String(card.number).replace(/\s+/g, ""),
          cvv: String(card.cvv),
          expiry_month: String(card.expiry_month),
          expiry_year: String(card.expiry_year),
        },
        amount,
        currency,
        redirectUrl: returnUrl,
        customer: { name: customerName || "NexaPay Customer", email: customerEmail },
        metadata: { reference, order_id: orderId || undefined },
      });
    } catch (e) {
      await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FAILED", error_message: e.message });
      return Response.json({ error: e.message }, { status: 400 });
    }

    const data = charge.data || {};
    const authModel = String(data.auth_model || "").toUpperCase();

    if (authModel === "3DS") {
      // Needs 3D Secure — client opens the auth URL inside a NexaPay modal, then polls verify.
      const authUrl = data.authorization?.redirect_url;
      if (!authUrl) {
        await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FAILED", error_message: "3DS sans URL d'autorisation." });
        return Response.json({ error: "3DS indisponible." }, { status: 400 });
      }
      return Response.json({
        status: "3DS",
        reference,
        transaction_id: tx.id,
        auth_url: authUrl,
        usdt_estimated: usdtEstimated,
        rate,
        rate_live: live,
      });
    }

    if (data.status === "success") {
      // NO_AUTH — fiat captured immediately. Settle crypto payout now.
      await base44.asServiceRole.entities.Transaction.update(tx.id, {
        korapay_reference: data.payment_reference || reference,
        status: "FIAT_RECEIVED",
      });
      const settled = await base44.functions.invoke("korapayVerify", { reference: data.payment_reference || reference });
      return Response.json({
        status: "SUCCESS",
        reference,
        transaction_id: tx.id,
        usdt_estimated: usdtEstimated,
        rate,
        rate_live: live,
        settlement: settled,
      });
    }

    // Still processing (pending) — client should poll korapayVerify.
    return Response.json({
      status: "PENDING",
      reference,
      transaction_id: tx.id,
      payment_reference: data.payment_reference,
      usdt_estimated: usdtEstimated,
      rate,
      rate_live: live,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}