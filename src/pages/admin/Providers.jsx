import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/lib/adminAudit";
import { Save, Star } from "lucide-react";

export default function AdminProviders() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const r = await base44.entities.ProviderConfig.list("-created_date", 50);
      setRows(r);
      setEdits(Object.fromEntries(r.map((x) => [x.id, { enabled: x.enabled, is_default: x.is_default, status: x.status, withdrawals_enabled: x.withdrawals_enabled, notes: x.notes || "" }])));
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (p) => {
    const patch = edits[p.id];
    if (!patch) return;
    try {
      if (patch.is_default) {
        // only one primary: clear others
        for (const o of rows) if (o.id !== p.id && o.is_default) await base44.entities.ProviderConfig.update(o.id, { is_default: false });
      }
      await base44.entities.ProviderConfig.update(p.id, patch);
      await logAudit("update_provider", null, { provider: p.provider, patch });
      toast({ title: "Fournisseur mis à jour" });
      load();
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const set = (id, k, v) => setEdits((s) => ({ ...s, [id]: { ...s[id], [k]: v } }));

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-semibold">Console fournisseurs & trésorerie crypto</h1>
        <p className="text-sm text-muted-foreground mt-1">Smart Router — Primary: KuCoin ➔ Secondary: Binance ➔ Web3 RPC Direct. Activez/désactivez à chaud et définissez le fournisseur principal.</p>
      </div>

      {loading ? <p className="text-muted-foreground">Chargement…</p> : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((p) => {
            const e = edits[p.id] || {};
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-heading font-semibold flex items-center gap-2">{p.provider} {p.is_default && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}</div>
                    <div className="text-xs text-muted-foreground">{p.label}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.is_default ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{e.is_default ? "PRIMAIRE" : "fallback"}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!e.enabled} onChange={(ev) => set(p.id, "enabled", ev.target.checked)} /> Activé</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!e.withdrawals_enabled} onChange={(ev) => set(p.id, "withdrawals_enabled", ev.target.checked)} /> Retraits</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!e.is_default} onChange={(ev) => set(p.id, "is_default", ev.target.checked)} /> Primaire (router)</label>
                  <select value={e.status} onChange={(ev) => set(p.id, "status", ev.target.value)} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                    {["OPERATIONAL", "DEGRADED", "DOWN", "DISABLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Input value={e.notes || ""} onChange={(ev) => set(p.id, "notes", ev.target.value)} placeholder="Notes (clé API label, etc.)" />
                <Button size="sm" onClick={() => save(p)}><Save className="w-4 h-4" /> Enregistrer</Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold mb-1">Balances & trésorerie</h3>
        <p className="text-sm text-muted-foreground">Affichage des soldes disponibles sur chaque exchange / portefeuille de liquidation. Branchement des APIs balances (KuCoin/Binance) requis pour des chiffres live — en attendant, gérez les clés API ci-dessus.</p>
      </div>
    </div>
  );
}