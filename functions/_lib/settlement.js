// Shared: fiat-captured -> crypto payout, with merchant webhook events.
// Money-safety rules enforced here:
//  * every state change that gates a payout is an ATOMIC claim
//    (update ... where status in (...) returning *), so a status poll and a
//    PSP webhook racing on the same payment can never both pay out;
//  * "payment.succeeded" (customer paid) is decoupled from the crypto
//    payout outcome ("settlement.completed" / "settlement.failed") -- a
//    failed payout must never tell the merchant the customer's payment failed;
//  * a failed payout queues a retry; the captured fiat is never lost.
import { executeCryptoOrder, withExchangeKeys } from "./cryptoEngine.js";
import { signWebhook, decodePayload } from "./checkout.js";

export async function logTx(sql, tx, from, to, message, level = "INFO", actor = "system") {
  await sql`
    insert into nexapay_transaction_logs (id, transaction_id, reference_fiat, from_status, to_status, level, message, actor, created_date)
    values (gen_random_uuid()::text, ${tx.id}, ${tx.reference_fiat}, ${from || ""}, ${to}, ${level}, ${message}, ${actor}, now())
  `;
}

// Delivers `event` to every active endpoint of the transaction's tenant that
// subscribed to it, each signed with THAT endpoint's own secret (tenant
// isolation: one merchant's secret never signs another merchant's events).
export async function dispatchWebhooks(sql, env, tx, event, extra = {}) {
  if (!tx.tenant_id) return; // platform-level flow (e.g. onboarding fee): nothing to notify
  const meta = decodePayload(tx.payload_base64);
  const endpoints = await sql`select * from nexapay_webhook_endpoints where tenant_id = ${tx.tenant_id} and active = true`;
  const payload = {
    event, order_id: meta.order_id, transaction_id: tx.id, reference: tx.reference_fiat,
    amount: Number(tx.amount_fiat), currency: tx.currency_fiat, created: Math.floor(Date.now() / 1000), ...extra,
  };
  for (const ep of endpoints) {
    const subscribed = String(ep.events || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (subscribed.length && !subscribed.includes(event)) continue;
    const { raw, header } = await signWebhook(env, payload, ep.signing_secret);
    let httpStatus = 0, status = "FAILED", snippet = "";
    try {
      const res = await fetch(ep.url, {
        method: "POST", headers: { "Content-Type": "application/json", "NexaPay-Signature": header },
        body: raw, signal: AbortSignal.timeout(8000),
      });
      httpStatus = res.status; status = res.ok ? "SUCCESS" : "FAILED";
      snippet = (await res.text().catch(() => "")).slice(0, 300);
    } catch (e) { status = "RETRYING"; snippet = String(e.message || e).slice(0, 300); }
    await sql`insert into nexapay_webhook_logs (id, endpoint_url, event, order_id, status, http_status, attempts, response_snippet, created_date, updated_date)
              values (gen_random_uuid()::text, ${ep.url}, ${event}, ${meta.order_id || tx.id}, ${status}, ${httpStatus}, 1, ${snippet}, now(), now())`;
  }
}

// Fiat confirmed by the PSP. Caller has ALREADY atomically claimed FIAT_APPROVED.
export async function settleFiatCaptured(sql, env, { tx }) {
  await dispatchWebhooks(sql, env, tx, "payment.succeeded");
  return await payout(sql, env, tx);
}

// Crypto payout. Also used by admin retry. Atomic claim from
// FIAT_APPROVED (first attempt) or CRYPTO_FAILED (retry) -> PROCESSING_CRYPTO.
export async function payout(sql, env, tx, actor = "cryptoEngine") {
  const claimed = await sql`
    update nexapay_transactions set status = 'PROCESSING_CRYPTO', error_message = '', updated_date = now()
    where id = ${tx.id} and status in ('FIAT_APPROVED', 'CRYPTO_FAILED') returning *`;
  const cur = claimed[0];
  if (!cur) return { status: "PENDING", transaction_id: tx.id, reference: tx.reference_fiat }; // someone else is on it
  const usdtNet = cur.usdt_net_sent || cur.usdt_amount;
  await logTx(sql, cur, tx.status, "PROCESSING_CRYPTO", `Payout ${usdtNet} ${cur.asset || "USDT"} on ${cur.network} -> ${cur.destination_wallet}`, "INFO", actor);

  const cryptoEnv = await withExchangeKeys(sql, env);
  const purchase = await executeCryptoOrder(cryptoEnv, {
    amount: usdtNet, asset: cur.asset || "USDT", network: cur.network, wallet: cur.destination_wallet,
    fiatAmount: cur.amount_fiat, fiatCurrency: cur.currency_fiat,
  });

  if (purchase.provider) {
    await sql`update nexapay_transactions set status = 'COMPLETED', crypto_provider = ${purchase.provider}, tx_hash_crypto = ${purchase.tx_hash}, error_message = '', updated_date = now() where id = ${cur.id}`;
    await sql`update nexapay_crypto_retries set status = 'DONE', updated_date = now() where transaction_id = ${cur.id} and status = 'PENDING'`;
    await logTx(sql, cur, "PROCESSING_CRYPTO", "COMPLETED", `Payout delivered via ${purchase.provider} -- ${purchase.tx_hash}`, "INFO", actor);
    await dispatchWebhooks(sql, env, cur, "settlement.completed", {
      usdt: Number(cur.usdt_amount), usdt_net: Number(usdtNet), nexapay_commission: Number(cur.nexapay_commission || 0),
      network: cur.network, crypto_tx_hash: purchase.tx_hash,
    });
    return { status: "COMPLETED", transaction_id: cur.id, reference: cur.reference_fiat, crypto_provider: purchase.provider, crypto_tx_hash: purchase.tx_hash };
  }

  await sql`update nexapay_transactions set status = 'CRYPTO_FAILED', error_message = ${purchase.error}, updated_date = now() where id = ${cur.id}`;
  await logTx(sql, cur, "PROCESSING_CRYPTO", "CRYPTO_FAILED", purchase.error, "ERROR", actor);
  const existing = await sql`select id from nexapay_crypto_retries where transaction_id = ${cur.id} and status = 'PENDING' limit 1`;
  if (existing[0]) {
    await sql`update nexapay_crypto_retries set retry_count = retry_count + 1, last_error = ${purchase.error}, next_retry_at = now() + interval '15 minutes', updated_date = now() where id = ${existing[0].id}`;
  } else {
    await sql`insert into nexapay_crypto_retries (id, transaction_id, reference_fiat, retry_count, last_error, next_retry_at, status, created_date, updated_date)
              values (gen_random_uuid()::text, ${cur.id}, ${cur.reference_fiat}, 0, ${purchase.error}, now() + interval '5 minutes', 'PENDING', now(), now())`;
  }
  await dispatchWebhooks(sql, env, cur, "settlement.failed", { network: cur.network, error: "Settlement delayed; funds are safe and being retried." });
  return { status: "CRYPTO_FAILED", transaction_id: cur.id, reference: cur.reference_fiat, error: purchase.error };
}

// Fiat failed at the PSP: nothing was captured, nothing to pay out.
export async function markFailed(sql, tx, provider, reason, env) {
  const rows = await sql`update nexapay_transactions set status = 'FAILED', error_message = ${reason}, updated_date = now() where id = ${tx.id} and status in ('PENDING','INITIATED') returning *`;
  if (rows[0]) {
    await logTx(sql, tx, tx.status, "FAILED", reason, "WARN", provider.toLowerCase());
    if (env) await dispatchWebhooks(sql, env, rows[0], "payment.failed", { error: "Payment declined" });
  }
  return { status: "FAILED", transaction_id: tx.id, reference: tx.reference_fiat, error: reason };
}
