// NexaPay direct Mobile Money charge (zero-redirect) via PayUnit /api/gateway/makepayment.
// The customer enters their phone on the NexaPay checkout; the backend triggers the USSD push
// directly with the PSP. The user NEVER leaves the checkout — they validate on their phone and
// the UI polls until confirmed. No crypto/PSP details are returned to the client.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { waitUntil } from "base44:runtime";
import {
  verifyClientSecret, extractBearer, resolveApiKey, resolveRate,
  normCurrency, normText, genReference, encodePayload,
  getAppUrlFallback,
} from "../../shared/checkout.ts";
import { isUnlimited } from "../../shared/tiers.ts";
import { makePayment, resolveGateway, payunitConfigured, setPayunitKeys } from "../../shared/payunit.ts";
import { resolvePspCredentials } from "../../shared/pspCrypto.ts";
import { mirrorTransaction } from "../../shared/neon.ts";

const VALID_NETWORKS = new Set(["TRC20", "ERC20", "POLYGON"]);
const COUNTRY_BY_CURRENCY = { XAF: "CM", XOF: "CI", GHS: "GH", NGN: "NG", ZAR: "ZA", KES: "KE", RWF: "RW", TZS: "TZ", UGX: "UG" };

// PayUnit transaction_id must avoid special characters (Orange Money requirement).
function genPayunitTxId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NX${stamp}${rand}`;
}

export default async function (req) {
  const base44 = createClientFromRequest(req);
  setPayunitKeys((await resolvePspCredentials(base44, "PAYUNIT"))?.keys || null);
  try {
    if (!payunitConfigured()) {
      return Response.json({ error: "PSP not configured." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const bearer = (body && body.key ? String(body.key) : "") || extractBearer(req);
    const auth = bearer ? await resolveApiKey(base44, bearer) : null;
    if (!auth) return Response.json({ error: "Unauthorized: missing or invalid key." }, { status: 401 });
    const isPublishable = auth.type === "publishable";
    const session = body.client_secret ? await verifyClientSecret(body.client_secret) : null;

    let amount, currency, network, order_id, webhook_url, email, payment_country;
    if (session) {
      amount = Number(session.amount);
      currency = normCurrency(session.currency || "EUR");
      network = normText(session.network || "TRC20").toUpperCase();
      order_id = normText(session.order_id);
      webhook_url = normText(session.webhook_url || body.webhook_url);
      email = body.payer && body.payer.email;
      payment_country = normText(session.payment_country || body.payment_country);
    } else if (isPublishable && Number(body.amount) > 0) {
      amount = Number(body.amount);
      currency = normCurrency(body.currency || "EUR");
      network = normText(body.network || "TRC20").toUpperCase();
      order_id = normText(body.order_id);
      webhook_url = normText(body.webhook_url);
      email = body.payer && body.payer.email;
      payment_country = normText(body.payment_country);
    } else {
      return Response.json({ error: "Invalid client_secret or amount." }, { status: 401 });
    }

    if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "Invalid amount." }, { status: 400 });
    if (!VALID_NETWORKS.has(network)) return Response.json({ error: "network must be TRC20, ERC20 or POLYGON." }, { status: 400 });

    const country = normText(body.country || payment_country || COUNTRY_BY_CURRENCY[currency]);
    const operator = normText(body.operator);
    const phone = normText(body.phone);
    if (!country) return Response.json({ error: "Country required." }, { status: 400 });
    if (!phone) return Response.json({ error: "Phone number required." }, { status: 400 });
    const gateway = resolveGateway(country, operator);
    if (!gateway) return Response.json({ error: `Unsupported Mobile Money operator for ${country}.` }, { status: 400 });

    // Resolve merchant tenant from the API key.
    let tenant = null;
    const tenantId = auth.record && auth.record.tenant_id ? auth.record.tenant_id : null;
    if (tenantId) {
      try { tenant = await base44.asServiceRole.entities.Tenant.get(tenantId); } catch { tenant = null; }
    }
    if (tenant && tenant.has_paid_access === false) {
      return Response.json({ error: "Merchant access not unlocked." }, { status: 403 });
    }
    if (tenant && !isUnlimited(tenant.daily_limit)) {
      try {
        const since = new Date(Date.now() - 86400000).toISOString();
        const recent = await base44.asServiceRole.entities.Transaction.filter({ tenant_id: tenantId, created_date: { $gte: since } }, "-created_date", 500);
        const sum = recent.reduce((a, t) => a + (t.amount_fiat || 0), 0);
        if (sum + amount > tenant.daily_limit) {
          return Response.json({ error: `Daily limit ${tenant.daily_limit} exceeded.` }, { status: 403 });
        }
      } catch {}
    }

    // Receiving wallet: the MERCHANT's own wallet -- never a shared platform
    // default, or one tenant's Mobile Money customer would fund another
    // tenant (or the platform wallet) by mistake.
    let receivingWallet = tenant?.receiving_wallet || "";
    if (!receivingWallet) {
      if (tenant) {
        return Response.json({ error: "This merchant has no receiving wallet configured." }, { status: 422 });
      }
      try {
        const wallets = await base44.asServiceRole.entities.CryptoWallet.list("-created_date", 20);
        const def = wallets.find((w) => w.chain === network && w.is_default) || wallets.find((w) => w.is_default) || wallets[0];
        if (def && def.address) receivingWallet = def.address;
      } catch {}
      if (!receivingWallet) {
        return Response.json({ error: "No platform receiving wallet configured." }, { status: 503 });
      }
    }

    const { rate } = await resolveRate(currency);
    let usdt = Math.round(amount * rate * 1e6) / 1e6;
    const reference_fiat = genReference();
    const commissionRate = tenant ? (tenant.commission_rate || 0) : 0;
    const commissionUsdt = Math.round(usdt * commissionRate) / 100;
    const usdtNet = Math.round((usdt - commissionUsdt) * 1e6) / 1e6;
    const payunitTxId = genPayunitTxId();

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const base = host ? `https://${host}` : getAppUrlFallback();
    const returnUrl = `${base}/payunit-return?ref=${encodeURIComponent(reference_fiat)}${body.embed ? `&embed=true` : ""}`;
    const notifyUrl = `${base}/functions/payunitNotify?ref=${encodeURIComponent(reference_fiat)}`;

    const tx = await base44.asServiceRole.entities.Transaction.create({
      reference_fiat,
      client_name: email || "Client Mobile Money",
      amount_fiat: amount,
      currency_fiat: currency,
      usdt_amount: usdt,
      exchange_rate: rate,
      payment_method: "MOBILE_MONEY",
      crypto_provider: "",
      destination_wallet: receivingWallet,
      status: "PENDING",
      psp_provider: "PAYUNIT",
      payload_base64: encodePayload({ order_id, webhook_url, payunit_tx_id: payunitTxId, email, payment_country: country, return_url: returnUrl, notify_url: notifyUrl }),
      tenant_id: tenantId || "",
      gateway_fee: 0,
      nexapay_commission: commissionUsdt,
      usdt_net_sent: usdtNet,
      asset: "USDT",
      network,
    });
    await base44.asServiceRole.entities.TransactionLog.create({
      transaction_id: tx.id, reference_fiat, from_status: "", to_status: "PENDING", level: "INFO",
      message: `Mobile Money ${amount} ${currency} — USSD prompt sent.`, actor: "payunit",
    });

    let pu;
    try {
      pu = await makePayment({
        gateway, amount, currency, transaction_id: payunitTxId,
        return_url: returnUrl, notify_url: notifyUrl, phone_number: phone,
      });
    } catch (e) {
      await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FAILED", error_message: e.message });
      return Response.json({ error: e.message }, { status: 502 });
    }

    waitUntil(mirrorTransaction(tx).catch(() => {}));
    // Client-facing response: fiat only, no crypto/PSP details.
    return Response.json({
      status: "pending",
      reference: reference_fiat,
      transaction_id: tx.id,
      prompt_message: "Un prompt USSD a été envoyé sur votre téléphone. Veuillez saisir votre code PIN pour valider.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}