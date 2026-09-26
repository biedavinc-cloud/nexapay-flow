// Shared: crypto payout + webhook dispatch once fiat is confirmed captured.
// Used by both the Korapay and PayUnit settlement paths.
import { executeCryptoOrder } from "./cryptoEngine.js";
import { signWebhook, resolveWebhookSecret, decodePayload } from "./checkout.js";

export async function logTx(sql, tx, from, to, message, level = "INFO", actor = "system") {
  await sql`
    insert into nexapay_transaction_logs (id, transaction_id, reference_fiat, from_status, to_status, level, message, actor, created_date)
    values (gen_random_uuid()::text, ${tx.id}, ${tx.reference_fiat}, ${from || ""}, ${to}, ${level}, ${message}, ${actor}, now())
  `;
}

// tx must already be FIAT captured (caller verified with the real PSP). Buys
// + withdraws USDT, updates the transaction, dispatches the merchant webhook,
// and queues a CryptoRetry (fiat stays safe) if the payout itself fails.
export async function settleFiatCaptured(sql, env, { tx, provider }) {
  const meta = decodePayload(tx.payload_base64);
  const usdtNet = tx.usdt_net_sent || tx.usdt_amount;
  const commissionUsdt = tx.nexapay_commission || 0;
  const receivingWallet = tx.destination_wallet;
  const network = tx.network;
  const order_id = meta.order_id;
  const webhook_url = meta.webhook_url;

  await sql`update nexapay_transactions set status = 'PROCESSING_CRYPTO', updated_date = now() where id = ${tx.id}`;
  await logTx(sql, tx, tx.status, "PROCESSING_CRYPTO", `Buying ${usdtNet} USDT (commission ${commissionUsdt}) -> withdraw to ${receivingWallet}`, "INFO", "cryptoEngine");

  const purchase = await executeCryptoOrder(env, { amount: usdtNet, asset: "USDT", network, wallet: receivingWallet, fiatAmount: tx.amount_fiat, fiatCurrency: tx.currency_fiat });

  let webhookPayload, resultStatus;
  if (purchase.provider) {
    await sql`update nexapay_transactions set status = 'COMPLETED', crypto_provider = ${purchase.provider}, tx_hash_crypto = ${purchase.tx_hash}, updated_date = now() where id = ${tx.id}`;
    await logTx(sql, tx, "PROCESSING_CRYPTO", "COMPLETED", `${usdtNet} USDT delivered via ${purchase.provider}${purchase.live ? " (LIVE)" : ""} -- ${purchase.tx_hash}`);
    webhookPayload = { event: "payment.succeeded", order_id, transaction_id: tx.id, reference: tx.reference_fiat, amount: tx.amount_fiat, currency: tx.currency_fiat, usdt: tx.usdt_amount, usdt_net: usdtNet, nexapay_commission: commissionUsdt, network, crypto_payout_status: "COMPLETED", crypto_provider: purchase.provider, crypto_tx_hash: purchase.tx_hash, live: !!purchase.live };
    resultStatus = "COMPLETED";
  } else {
    // Crypto payout failed -- fiat was already captured by the PSP, so funds
    // are NOT lost. Queue a retry instead of marking the whole payment failed.
    await sql`update nexapay_transactions set status = 'CRYPTO_FAILED', error_message = ${purchase.error}, updated_date = now() where id = ${tx.id}`;
    await logTx(sql, tx, "PROCESSING_CRYPTO", "CRYPTO_FAILED", purchase.error, "ERROR", "cryptoEngine");
    const nextRetry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await sql`insert into nexapay_crypto_retries (id, transaction_id, reference_fiat, retry_count, last_error, next_retry_at, status, created_date) values (gen_random_uuid()::text, ${tx.id}, ${tx.reference_fiat}, 0, ${purchase.error}, ${nextRetry}, 'PENDING', now())`;
    webhookPayload = { event: "payment.failed", order_id, transaction_id: tx.id, reference: tx.reference_fiat, amount: tx.amount_fiat, currency: tx.currency_fiat, usdt: tx.usdt_amount, crypto_payout_status: "CRYPTO_FAILED", error: purchase.error };
    resultStatus = "CRYPTO_FAILED";
  }

  if (webhook_url) {
    const whSecret = await resolveWebhookSecret(sql, env, webhook_url);
    const { raw, header } = await signWebhook(env, webhookPayload, whSecret);
    let httpStatus = 0, deliveryStatus = "FAILED";
    try {
      const res = await fetch(webhook_url, { method: "POST", headers: { "Content-Type": "application/json", "NexaPay-Signature": header }, body: raw });
      httpStatus = res.status;
      deliveryStatus = res.ok ? "SUCCESS" : "FAILED";
    } catch { deliveryStatus = "RETRYING"; }
    await sql`insert into nexapay_webhook_logs (id, endpoint_url, event, order_id, status, http_status, attempts, response_snippet, created_date) values (gen_random_uuid()::text, ${webhook_url}, ${webhookPayload.event}, ${order_id || tx.id}, ${deliveryStatus}, ${httpStatus}, 1, '', now())`;
  }

  return { status: resultStatus, transaction_id: tx.id, reference: tx.reference_fiat, crypto_provider: purchase.provider, crypto_tx_hash: purchase.tx_hash, error: purchase.error };
}

export async function markFailed(sql, tx, provider, reason) {
  await sql`update nexapay_transactions set status = 'FAILED', error_message = ${reason}, updated_date = now() where id = ${tx.id}`;
  await logTx(sql, tx, tx.status, "FAILED", reason, "WARN", provider.toLowerCase());
  return { status: "FAILED", transaction_id: tx.id, reference: tx.reference_fiat, error: reason };
}
