import React, { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/lib/adminAudit";
import { TIERS } from "@/lib/tiers";
import { Check, X, Pause, Play, Search, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

const STATUSES = ["PENDING_ONBOARDING", "AWAITING_APPROVAL", "APPROVED", "SUSPENDED", "REJECTED"];

export default function AdminTenants() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [limitEdits, setLimitEdits] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTenant, setNewTenant] = useState({
    company_name: "", country: "", tier: "PRO", receiving_wallet: "", blockchain: "POLYGON",
  });

  const load = async () => {
    setLoading(true);
    try {
      setRows(await db.Tenant.list("-created_date", 200));
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (t, patch, msg, action) => {
    try {
      await db.Tenant.update(t.id, patch);
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

  const createTenant = async () => {
    if (!newTenant.company_name.trim() || !newTenant.receiving_wallet.trim()) {
      toast({ title: "Nom et wallet requis", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const cfg = TIERS[newTenant.tier];
      const created = await db.Tenant.create({
        company_name: newTenant.company_name.trim(),
        country: newTenant.country.trim(),
        tier: newTenant.tier,
        has_paid_access: true,
        daily_limit: cfg.daily_limit,
        commission_rate: cfg.commission,
        account_status: "APPROVED",
        kyc_status: "APPROVED",
        receiving_wallet: newTenant.receiving_wallet.trim(),
        blockchain: newTenant.blockchain,
        onboarding_complete: true,
      });
      await logAudit("manual_tenant_create", created.id, { company_name: created.company_name });
      toast({ title: "Tenant créé", description: "Accès immédiat, sans onboarding ni KYC en ligne." });
      setCreateOpen(false);
      setNewTenant({ company_name: "", country: "", tier: "PRO", receiving_wallet: "", blockchain: "POLYGON" });
      load();
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const filtered = rows.filter((t) => (t.company_name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold">Gestion & validation des Tenants</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-8 w-64" />
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Nouveau tenant</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un tenant manuellement</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground -mt-2">
                Contourne l'onboarding et le KYC en ligne — accès immédiat. À utiliser pour un onboarding manuel vérifié hors-ligne.
              </p>
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label>Nom de l'entreprise</Label>
                  <Input value={newTenant.company_name} onChange={(e) => setNewTenant((f) => ({ ...f, company_name: e.target.value }))} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Pays</Label>
                  <Input value={newTenant.country} onChange={(e) => setNewTenant((f) => ({ ...f, country: e.target.value }))} placeholder="AE, FR, CM…" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Palier</Label>
                  <select
                    value={newTenant.tier}
                    onChange={(e) => setNewTenant((f) => ({ ...f, tier: e.target.value }))}
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {Object.values(TIERS).map((t) => (
                      <option key={t.id} value={t.id}>{t.label} — {t.commission}% commission</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Réseau</Label>
                  <select
                    value={newTenant.blockchain}
                    onChange={(e) => setNewTenant((f) => ({ ...f, blockchain: e.target.value }))}
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="POLYGON">Polygon</option>
                    <option value="TRC20">TRC20</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Wallet de réception (USDT)</Label>
                  <Input value={newTenant.receiving_wallet} onChange={(e) => setNewTenant((f) => ({ ...f, receiving_wallet: e.target.value }))} placeholder="0x… / T…" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createTenant} disabled={creating}>{creating ? "Création…" : "Créer"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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