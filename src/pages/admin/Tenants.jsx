import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/lib/adminAudit";
import { TIERS } from "@/lib/tiers";
import { Check, X, Pause, Play, Search } from "lucide-react";

const STATUSES = ["PENDING_ONBOARDING", "AWAITING_APPROVAL", "APPROVED", "SUSPENDED", "REJECTED"];

export default function AdminTenants() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [limitEdits, setLimitEdits] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      setRows(await base44.entities.Tenant.list("-created_date", 200));
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (t, patch, msg, action) => {
    try {
      await base44.entities.Tenant.update(t.id, patch);
      await logAudit(action || msg, t.id, { before: { account_status: t.account_status, tier: t.tier, daily_limit: t.daily_limit }, after: patch });
      toast({ title: msg });
      load();
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const changeTier = (t, tier) => {
    const cfg = TIERS[tier];
    act(t, { tier, commission_rate: cfg.commission, daily_limit: cfg.daily_limit }, `Tier → ${cfg.label}`, `tier_change:${tier}`);
  };

  const saveLimit = (t) => {
    const v = Number(limitEdits[t.id]);
    if (!Number.isFinite(v) || v <= 0) { toast({ title: "Limite invalide", variant: "destructive" }); return; }
    act(t, { daily_limit: v }, "Limite quotidienne ajustée", "limit_override");
  };

  const filtered = rows.filter((t) => (t.company_name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold">Gestion & validation des Tenants</h1>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-8 w-64" />
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Chargement…</p> : filtered.length === 0 ? (
        <p className="text-muted-foreground">Aucun tenant.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-heading font-semibold">{t.company_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.phone || "—"} · Statut: <span className="font-medium">{t.account_status}</span> · KYC: {t.kyc_status}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: {t.id_name || "—"} ({t.id_number || "—"}) · Wallet: {t.receiving_wallet || "—"} ({t.blockchain})
                  </div>
                  {(t.kyc_doc_url || t.selfie_url) && (
                    <div className="flex gap-3 mt-2 text-xs">
                      {t.kyc_doc_url && <a href={t.kyc_doc_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Voir pièce d'identité</a>}
                      {t.selfie_url && <a href={t.selfie_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Voir selfie</a>}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => act(t, { account_status: "APPROVED", has_paid_access: true, kyc_status: "APPROVED" }, "Marchand approuvé", "approve_tenant")}><Check className="w-4 h-4" /> Approuver</Button>
                  <Button size="sm" variant="outline" onClick={() => act(t, { account_status: "REJECTED", kyc_status: "REJECTED" }, "Marchand refusé", "reject_tenant")}><X className="w-4 h-4" /> Refuser</Button>
                  {t.account_status === "SUSPENDED"
                    ? <Button size="sm" variant="outline" onClick={() => act(t, { account_status: "APPROVED" }, "Marchand réactivé", "unsuspend_tenant")}><Play className="w-4 h-4" /> Réactiver</Button>
                    : <Button size="sm" variant="outline" onClick={() => act(t, { account_status: "SUSPENDED" }, "Marchand suspendu", "suspend_tenant")}><Pause className="w-4 h-4" /> Suspendre</Button>}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4 mt-4 pt-4 border-t border-border">
                <div className="grid gap-1">
                  <Label className="text-xs">Plan</Label>
                  <select value={t.tier} onChange={(e) => changeTier(t, e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                    {Object.values(TIERS).map((x) => <option key={x.id} value={x.id}>{x.label} ({x.commission}%)</option>)}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Limite quotidienne ($)</Label>
                  <div className="flex gap-2">
                    <Input value={limitEdits[t.id] ?? t.daily_limit} onChange={(e) => setLimitEdits((s) => ({ ...s, [t.id]: e.target.value }))} className="h-8 w-32" />
                    <Button size="sm" variant="outline" onClick={() => saveLimit(t)}>Appliquer</Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground ml-auto">
                  Commission: <span className="font-medium text-foreground">{t.commission_rate}%</span> · Couleur: <span className="inline-block w-4 h-4 rounded align-middle border border-border" style={{ background: t.checkout_primary_color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}