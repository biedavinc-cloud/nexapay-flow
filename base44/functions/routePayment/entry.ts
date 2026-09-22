import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { waitUntil } from "base44:runtime";
import {
  genReference,
  genTransactionId,
  resolveRate,
  encodePayload,
  normText,
  signWebhook,
  resolveWebhookSecret,
} from "../../shared/checkout.ts";
import { executeCryptoOrder } from "../../shared/crypto.ts";
import { mirrorTransaction, mirrorLog } from "../../shared/neon.ts";

// NexaPay fiat -> crypto router (internal/dashboard).
// Quotes USDT at the live CoinGecko rate, executes a REAL direct crypto purchase + withdrawal
// via executeCryptoOrder (KuCoin/Binance/BingX/Coinbase with automatic fallback), drives the
// transaction through PENDING -> FIAT_APPROVED -> PROCESSING_CRYPTO -> COMPLETED/FAILED,
// writes a full TransactionLog audit trail, and fires a signed webhook when a target is set.

const VALID_METHODS = new Set(["MOBILE_MONEY", "CARD", "BANK_TRANSFER", "DIRECT_CRYPTO"]);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const client_name = normText(body.client_name).trim();
    const amount_fiat = Number(body.amount_fiat);
    const currency_fiat = (body.currency_fiat || "EUR").toString().toUpperCase();
    const payment_method = (body.payment_method || "").toString().toUpperCase();
    const destination_wallet = normText(body.destination_wallet).trim();
    const network = (body.network || "TRC20").toString().toUpperCase();
    const webhook_url = normText(body.webhook_url);

    if (!Number.isFinite(amount_fiat) || amount_fiat <= 0) {
      return Response.json({ error: "amount_fiat must be a positive number." }, { status: 400 });
    }
    if (!VALID_METHODS.has(payment_method)) {
      return Response.json({ error: "payment_method must be MOBILE_MONEY, CARD, BANK_TRANSFER or DIRECT_CRYPTO." }, { status: 400 });
    }
    if (!destination_wallet || destination_wallet.length < 6) {
      return Response.json({ error: "destination_wallet is required." }, { status: 400 });
    }

    const reference_fiat = genReference();
    const transaction_id = genTransactionId();
    const { rate, live } = await resolveRate(currency_fiat);
    const usdt_amount = Math.round(amount_fiat * rate * 1e6) / 1e6;

    const log = async (from, to, message, level = "INFO", actor = "system") => {
      const rec = await base44.asServiceRole.entities.TransactionLog.create({
        transaction_id, reference_fiat, from_status: from || "", to_status: to, level, message, actor,
      });
      waitUntil(mirrorLog(rec).catch(() => {}));
      return rec;
    };

    let tx = await base44.asServiceRole.entities.Transaction.create({
      reference_fiat,
      client_name,
      amount_fiat,
      currency_fiat,
      usdt_amount,
      exchange_rate: rate,
      payment_method,
      crypto_provider: "KUCOIN",
      destination_wallet,
      status: "PENDING",
      payload_base64: encodePayload({ client_name, amount_fiat, currency_fiat, payment_method, transaction_id }),
      asset: "USDT",
      network,
    });
    await log("", "PENDING", `Paiement ${payment_method} ${amount_fiat} ${currency_fiat} initié`, "INFO", user.full_name || user.email || "admin");

    tx = await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "FIAT_APPROVED" });
    await log("PENDING", "FIAT_APPROVED", `Encaissement validé. Cible: ${usdt_amount} USDT sur ${network}`, "INFO", "fiatCapture");

    tx = await base44.asServiceRole.entities.Transaction.update(tx.id, { status: "PROCESSING_CRYPTO" });
    await log("FIAT_APPROVED", "PROCESSING_CRYPTO", `Achat ${usdt_amount} USDT -> retrait vers ${destination_wallet}`, "INFO", "cryptoEngine");

    const purchase = await executeCryptoOrder({
      amount: usdt_amount,
      asset: "USDT",
      network,
      wallet: destination_wallet,
      fiatAmount: amount_fiat,
      fiatCurrency: currency_fiat,
    });

    let response;
    let webhookPayload;
    if (purchase.provider) {
      tx = await base44.asServiceRole.entities.Transaction.update(tx.id, {
        status: "COMPLETED",
        crypto_provider: purchase.provider,
        tx_hash_crypto: purchase.tx_hash,
      });
      await log("PROCESSING_CRYPTO", "COMPLETED", `${usdt_amount} USDT livre via ${purchase.provider}${purchase.live ? " (LIVE)" : " (mock dev)"} - ${purchase.tx_hash}`);
      webhookPayload = {
        event: "payment.succeeded",
        transaction_id,
        amount: amount_fiat,
        currency: currency_fiat,
        usdt: usdt_amount,
        network,
        crypto_provider: purchase.provider,
        crypto_tx_hash: purchase.tx_hash,
        live: !!purchase.live,
        rate_live: live,
      };
      response = { status: "COMPLETED", transaction_id, crypto_provider: purchase.provider, crypto_tx_hash: purchase.tx_hash, usdt_amount, live: !!purchase.live, rate_live: live };
    } else {
      tx = await base44.asServiceRole.entities.Transaction.update(tx.id, {
        status: "FAILED",
        error_message: purchase.error,
      });
      await log("PROCESSING_CRYPTO", "FAILED", purchase.error, "ERROR", "cryptoEngine");
      webhookPayload = {
        event: "payment.failed",
        transaction_id,
        amount: amount_fiat,
        currency: currency_fiat,
        usdt: usdt_amount,
        error: purchase.error,
      };
      response = { status: "FAILED", transaction_id, error: purchase.error };
    }

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
            order_id: transaction_id,
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