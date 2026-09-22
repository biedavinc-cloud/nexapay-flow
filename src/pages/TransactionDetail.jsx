import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";

const PIPELINE = ["PENDING", "FIAT_APPROVED", "PROCESSING_CRYPTO", "COMPLETED"];

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm text-foreground ${mono ? "font-mono break-all" : ""}`}>{value || "—"}</p>
    </div>
  );
}

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    base44.entities.Transaction
      .get(id)
      .then((row) => active && setTx(row))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const copyHash = () => {
    if (tx?.tx_hash_crypto) {
      navigator.clipboard.writeText(tx.tx_hash_crypto);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading transaction…</div>;
  }

  if (!tx) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Transaction not found.</p>
        <Button variant="link" onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
      </div>
    );
  }

  const failed = tx.status === "FAILED";
  const activeStepIndex = failed ? PIPELINE.indexOf("PROCESSING_CRYPTO") : PIPELINE.indexOf(tx.status);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/dashboard")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight font-mono">{tx.reference_fiat}</h1>
          <p className="text-sm text-muted-foreground">{tx.client_name || "Anonymous client"}</p>
        </div>
        <StatusBadge status={tx.status} className="text-sm" />
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <h2 className="font-display text-base font-semibold mb-5">Execution pipeline</h2>
        <ol className="relative">
          {PIPELINE.map((step, i) => {
            const done = !failed && i <= activeStepIndex;
            const current = !failed && i === activeStepIndex && tx.status !== "COMPLETED";
            return (
              <li key={step} className="flex gap-3 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                      done
                        ? "bg-emerald-400/15 border-emerald-400/40 text-emerald-400"
                        : current
                        ? "bg-sky-400/15 border-sky-400/40 text-sky-400"
                        : "bg-secondary border-border text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className={`w-px h-8 mt-1 ${done ? "bg-emerald-400/40" : "bg-border"}`} />
                  )}
                </div>
                <div className="pt-0.5">
                  <p className={`text-sm font-medium ${done || current ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.replace("_", " ")}
                  </p>
                  {current && <p className="text-xs text-sky-400">In progress…</p>}
                </div>
              </li>
            );
          })}
        </ol>
        {failed && (
          <div className="mt-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-400">
            <span className="font-medium">Failed:</span> {tx.error_message || "Provider execution error."}
          </div>
        )}
      </div>

      {/* Details grid */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <h2 className="font-display text-base font-semibold mb-4">Transaction details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Fiat amount" value={`${Number(tx.amount_fiat).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${tx.currency_fiat}`} />
          <Field label="Exchange rate" value={`1 ${tx.currency_fiat} = ${Number(tx.exchange_rate).toFixed(4)} USDT`} />
          <Field label="USDT delivered" value={`${Number(tx.usdt_amount).toFixed(6)} USDT`} />
          <Field label="Payment method" value={tx.payment_method?.replace("_", " ")} />
          <Field label="Crypto provider" value={tx.crypto_provider} />
          <Field label="Created" value={tx.created_date ? new Date(tx.created_date).toLocaleString() : "—"} />
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Destination wallet</p>
            <p className="mt-1 text-sm text-foreground font-mono break-all">{tx.destination_wallet}</p>
          </div>
          {tx.tx_hash_crypto && (
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">On-chain tx hash</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-emerald-400 font-mono break-all">{tx.tx_hash_crypto}</p>
                <Button variant="ghost" size="sm" onClick={copyHash} className="shrink-0 px-2">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}