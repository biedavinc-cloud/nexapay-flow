import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Percent, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function RateManagement() {
  const [margin, setMargin] = useState(1.5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await base44.entities.AppSetting.list("-created_date", 100);
      const m = all.find((s) => s.key === "margin_pct");
      if (m) setMargin(Number(m.value));
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const all = await base44.entities.AppSetting.list("-created_date", 100);
    const existing = all.find((s) => s.key === "margin_pct");
    if (existing) await base44.entities.AppSetting.update(existing.id, { value: String(margin) });
    else await base44.entities.AppSetting.create({ key: "margin_pct", value: String(margin) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Taux & marges"
        description="Marge appliquée sur le taux de change Fiat/USDT (ex. +1,5 %)."
        icon={Percent}
      />
      <form onSubmit={save} className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="margin">Marge (%)</Label>
          <Input id="margin" type="number" step="0.01" value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="rounded-xl" />
          <p className="text-xs text-muted-foreground">Appliquée au coût affiché au client lors de l'achat crypto.</p>
        </div>
        <Button type="submit" disabled={saving} className="rounded-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Enregistrer
        </Button>
        {saved && <p className="text-sm text-emerald-600">Marge enregistrée.</p>}
      </form>
    </div>
  );
}