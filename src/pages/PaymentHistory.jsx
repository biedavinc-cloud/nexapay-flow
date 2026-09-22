import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { History, Loader2, ExternalLink } from "lucide-react";

function explorerUrl(hash) {
  if (!hash) return "";
  if (/^0x/i.test(hash)) return `https://etherscan.io/tx/${hash}`;
  return `https://tronscan.org/#/transaction/${hash}`;
}

export default function PaymentHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await base44.entities.Transaction.list("-created_date", 200);
      setRows(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Journal des paiements"
        description="Suivi détaillé : ordre → achat crypto → statut webhook."
        icon={History}
      />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucune transaction.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Référence</th>
                  <th className="px-4 py-3 font-medium">Ordre</th>
                  <th className="px-4 py-3 font-medium">Réseau</th>
                  <th className="px-4 py-3 font-medium">Exchange</th>
                  <th className="px-4 py-3 font-medium">Tx hash</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const url = explorerUrl(t.tx_hash_crypto);
                  return (
                    <tr key={t.id} className="border-b border-border/60 hover:bg-accent/40">
                      <td className="px-4 py-3 font-mono text-xs">{t.reference_fiat}</td>
                      <td className="px-4 py-3 font-medium">{Number(t.amount_fiat)} {t.currency_fiat || t.asset}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.network || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.crypto_provider}</td>
                      <td className="px-4 py-3">
                        {t.tx_hash_crypto ? (
                          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
                            {t.tx_hash_crypto.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_date).toLocaleString("fr-FR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}