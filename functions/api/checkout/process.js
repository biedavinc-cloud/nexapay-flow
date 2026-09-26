import { getDb } from "../../_lib/db.js";
import { resolvePspCredentials } from "../../_lib/pspCrypto.js";
import { chargeCard, settleKorapayCharge } from "../../_lib/korapay.js";
import { makePayment, resolveGateway } from "../../_lib/payunit.js";
import { computeQuote } from "../../_lib/pricing.js";
import { getTenant, checkDailyLimit } from "../../_lib/tenants.js";
import {
  resolveApiKey, extractBearer, verifyClientSecret, genReference,
  encodePayload, normText, normCurrency, getAppUrlFallback,
} from "../../_lib/checkout.js";

// Cloudflare-native equivalent of base44/functions/processCheckoutPayment.
// Same public contract (status: succeeded/failed/requires_action/pending),
// same no-mock-approval rule: nothing here marks a payment approved without
// a live PSP confirmation.
const VALID_NETWORKS = new Set(["TRC20", "ERC20", "POLYGON"]);
const VALID_METHODS = new Set(["CARD", "MOBILE_MONEY"]);
const COUNTRY_BY_CURRENCY = { XAF: "CM", XOF: "CI", GHS: "GH", NGN: "NG", ZAR: "ZA", KES: "KE", RWF: "RW", TZS: "TZ", UGX: "UG" };

