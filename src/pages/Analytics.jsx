import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { BarChart3, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

export default function Analytics() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await base44.entities.Transaction.list("-created_date", 500);
      setTxs(data);
      setLoading(false);
    })();
  }, []);

  const totalVolume = txs.reduce((s, t) => s + (t.amount_fiat || 0), 0);
  const usdtVolume = txs.reduce((s, t) => s + (t.usdt_amount || 0), 0);
  const successCount = txs.filter((t) => t.status === "COMPLETED").length;
  const successRate = txs.length ? Math.round((successCount / txs.length) * 100) : 0;

  const byCurrency = {};
  txs.forEach((t) => {
    const c = t.currency_fiat || "EUR";
    byCurrency[c] = (byCurrency[c] || 0) + (t.amount_fiat || 0);
  });
  const currencyData = Object.entries(byCurrency).map(([name, value]) => ({ name, value: Math.round(value) }));

  const byStatus = {};
  txs.forEach((t) => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  });
  const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: "Volume traité", value: totalVolume.toLocaleString("fr-FR") },
    { label: "Transactions", value: txs.length },
    { label: "Taux de succès", value: `${successRate}%` },
    { label: "USDT livré", value: usdtVolume.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader title="Analytics" description="Volume traité, taux de succès et répartition par devise." icon={BarChart3} />
      {loading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-display text-2xl font-semibold mt-1">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium mb-3">Volume par devise</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={currencyData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium mb-3">Répartition par statut</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}