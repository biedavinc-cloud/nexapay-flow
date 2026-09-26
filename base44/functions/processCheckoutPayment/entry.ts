import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { waitUntil } from "base44:runtime";
import {
  verifyClientSecret, extractBearer, genReference, encodePayload,
  normText, resolveRate, normCurrency, resolveApiKey,
} from "../../shared/checkout.ts";
import { isUnlimited } from "../../shared/tiers.ts";
import { resolvePspCredentials } from "../../shared/pspCrypto.ts";
import { chargeCard, setKorapayKeys, korapayConfigured, settleKorapayCharge } from "../../shared/korapay.ts";
import { makePayment, resolveGateway, payunitConfigured, setPayunitKeys } from "../../shared/payunit.ts";
import { mirrorTransaction } from "../../shared/neon.ts";

// NexaPay checkout endpoint — REAL fiat capture, no mock approval.
// CARD -> Korapay direct encrypted charge (customer never leaves NexaPay; may
//         return requires_action for 3DS -- poll korapayVerify to finish).
// MOBILE_MONEY -> PayUnit direct USSD/OTP push (customer never leaves NexaPay;
//         returns pending -- poll checkPayunitStatus to finish).
// There is deliberately NO code path here that marks a payment approved
// without a live confirmation from the PSP. If neither PSP is configured for
// a method, the request fails loudly instead of pretending to succeed.

const VALID_NETWORKS = new Set(["TRC20", "ERC20", "POLYGON"]);
const VALID_METHODS = new Set(["CARD", "MOBILE_MONEY"]);
const COUNTRY_BY_CURRENCY = { XAF: "CM", XOF: "CI", GHS: "GH", NGN: "NG", ZAR: "ZA", KES: "KE", RWF: "RW", TZS: "TZ", UGX: "UG" };