function genPayunitTxId() {
  return `NX${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  try {
    const body = await request.json().catch(() => ({}));
    const bearer = (body.key ? String(body.key) : "") || extractBearer(request);
    const auth = bearer ? await resolveApiKey(sql, env, bearer) : null;
    if (!auth) return Response.json({ error: "Unauthorized: missing or invalid key." }, { status: 401 });
    const isPublishable = auth.type === "publishable";
    if (auth.record) sql`update nexapay_api_keys set last_used = now() where id = ${auth.record.id}`.catch(() => {});

    const session = body.client_secret ? await verifyClientSecret(env, body.client_secret) : null;
    let payment_method, amount, currency, network, order_id, webhook_url, card, momo, email;
    if (session) {
      payment_method = normText(session.payment_method || "CARD").toUpperCase();
      amount = Number(session.amount);
      currency = normCurrency(session.currency || "EUR");
      network = normText(session.network || "TRC20").toUpperCase();
      order_id = normText(session.order_id);
      webhook_url = normText(session.webhook_url || body.webhook_url);
      card = body.card; momo = body.momo; email = body.payer?.email;
    } else if (isPublishable && Number(body.amount) > 0) {
      payment_method = normText(body.payment_method || "CARD").toUpperCase();
      amount = Number(body.amount);
      currency = normCurrency(body.currency || "EUR");
      network = normText(body.network || "TRC20").toUpperCase();
      order_id = normText(body.order_id);
      webhook_url = normText(body.webhook_url);
      card = body.card; momo = body.momo; email = body.payer?.email;
    } else {
      return Response.json({ error: "Invalid client_secret." }, { status: 401 });
    }

    if (!VALID_METHODS.has(payment_method)) return Response.json({ error: "payment_method must be CARD or MOBILE_MONEY." }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "Invalid amount." }, { status: 400 });
    if (!VALID_NETWORKS.has(network)) return Response.json({ error: "network must be TRC20, ERC20 or POLYGON." }, { status: 400 });
    if (payment_method === "CARD" && (!card || !card.number || !card.expiry || !card.cvc)) {
      return Response.json({ error: "Invalid card details." }, { status: 400 });
    }
    if (payment_method === "MOBILE_MONEY" && (!momo || !momo.provider || !momo.phone)) {
      return Response.json({ error: "Invalid Mobile Money number." }, { status: 400 });
    }

    const tenant = await getTenant(sql, auth.tenant_id);
    if (tenant && tenant.has_paid_access === false) return Response.json({ error: "Merchant access not unlocked (setup fee required)." }, { status: 403 });
    if (tenant) {
      const limitErr = await checkDailyLimit(sql, tenant.id, tenant.daily_limit, amount);
      if (limitErr) return Response.json({ error: limitErr }, { status: 403 });
    }

    // Receiving wallet: the merchant's OWN wallet, never a shared platform
    // default -- see the fund-misrouting fix applied to the Base44 version.
    let receivingWallet = tenant?.receiving_wallet || "";
    if (!receivingWallet) {
      if (tenant) return Response.json({ error: "This merchant has no receiving wallet configured." }, { status: 422 });
      const rows = await sql`select * from nexapay_crypto_wallets order by created_date desc limit 20`;
      const def = rows.find((w) => w.chain === network && w.is_default) || rows.find((w) => w.is_default) || rows[0];
      receivingWallet = def?.address || "";
      if (!receivingWallet) return Response.json({ error: "No platform receiving wallet configured." }, { status: 503 });
    }

    const quote = await computeQuote(env, { amount, currency, tenant });
    const reference_fiat = genReference();
    const rawDescriptor = tenant?.statement_descriptor || tenant?.company_name || "NEXAPAY";
    const descriptor = String(rawDescriptor).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

    const host = request.headers.get("host") || "";
    const base = host ? `https://${host}` : getAppUrlFallback(env);
    const returnUrl = `${base}/checkout-return?ref=${encodeURIComponent(reference_fiat)}`;

    if (payment_method === "CARD") {
      const cred = await resolvePspCredentials(sql, env, "KORAPAY");
      if (!cred) return Response.json({ error: "Card payments are not currently configured. Please contact support." }, { status: 503 });

      const [txRow] = await sql`
        insert into nexapay_transactions (id, reference_fiat, client_name, amount_fiat, currency_fiat, usdt_amount, exchange_rate, payment_method, destination_wallet, status, payload_base64, tenant_id, nexapay_commission, usdt_net_sent, asset, network, created_date, updated_date)
        values (gen_random_uuid()::text, ${reference_fiat}, ${email || card.name || "NexaPay Customer"}, ${amount}, ${currency}, ${quote.usdtGross}, ${quote.rate}, 'CARD', ${receivingWallet}, 'PENDING', ${encodePayload({ order_id, webhook_url, transaction_id: reference_fiat })}, ${tenant?.id || null}, ${quote.commissionUsdt}, ${quote.usdtEstimated}, 'USDT', ${network}, now(), now())
        returning *
      `;

      const [expMonth, expYear] = String(card.expiry).split("/").map((s) => s.trim());
      let charge;
      try {
        charge = await chargeCard(cred.keys, {
          reference: reference_fiat,
          card: { name: card.name || "NexaPay Customer", number: String(card.number).replace(/\s+/g, ""), cvv: String(card.cvc), expiry_month: expMonth, expiry_year: expYear },
          amount, currency, redirectUrl: returnUrl,
          customer: { name: card.name || "NexaPay Customer", email: email || "customer@nexapay.app" },
          metadata: { reference: reference_fiat, order_id: order_id || undefined, descriptor },
        });
      } catch (e) {
        await sql`update nexapay_transactions set status = 'FAILED', error_message = ${e.message} where id = ${txRow.id}`;
        return Response.json({ status: "failed", transaction_id: txRow.id, error: "Payment processing failed." });
      }

      const data = charge.data || {};
      if (String(data.auth_model || "").toUpperCase() === "3DS") {
        const authUrl = data.authorization?.redirect_url;
        if (!authUrl) {
          await sql`update nexapay_transactions set status = 'FAILED', error_message = '3DS without redirect URL' where id = ${txRow.id}`;
          return Response.json({ status: "failed", transaction_id: txRow.id, error: "Card authentication unavailable." });
        }
        return Response.json({ status: "requires_action", transaction_id: txRow.id, reference: reference_fiat, auth_url: authUrl });
      }

      if (data.status === "success") {
        await sql`update nexapay_transactions set korapay_reference = ${data.payment_reference || reference_fiat} where id = ${txRow.id}`;
        const settled = await settleKorapayCharge(sql, env, cred.keys, data.payment_reference || reference_fiat);
        if (settled.status === "COMPLETED") return Response.json({ status: "succeeded", transaction_id: txRow.id, crypto_tx_hash: settled.crypto_tx_hash });
        return Response.json({ status: "succeeded", transaction_id: txRow.id, settlement: settled.status });
      }
      return Response.json({ status: "failed", transaction_id: txRow.id, error: "Payment declined by bank." });
    }

    // --- MOBILE_MONEY ---
    const cred = await resolvePspCredentials(sql, env, "PAYUNIT");
    if (!cred) return Response.json({ error: "Mobile Money payments are not currently configured. Please contact support." }, { status: 503 });
    const country = normText(body.country || momo.country || COUNTRY_BY_CURRENCY[currency]);
    const gateway = resolveGateway(country, momo.provider);
    if (!gateway) return Response.json({ error: `Mobile Money operator not supported for ${country || currency}.` }, { status: 400 });

    const payunitTxId = genPayunitTxId();
    const notifyUrl = `${base}/api/webhooks/payunit?ref=${encodeURIComponent(reference_fiat)}`;
    const [txRow] = await sql`
      insert into nexapay_transactions (id, reference_fiat, client_name, amount_fiat, currency_fiat, usdt_amount, exchange_rate, payment_method, destination_wallet, status, payload_base64, tenant_id, nexapay_commission, usdt_net_sent, asset, network, created_date, updated_date)
      values (gen_random_uuid()::text, ${reference_fiat}, ${email || `${momo.prefix || ""}${momo.phone}`}, ${amount}, ${currency}, ${quote.usdtGross}, ${quote.rate}, 'MOBILE_MONEY', ${receivingWallet}, 'PENDING', ${encodePayload({ order_id, webhook_url, payunit_tx_id: payunitTxId })}, ${tenant?.id || null}, ${quote.commissionUsdt}, ${quote.usdtEstimated}, 'USDT', ${network}, now(), now())
      returning *
    `;

    try {
      await makePayment(cred.keys, { gateway, amount, currency, transaction_id: payunitTxId, return_url: returnUrl, notify_url: notifyUrl, phone_number: `${momo.prefix || ""}${momo.phone}` });
    } catch (e) {
      await sql`update nexapay_transactions set status = 'FAILED', error_message = ${e.message} where id = ${txRow.id}`;
      return Response.json({ status: "failed", transaction_id: txRow.id, error: "Payment processing failed." });
    }

    return Response.json({
      status: "pending", transaction_id: txRow.id, reference: reference_fiat,
      prompt_message: "A USSD prompt has been sent to your phone. Please enter your PIN to confirm.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
