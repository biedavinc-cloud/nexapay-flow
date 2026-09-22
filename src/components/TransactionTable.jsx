import React from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

const methodLabel = (m) => m?.replace("_", " ");

function explorerUrl(hash) {
  if (!hash) return "";
  if (/^0x/i.test(hash)) return `https://etherscan.io/tx/${hash}`;
  return `https://tronscan.org/#/transaction/${hash}`;
}

export default function TransactionTable({ transactions, loading }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="p-8 text-center text-sm text-muted-foreground">Loading transactions…</div>
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">Route your first fiat → crypto payment to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium text-right">Fiat</th>
              <th className="px-4 py-3 font-medium text-right">USDT</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Tx hash</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const url = explorerUrl(tx.tx_hash_crypto);
              return (
                <tr
                  key={tx.id}
                  onClick={() => navigate(`/payments/${tx.id}`)}
                  className="cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/50 last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{tx.reference_fiat}</td>
                  <td className="px-4 py-3 text-foreground">{tx.client_name || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {Number(tx.amount_fiat).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                    <span className="text-muted-foreground">{tx.currency_fiat}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-400">
                    {Number(tx.usdt_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{methodLabel(tx.payment_method)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tx.crypto_provider}</td>
                  <td className="px-4 py-3">
                    {tx.tx_hash_crypto ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                      >
                        {tx.tx_hash_crypto.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}