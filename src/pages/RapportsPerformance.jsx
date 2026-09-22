import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { TrendingUp, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function RapportsPerformance() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await base44.entities.Transaction.list("-created_date", 500);
      setTxs(data);
      setLoading(false);
    })();
  }, []);

  const aggregate = (field) => {
    const map = {};
    txs.forEach((t) => {
      const k = t[field] || "—";
      if (!map[k]) map[k] = { total: 0, success: 0 };
      map[k].total++;
      if (t.status === "COMPLETED") map[k].success++;
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      total: v.total,
      rate: v.total ? Math.round((v.success / v.total) * 100) : 0,
    }));
  };
  const byProvider = aggregate("crypto_provider");
  const byMethod = aggregate("payment_method");

  const Table = ({ rows }) => (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-3 bg-secondary/50 text-xs font-medium px-3 py-2">
        <span>Libellé</span>
        <span className="text-right">Transactions</span>
        <span className="text-right">Taux</span>
      </div>
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-3 px-3 py-2 text-sm border-t border-border">
          <span>{r.name}</span>
          <span className="text-right">{r.total}</span>
          <span className="text-right font-medium">{r.rate}%</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Rapports de performance"
        description="Taux de succès par fournisseur crypto et par méthode de paiement."
        icon={TrendingUp}
      />
      {loading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium mb-3">Taux de succès par fournisseur crypto</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byProvider}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="rate" name="Taux %" radius={[6, 6, 0, 0]}>
                  {byProvider.map((_, i) => (
                    <Cell key={i} fill="#10b981" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4">
              <Table rows={byProvider} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium mb-3">Taux de succès par méthode de paiement</p>
            <Table rows={byMethod} />
          </div>
        </div>
      )}
    </div>
  );
}