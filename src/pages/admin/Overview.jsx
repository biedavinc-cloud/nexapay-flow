import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Building2, CheckCircle2, Coins, ArrowLeftRight, Database, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIERS } from "@/lib/tiers";

const COLORS = ["#3BB77E", "#081735", "#007AFF", "#f59e0b"];

export default function AdminOverview() {
  const [d, setD] = useState(null);
  const [neon, setNeon] = useState(null);
  const [neonBusy, setNeonBusy] = useState(false);
  const [neonErr, setNeonErr] = useState("");

  const syncNeon = async () => {
    setNeonBusy(true); setNeonErr("");
    try {
      const res = await base44.functions.invoke("syncNeon", {});
      const r = res?.data || res;
      if (r?.error) throw new Error(r.error);
      setNeon(r);
    } catch (e) {
      setNeonErr(e.message || "Erreur");
    } finally {
      setNeonBusy(false);
    }
  };

  useEffect(() => {
    (async () => {
      const txs = await base44.entities.Transaction.list("-created_date", 500);
      const tenants = await base44.entities.Tenant.list("-created_date", 500);
      const volume = txs.reduce((a, t) => a + (t.amount_fiat || 0), 0);
      const usdt = txs.reduce((a, t) => a + (t.usdt_amount || 0), 0);
      const commission = txs.reduce((a, t) => a + (t.nexapay_commission || 0), 0);
      const accessRevenue = tenants.reduce((a, t) => a + (TIERS[t.tier]?.price || 0), 0);
      const active = tenants.filter((t) => t.account_status === "APPROVED").length;
      const pending = tenants.filter((t) => t.account_status !== "APPROVED").length;
      const completed = txs.filter((t) => t.status === "COMPLETED").length;
      const success = txs.length ? Math.round((completed / txs.length) * 100) : 0;

      const days = {};
      txs.forEach((t) => {
        const k = (t.created_date || "").slice(0, 10);
        days[k] = (days[k] || 0) + (t.amount_fiat || 0);
      });
      const daily = Object.entries(days).sort().slice(-7).map(([k, v]) => ({ day: k.slice(5), volume: Math.round(v) }));

      const planRev = Object.values(TIERS).map((tier) => ({
        name: tier.label,
        value: tenants.filter((t) => t.tier === tier.id).length * tier.price,
      }));

      const pm = {};
      txs.forEach((t) => { pm[t.payment_method] = (pm[t.payment_method] || 0) + (t.amount_fiat || 0); });
      const pmData = Object.entries(pm).map(([k, v]) => ({ name: k, value: Math.round(v) }));

      setD({ volume, usdt, commission, accessRevenue, revenue: commission + accessRevenue, active, pending, success, totalTx: txs.length, daily, planRev, pmData });
    })();
  }, []);

  if (!d) return <div className="p-8 text-muted-foreground">Chargement des métriques…</div>;

  const KPI = ({ icon: Icon, label, value }) => (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon className="h-4 w-4" /> {label}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold">Vue d'ensemble & métriques globales</h1>
        <Button onClick={syncNeon} disabled={neonBusy} className="rounded-xl">
          {neonBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
          Synchroniser vers Neon
        </Button>
      </div>
      {neonErr && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{neonErr}</div>}
      {neon?.ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 flex items-center gap-2 flex-wrap">
          <CheckCircle2 className="h-4 w-4" /> Miroir Neon terminé
          <span className="text-emerald-600/80 text-xs">· {neon.version}</span>
          <span className="text-xs text-emerald-600/80">· {Object.entries(neon.counts).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={DollarSign} label="Volume traité (fiat)" value={`$${d.volume.toLocaleString()}`} />
        <KPI icon={Coins} label="USDT livré" value={d.usdt.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <KPI icon={TrendingUp} label="Revenus NexaPay" value={`$${d.revenue.toLocaleString()}`} />
        <KPI icon={CheckCircle2} label="Taux de succès" value={`${d.success}%`} />
        <KPI icon={Building2} label="Tenants actifs" value={d.active} />
        <KPI icon={Building2} label="Tenants en attente" value={d.pending} />
        <KPI icon={ArrowLeftRight} label="Transactions totales" value={d.totalTx} />
        <KPI icon={DollarSign} label="Frais d'accès perçus" value={`$${d.accessRevenue.toLocaleString()}`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold mb-4">Volume quotidien (7 derniers jours)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.daily}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="volume" fill="#3BB77E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold mb-4">Revenus par Plan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={d.planRev} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {d.planRev.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h3 className="font-heading font-semibold mb-4">Volume par méthode de paiement fiat</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.pmData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#081735" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}