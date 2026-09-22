import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/lib/adminAudit";
import { RotateCw, Loader2 } from "lucide-react";

const STATUS_COLORS = {
  COMPLETED: "text-emerald-600 bg-emerald-50",
  PROCESSING_CRYPTO: "text-sky-600 bg-sky-50",
  PENDING: "text-amber-600 bg-amber-50",
  FIAT_APPROVED: "text-sky-600 bg-sky-50",
  FAILED: "text-red-600 bg-red-50",
};

export default function AdminTransactions() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [retrying, setRetrying] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await base44.entities.Transaction.list("-created_date", 300)); }
    catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const retry = async (tx) => {
    setRetrying(tx.id);
    try {
      const res = await base44.functions.invoke("retryTransaction", { transaction_id: tx.id });
      const data = res?.data || res;
      if (data?.status === "succeeded") {
        toast({ title: "Relance réussie", description: `TX ${data.crypto_tx_hash}` });
        await logAudit("retry_transaction", tx.tenant_id, { transaction_id: tx.id, result: "succeeded" });
      } else {
        toast({ title: "Relance échouée", description: data?.error || "Erreur", variant: "destructive" });
        await logAudit("retry_transaction_failed", tx.tenant_id, { transaction_id: tx.id, error: data?.error });
      }
      load();
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setRetrying(null); }
  };

  const shown = filter === "ALL" ? rows : rows.filter((t) => t.status === filter);

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold">Monitoring des transactions & liquidation</h1>
        <div className="flex flex-wrap gap-1">
          {["ALL", "COMPLETED", "PROCESSING_CRYPTO", "FAILED"].map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "ALL" ? "Toutes" : f}
            </Button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Chargement…</p> : (
        <div className="overflow-x-auto bg-card border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-3 font-medium">Référence</th>
                <th className="py-3 px-3 font-medium">Tenant</th>
                <th className="py-3 px-3 font-medium">Fiat</th>
                <th className="py-3 px-3 font-medium">Commission</th>
                <th className="py-3 px-3 font-medium">USDT net</th>
                <th className="py-3 px-3 font-medium">Provider</th>
                <th className="py-3 px-3 font-medium">Statut</th>
                <th className="py-3 px-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 align-top">
                  <td className="py-3 px-3 font-mono text-xs">{t.reference_fiat}<div className="text-[10px] text-muted-foreground">{(t.created_date || "").slice(0, 16)}</div></td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{t.tenant_id?.slice(0, 8) || "—"}</td>
                  <td className="py-3 px-3">{t.amount_fiat} {t.currency_fiat}</td>
                  <td className="py-3 px-3 text-emerald-600">{(t.nexapay_commission || 0).toFixed(2)}</td>
                  <td className="py-3 px-3 font-medium">{(t.usdt_net_sent || 0).toFixed(2)}</td>
                  <td className="py-3 px-3 text-xs">{t.crypto_provider || "—"}<div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{t.tx_hash_crypto || ""}</div></td>
                  <td className="py-3 px-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || ""}`}>{t.status}</span></td>
                  <td className="py-3 px-3">
                    {t.status === "FAILED" ? (
                      <Button size="sm" variant="outline" disabled={retrying === t.id} onClick={() => retry(t)}>
                        {retrying === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />} Relancer
                      </Button>
                    ) : t.error_message ? (
                      <span className="text-xs text-red-500 truncate max-w-[140px] block" title={t.error_message}>{t.error_message}</span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}