import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { waitUntil } from "base44:runtime";
import { executeCryptoOrder } from "../../shared/crypto.ts";
import { mirrorTransaction } from "../../shared/neon.ts";

// SuperAdmin manual retry of a FAILED transaction — re-runs the crypto execution
// engine and updates the transaction + audit trail. Admin-only.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const txId = body.transaction_id;
    if (!txId) return Response.json({ error: "transaction_id required" }, { status: 400 });

    const sr = base44.asServiceRole.entities;
    const tx = await sr.Transaction.get(txId);
    if (!tx) return Response.json({ error: "Transaction not found" }, { status: 404 });
    if (tx.status !== "FAILED") return Response.json({ error: "Seules les transactions FAILED peuvent être relancées." }, { status: 400 });

    await sr.TransactionLog.create({
      transaction_id: tx.id,
      reference_fiat: tx.reference_fiat,
      from_status: "FAILED",
      to_status: "PROCESSING_CRYPTO",
      level: "INFO",
      message: "Relance manuelle par SuperAdmin",
      actor: user.email || "admin",
    });
    await sr.Transaction.update(tx.id, { status: "PROCESSING_CRYPTO", error_message: "" });

    const purchase = await executeCryptoOrder({
      amount: tx.usdt_net_sent || tx.usdt_amount,
      asset: tx.asset || "USDT",
      network: tx.network,
      wallet: tx.destination_wallet,
      fiatAmount: tx.amount_fiat,
      fiatCurrency: tx.currency_fiat,
    });

    if (purchase.provider) {
      const done = await sr.Transaction.update(tx.id, {
        status: "COMPLETED",
        crypto_provider: purchase.provider,
        tx_hash_crypto: purchase.tx_hash,
        error_message: "",
      });
      await sr.TransactionLog.create({
        transaction_id: tx.id,
        reference_fiat: tx.reference_fiat,
        from_status: "PROCESSING_CRYPTO",
        to_status: "COMPLETED",
        level: "INFO",
        message: `Relance réussie via ${purchase.provider} — ${purchase.tx_hash}`,
        actor: user.email || "admin",
      });
      waitUntil(mirrorTransaction(done).catch(() => {}));
      return Response.json({ status: "succeeded", transaction_id: tx.id, crypto_provider: purchase.provider, crypto_tx_hash: purchase.tx_hash });
    }

    const failed = await sr.Transaction.update(tx.id, { status: "FAILED", error_message: purchase.error });
    await sr.TransactionLog.create({
      transaction_id: tx.id,
      reference_fiat: tx.reference_fiat,
      from_status: "PROCESSING_CRYPTO",
      to_status: "FAILED",
      level: "ERROR",
      message: `Relance échouée: ${purchase.error}`,
      actor: user.email || "admin",
    });
    waitUntil(mirrorTransaction(failed).catch(() => {}));
    return Response.json({ status: "failed", transaction_id: tx.id, error: purchase.error });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}