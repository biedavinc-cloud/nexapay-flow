import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/lib/adminAudit";
import { Save } from "lucide-react";

export default function AdminRates() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [globalMargin, setGlobalMargin] = useState(0);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [curs, settings] = await Promise.all([
        base44.entities.CurrencyConfig.list("-created_date", 50),
        base44.entities.AppSetting.list("-created_date", 100),
      ]);
      setRows(curs);
      setEdits(Object.fromEntries(curs.map((c) => [c.id, { enabled: c.enabled, auto_convert: c.auto_convert, min_threshold: c.min_threshold || 0, margin_pct: c.margin_pct || 0 }])));
      const gm = settings.find((s) => s.key === "global_margin_pct");
      setGlobalMargin(gm ? Number(gm.value) : 0);
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveGlobal = async () => {
    try {
      const existing = await base44.entities.AppSetting.list("-created_date", 100);
      const gm = existing.find((s) => s.key === "global_margin_pct");
      if (gm) await base44.entities.AppSetting.update(gm.id, { value: String(globalMargin) });
      else await base44.entities.AppSetting.create({ key: "global_margin_pct", value: String(globalMargin) });
      await logAudit("set_global_margin", null, { global_margin_pct: globalMargin });
      toast({ title: "Marge globale enregistrée", description: `${globalMargin}% appliqué sur le taux de change.` });
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const save = async (c) => {
    const patch = edits[c.id];
    try {
      await base44.entities.CurrencyConfig.update(c.id, patch);
      await logAudit("update_currency", null, { code: c.code, patch });
      toast({ title: `${c.code} mis à jour` });
      load();
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const set = (id, k, v) => setEdits((s) => ({ ...s, [id]: { ...s[id], [k]: v } }));

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <h1 className="text-2xl font-heading font-semibold">Gestion des taux & marges globales</h1>

      <div className="bg-card border border-border rounded-xl p-5 max-w-md">
        <h3 className="font-heading font-semibold">Marge globale Fiat/USDT</h3>
        <p className="text-sm text-muted-foreground mt-1">Spread NexaPay appliqué sur le taux de change, en plus des commissions par Plan.</p>
        <div className="flex items-end gap-3 mt-3">
          <div className="grid gap-1 flex-1">
            <Label>Marge (%)</Label>
            <Input type="number" step="0.1" value={globalMargin} onChange={(e) => setGlobalMargin(e.target.value)} />
          </div>
          <Button onClick={saveGlobal}><Save className="w-4 h-4" /> Enregistrer</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr>
              <th className="py-3 px-4 font-medium">Devise</th>
              <th className="py-3 px-4 font-medium">Libellé</th>
              <th className="py-3 px-4 font-medium">Activée</th>
              <th className="py-3 px-4 font-medium">Auto-convert</th>
              <th className="py-3 px-4 font-medium">Seuil min</th>
              <th className="py-3 px-4 font-medium">Marge %</th>
              <th className="py-3 px-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const e = edits[c.id] || {};
              return (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 font-medium">{c.code}</td>
                  <td className="py-3 px-4">{c.label}</td>
                  <td className="py-3 px-4"><input type="checkbox" checked={!!e.enabled} onChange={(ev) => set(c.id, "enabled", ev.target.checked)} /></td>
                  <td className="py-3 px-4"><input type="checkbox" checked={!!e.auto_convert} onChange={(ev) => set(c.id, "auto_convert", ev.target.checked)} /></td>
                  <td className="py-3 px-4"><Input type="number" value={e.min_threshold} onChange={(ev) => set(c.id, "min_threshold", ev.target.value)} className="h-8 w-24" /></td>
                  <td className="py-3 px-4"><Input type="number" step="0.1" value={e.margin_pct} onChange={(ev) => set(c.id, "margin_pct", ev.target.value)} className="h-8 w-24" /></td>
                  <td className="py-3 px-4"><Button size="sm" variant="outline" onClick={() => save(c)}><Save className="w-3.5 h-3.5" /></Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}