import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { waitUntil } from "base44:runtime";
import {
  verifyClientSecret,
  extractBearer,
  signWebhook,
  genTransactionId,
  genReference,
  encodePayload,
  normText,
  resolveRate,
  normCurrency,
  resolveApiKey,
  resolveWebhookSecret,
} from "../../shared/checkout.ts";
import { executeCryptoOrder } from "../../shared/crypto.ts";
import { mirrorTransaction, mirrorLog } from "../../shared/neon.ts";
import { isUnlimited } from "../../shared/tiers.ts";

// NexaPay checkout endpoint — NO fiat PSP.
// Flow: client pays by CARD or MOBILE_MONEY → mock fiat capture → fiat converted to USDT
// (live CoinGecko rate) → DIRECT crypto purchase on the active exchange → withdrawn to our
// receiving wallet → signed webhook to the marketplace + full audit trail.

const VALID_NETWORKS = new Set(["TRC20", "ERC20", "POLYGON"]);
const VALID_METHODS = new Set(["CARD", "MOBILE_MONEY"]);

function luhnValid(num) {
  const n = (num || "").replace(/\D/g, "");
  if (n.length < 13) return false;
  let s = 0, alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = +n[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    s += d; alt = !alt;
  }
  return s % 10 === 0;
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
    const isSecret = auth.type === "secret";
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

    // Mock fiat capture — basic format validation only (no PSP / no Stripe).
    if (payment_method === "CARD") {
      if (!card || !luhnValid(card.number) || !/^\d{2}\/\d{2}$/.test(card.expiry || "") || !(card.cvc || "")) {
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

    // Daily limit enforcement (PRO = unlimited).
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

    // Receiving wallet: the platform default CryptoWallet (the Binance USDT wallet) receives ALL
    // crypto payouts, regardless of merchant — per the platform owner's configuration.
    let receivingWallet = "NEXAPAY-TONTINE-SERVICE";
    try {
      const wallets = await base44.asServiceRole.entities.CryptoWallet.list("-created_date", 20);
      const def = wallets.find((w) => w.chain === network && w.is_default) || wallets.find((w) => w.is_default) || wallets[0];
      if (def && def.address) receivingWallet = def.address;
    } catch { /* keep fallback */ }

    // Fiat → USDT (live CoinGecko rate, with offline fallback).
    const { rate, live } = await resolveRate(currency);
    let usdt = Math.round(amount * rate * 1e6) / 1e6;
    let globalMargin = 0;
    try {
      const settings = await base44.asServiceRole.entities.AppSetting.list("-created_date", 100);
      const gm = settings.find((s) => s.key === "global_margin_pct");
      if (gm && Number(gm.value)) globalMargin = Number(gm.value);
    } catch {}
    if (globalMargin > 0) usdt = Math.round(usdt * (1 - globalMargin / 100) * 1e6) / 1e6;

    const transaction_id = genTransactionId();
    const reference_fiat = genReference();
    const commissionRate = tenant ? (tenant.commission_rate || 0) : 0;
    const commissionUsdt = Math.round(usdt * commissionRate) / 100;
    const usdtNet = Math.round((usdt - commissionUsdt) * 1e6) / 1e6;

    const log = async (from, to, message, level = "INFO", actor = "system") => {
      const rec = await base44.asServiceRole.entities.TransactionLog.create({
        transaction_id, reference_fiat, from_status: from || "", to_status: to, level, message, actor,
      });
      waitUntil(mirrorLog(rec).catch(() => {}));
      return rec;
    };

    let tx = await base44.asServiceRole.entities.Transaction.create({
      reference_fiat,
      client_name: email || (payment_method === "CARD" ? card.name : `${momo.prefix}${momo.phone}`),
      amount_fiat: amount,
      currency_fiat: currency,
      usdt_amount: usdt,
      exchange_rate: rate,
      payment_method,
      crypto_provider: "KUCOIN",
      destination_wallet: receivingWallet,
      status: "PENDING",
      payload_base64: encodePayload({
        order_id,
        transaction_id,
        card: card ? { last4: (card.number || "").slice(-4) } : undefined,
        momo,
      }),
      tenant_id: tenantId || "",
      gateway_fee: 0,
      nexapay_commission: commissionUsdt,
      usdt_net_sent: usdtNet,
      asset: "USDT",
      network,
    });
    await log("", "PENDING", `Paiement ${payment_method} ${amount} ${currency} initié`);

    // Step 1 — mock fiat capture (no PSP).
    tx = await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FIAT_APPROVED" });
    await log("PENDING", "FIAT_APPROVED", `Encaissement ${payment_method} validé. Cible: ${usdt} USDT sur ${network}`, "INFO", "fiatCapture");

    // Step 2 — direct crypto purchase + withdraw to our wallet.
    tx = await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "PROCESSING_CRYPTO" });
    await log("FIAT_APPROVED", "PROCESSING_CRYPTO", `Achat ${usdtNet} USDT (net, commission ${commissionUsdt}) → retrait vers ${receivingWallet}`, "INFO", "cryptoEngine");

    // NexaPay buys USDT directly on its own exchange account (no third-party PSP), using the
    // client's fiat as the quote currency, then withdraws the USDT to NexaPay's default wallet.
    const purchase = await executeCryptoOrder({ amount: usdtNet, asset: "USDT", network, wallet: receivingWallet, fiatAmount: amount, fiatCurrency: currency });

    let webhookPayload;
    let response;
    if (purchase.provider) {
      tx = await base44.asServiceRole.entities.Transaction.update(tx.id, {
        status: "COMPLETED",
        crypto_provider: purchase.provider,
        tx_hash_crypto: purchase.tx_hash,
      });
      await log("PROCESSING_CRYPTO", "COMPLETED", `${usdtNet} USDT livré via ${purchase.provider}${purchase.live ? " (LIVE)" : " (mock dev)"} — ${purchase.tx_hash}`);
      webhookPayload = {
        event: "payment.succeeded",
        order_id,
        transaction_id,
        amount,
        currency,
        usdt,
        usdt_net: usdtNet,
        nexapay_commission: commissionUsdt,
        network,
        crypto_payout_status: "COMPLETED",
        crypto_provider: purchase.provider,
        crypto_tx_hash: purchase.tx_hash,
        live: !!purchase.live,
      };
      response = {
        status: "succeeded",
        transaction_id,
        usdt,
        usdt_net: usdtNet,
        nexapay_commission: commissionUsdt,
        crypto_provider: purchase.provider,
        crypto_tx_hash: purchase.tx_hash,
        live: !!purchase.live,
        rate_live: live,
      };
    } else {
      tx = await base44.asServiceRole.entities.Transaction.update(tx.id, {
        status: "FAILED",
        error_message: purchase.error,
      });
      await log("PROCESSING_CRYPTO", "FAILED", purchase.error, "ERROR", "cryptoEngine");
      webhookPayload = {
        event: "payment.failed",
        order_id,
        transaction_id,
        amount,
        currency,
        usdt,
        crypto_payout_status: "FAILED",
        error: purchase.error,
      };
      response = { status: "failed", transaction_id, error: purchase.error };
    }

    // Signed webhook to the marketplace + delivery log (signed with the endpoint's own secret).
    if (webhook_url) {
      const whSecret = await resolveWebhookSecret(base44, webhook_url);
      const { raw, header } = await signWebhook(webhookPayload, whSecret);
      waitUntil(
        (async () => {
          let httpStatus = 0;
          let deliveryStatus = "FAILED";
          try {
            const res = await fetch(webhook_url, {
              method: "POST",
              headers: { "Content-Type": "application/json", "NexaPay-Signature": header },
              body: raw,
            });
            httpStatus = res.status;
            deliveryStatus = res.ok ? "SUCCESS" : "FAILED";
          } catch {
            deliveryStatus = "RETRYING";
          }
          await base44.asServiceRole.entities.WebhookLog.create({
            endpoint_url: webhook_url,
            event: webhookPayload.event,
            order_id: order_id || transaction_id,
            status: deliveryStatus,
            http_status: httpStatus,
            attempts: 1,
            response_snippet: "",
          });
        })().catch(() => {})
      );
    }

    waitUntil(mirrorTransaction(tx).catch(() => {}));
    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}