function genPayunitTxId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NX${stamp}${rand}`;
}

export default async function (req) {
  const base44 = createClientFromRequest(req);
  try {
    const body = await req.json().catch(() => ({}));
    const bearer = (body && body.key ? String(body.key) : "") || extractBearer(req);
    const auth = bearer ? await resolveApiKey(base44, bearer) : null;
    if (!auth) {
      return Response.json({ error: "Unauthorized: missing or invalid key." }, { status: 401 });
    }
    const isPublishable = auth.type === "publishable";
    if (auth.record) {
      base44.asServiceRole.entities.ApiKey.update(auth.record.id, { last_used: new Date().toISOString() }).catch(() => {});
    }
    const session = body.client_secret ? await verifyClientSecret(body.client_secret) : null;

    let payment_method, amount, currency, network, order_id, webhook_url, card, momo, email;
    if (session) {
      payment_method = normText(session.payment_method || "CARD").toUpperCase();
      amount = Number(session.amount);
      currency = normCurrency(session.currency || "EUR");
      network = normText(session.network || "TRC20").toUpperCase();
      order_id = normText(session.order_id);
      webhook_url = normText(session.webhook_url || body.webhook_url);
      card = body.card; momo = body.momo; email = body.payer && body.payer.email;
    } else if (isPublishable && Number(body.amount) > 0) {
      payment_method = normText(body.payment_method || "CARD").toUpperCase();
      amount = Number(body.amount);
      currency = normCurrency(body.currency || "EUR");
      network = normText(body.network || "TRC20").toUpperCase();
      order_id = normText(body.order_id);
      webhook_url = normText(body.webhook_url);
      card = body.card; momo = body.momo; email = body.payer && body.payer.email;
    } else {
      return Response.json({ error: "Invalid client_secret." }, { status: 401 });
    }

    if (!VALID_METHODS.has(payment_method)) {
      return Response.json({ error: "payment_method must be CARD or MOBILE_MONEY." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json({ error: "Montant invalide." }, { status: 400 });
    }
    if (!VALID_NETWORKS.has(network)) {
      return Response.json({ error: "network must be TRC20, ERC20 or POLYGON." }, { status: 400 });
    }
    if (payment_method === "CARD") {
      if (!card || !card.number || !card.expiry || !card.cvc) {
        return Response.json({ error: "Coordonnées de carte invalides." }, { status: 400 });
      }
    } else {
      if (!momo || !momo.provider || !(momo.phone || "")) {
        return Response.json({ error: "Numéro mobile money invalide." }, { status: 400 });
      }
    }

    // Resolve merchant tenant from the API key (multi-tenant SaaS).
    let tenant = null;
    const tenantId = auth.record && auth.record.tenant_id ? auth.record.tenant_id : null;
    if (tenantId) {
      try { tenant = await base44.asServiceRole.entities.Tenant.get(tenantId); } catch { tenant = null; }
    }
    if (tenant && tenant.has_paid_access === false) {
      return Response.json({ error: "Accès marchand non débloqué (paiement du pass requis)." }, { status: 403 });
    }
    if (tenant && !isUnlimited(tenant.daily_limit)) {
      try {
        const since = new Date(Date.now() - 86400000).toISOString();
        const recent = await base44.asServiceRole.entities.Transaction.filter({ tenant_id: tenantId, created_date: { $gte: since } }, "-created_date", 500);
        const sum = recent.reduce((a, t) => a + (t.amount_fiat || 0), 0);
        if (sum + amount > tenant.daily_limit) {
          return Response.json({ error: `Limite quotidienne ${tenant.daily_limit} dépassée.` }, { status: 403 });
        }
      } catch {}
    }

    // Receiving wallet: the MERCHANT's own wallet, never a shared platform
    // default. Sending a tenant-scoped payment to a generic "any default"
    // wallet would misroute one merchant's customer funds to another
    // merchant (or to the platform's own wallet) -- this must be
    // tenant-specific, exactly like korapayCharge already does it correctly.
    let receivingWallet = tenant?.receiving_wallet || "";
    if (!receivingWallet) {
      if (tenant) {
        // A real merchant with no wallet configured must not silently
        // settle into some other wallet.
        return Response.json({ error: "Ce marchand n'a pas encore configuré de wallet de réception." }, { status: 422 });
      }
      // No tenant = NexaPay's own platform-level flow (e.g. merchant
      // onboarding setup fee, paid TO NexaPay, not through a merchant key).
      // Only here is a platform default CryptoWallet the correct target.
      try {
        const wallets = await base44.asServiceRole.entities.CryptoWallet.list("-created_date", 20);
        const def = wallets.find((w) => w.chain === network && w.is_default) || wallets.find((w) => w.is_default) || wallets[0];
        if (def && def.address) receivingWallet = def.address;
      } catch {}
      if (!receivingWallet) {
        return Response.json({ error: "Aucun wallet de réception plateforme configuré." }, { status: 503 });
      }
    }

    // Fiat → USDT (live CoinGecko rate, with offline fallback).
    const { rate } = await resolveRate(currency);
    let usdt = Math.round(amount * rate * 1e6) / 1e6;
    let globalMargin = 0;
    try {
      const settings = await base44.asServiceRole.entities.AppSetting.list("-created_date", 100);
      const gm = settings.find((s) => s.key === "global_margin_pct");
      if (gm && Number(gm.value)) globalMargin = Number(gm.value);
    } catch {}
    if (globalMargin > 0) usdt = Math.round(usdt * (1 - globalMargin / 100) * 1e6) / 1e6;

    const reference_fiat = genReference();
    const commissionRate = tenant ? (tenant.commission_rate || 0) : 0;
    const commissionUsdt = Math.round(usdt * commissionRate) / 100;
    const usdtNet = Math.round((usdt - commissionUsdt) * 1e6) / 1e6;

    // Dynamic statement descriptor: what the payer's bank statement shows.
    // Real PSP feature (Korapay dynamic_descriptor, 10 alnum chars max) --
    // never a way to disguise the transaction, just to identify the merchant.
    const rawDescriptor = tenant?.statement_descriptor || tenant?.company_name || "NEXAPAY";
    const descriptor = String(rawDescriptor).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const base = host ? `https://${host}` : "https://thankful-nexa-pay-flow.base44.app";
    const returnUrl = `${base}/checkout-return?ref=${encodeURIComponent(reference_fiat)}${body.embed ? `&embed=true` : ""}`;
    const notifyUrl = `${base}/functions/payunitNotify?ref=${encodeURIComponent(reference_fiat)}`;

    if (payment_method === "CARD") {
      setKorapayKeys((await resolvePspCredentials(base44, "KORAPAY"))?.keys || null);
      if (!korapayConfigured()) {
        return Response.json({ error: "Card payments are not currently configured. Please contact support." }, { status: 503 });
      }

      const tx = await base44.asServiceRole.entities.Transaction.create({
        reference_fiat, client_name: email || card.name || "NexaPay Customer",
        amount_fiat: amount, currency_fiat: currency, usdt_amount: usdt, exchange_rate: rate,
        payment_method: "CARD", psp_provider: "KORAPAY", crypto_provider: "",
        destination_wallet: receivingWallet, status: "PENDING",
        payload_base64: encodePayload({ order_id, webhook_url, transaction_id: reference_fiat }),
        tenant_id: tenantId || "", gateway_fee: 0, nexapay_commission: commissionUsdt,
        usdt_net_sent: usdtNet, asset: "USDT", network,
      });

      const [expMonth, expYear] = String(card.expiry).split("/").map((s) => s.trim());
      let charge;
      try {
        charge = await chargeCard({
          reference: reference_fiat,
          card: { name: card.name || "NexaPay Customer", number: String(card.number).replace(/\s+/g, ""), cvv: String(card.cvc), expiry_month: expMonth, expiry_year: expYear },
          amount, currency, redirectUrl: returnUrl,
          customer: { name: card.name || "NexaPay Customer", email: email || "customer@nexapay.app" },
          metadata: { reference: reference_fiat, order_id: order_id || undefined, descriptor },
        });
      } catch (e) {
        await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FAILED", error_message: e.message });
        return Response.json({ status: "failed", transaction_id: tx.id, error: "Échec du traitement du paiement." });
      }

      const data = charge.data || {};
      const authModel = String(data.auth_model || "").toUpperCase();

      if (authModel === "3DS") {
        const authUrl = data.authorization?.redirect_url;
        if (!authUrl) {
          await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FAILED", error_message: "3DS sans URL d'autorisation." });
          return Response.json({ status: "failed", transaction_id: tx.id, error: "Authentification carte indisponible." });
        }
        // Bank-mandated step -- this is the cardholder's own bank verification
        // page (3D Secure), required by card network rules; it cannot be
        // skipped or hidden, and it is not third-party PSP branding.
        return Response.json({ status: "requires_action", transaction_id: tx.id, reference: reference_fiat, auth_url: authUrl });
      }

      if (data.status === "success") {
        await base44.asServiceRole.entities.Transaction.update(tx.id, { korapay_reference: data.payment_reference || reference_fiat });
        const settled = await settleKorapayCharge(base44, data.payment_reference || reference_fiat);
        if (settled.status === "COMPLETED") {
          return Response.json({ status: "succeeded", transaction_id: tx.id, crypto_tx_hash: settled.crypto_tx_hash });
        }
        // Fiat WAS captured but crypto payout failed/is retrying -- still a
        // successful payment from the payer's point of view; never reported
        // as failed just because our internal payout hasn't settled yet.
        return Response.json({ status: "succeeded", transaction_id: tx.id, settlement: settled.status });
      }

      return Response.json({ status: "failed", transaction_id: tx.id, error: "Paiement refusé par la banque." });
    }

    // --- MOBILE_MONEY ---
    setPayunitKeys((await resolvePspCredentials(base44, "PAYUNIT"))?.keys || null);
    if (!payunitConfigured()) {
      return Response.json({ error: "Mobile Money payments are not currently configured. Please contact support." }, { status: 503 });
    }
    const country = normText(body.country || momo.country || COUNTRY_BY_CURRENCY[currency]);
    const gateway = resolveGateway(country, momo.provider);
    if (!gateway) {
      return Response.json({ error: `Opérateur Mobile Money non supporté pour ${country || currency}.` }, { status: 400 });
    }

    const payunitTxId = genPayunitTxId();
    const tx = await base44.asServiceRole.entities.Transaction.create({
      reference_fiat, client_name: email || `${momo.prefix || ""}${momo.phone}`,
      amount_fiat: amount, currency_fiat: currency, usdt_amount: usdt, exchange_rate: rate,
      payment_method: "MOBILE_MONEY", psp_provider: "PAYUNIT", crypto_provider: "",
      destination_wallet: receivingWallet, status: "PENDING",
      payload_base64: encodePayload({ order_id, webhook_url, payunit_tx_id: payunitTxId, email, payment_country: country, return_url: returnUrl, notify_url: notifyUrl }),
      tenant_id: tenantId || "", gateway_fee: 0, nexapay_commission: commissionUsdt,
      usdt_net_sent: usdtNet, asset: "USDT", network,
    });

    try {
      await makePayment({
        gateway, amount, currency, transaction_id: payunitTxId,
        return_url: returnUrl, notify_url: notifyUrl, phone_number: `${momo.prefix || ""}${momo.phone}`,
      });
    } catch (e) {
      await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FAILED", error_message: e.message });
      return Response.json({ status: "failed", transaction_id: tx.id, error: "Échec du traitement du paiement." });
    }

    waitUntil(mirrorTransaction(tx).catch(() => {}));
    // Real Mobile Money confirmation needs the customer to enter their PIN on
    // their phone -- it cannot be synchronous. The widget must poll
    // checkPayunitStatus?ref=<reference> (or the payment.succeeded/failed
    // webhook) until it resolves. This is a real wait, not a mock.
    return Response.json({
      status: "pending",
      transaction_id: tx.id,
      reference: reference_fiat,
      prompt_message: "Un prompt USSD a été envoyé sur votre téléphone. Veuillez saisir votre code PIN pour valider.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
