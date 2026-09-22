import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Settings as SettingsIcon, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROVIDERS = [
  { value: "KUCOIN", label: "KuCoin" },
  { value: "BINANCE", label: "Binance" },
  { value: "WEB3_DIRECT", label: "Web3 Direct" },
];
const MODES = [
  { value: "AUTO", label: "Automatique (fallback)" },
  { value: "LOWEST_FEE", label: "Frais les plus bas" },
  { value: "ROUND_ROBIN", label: "Round-robin" },
];

export default function SettingsPage() {
  const [defaultProvider, setDefaultProvider] = useState("KUCOIN");
  const [routingMode, setRoutingMode] = useState("AUTO");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await base44.entities.AppSetting.list("-created_date", 100);
      const map = Object.fromEntries(all.map((s) => [s.key, s]));
      if (map.default_provider) setDefaultProvider(map.default_provider.value);
      if (map.routing_mode) setRoutingMode(map.routing_mode.value);
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const all = await base44.entities.AppSetting.list("-created_date", 100);
    const upsert = async (key, value) => {
      const existing = all.find((s) => s.key === key);
      if (existing) await base44.entities.AppSetting.update(existing.id, { value });
      else await base44.entities.AppSetting.create({ key, value });
    };
    await upsert("default_provider", defaultProvider);
    await upsert("routing_mode", routingMode);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Paramètres"
        description="Fournisseur par défaut et logique de routage des paiements."
        icon={SettingsIcon}
      />
      <form onSubmit={save} className="rounded-xl border border-border bg-card p-6 space-y-5 max-w-md">
        <div className="space-y-2">
          <Label>Fournisseur par défaut</Label>
          <Select value={defaultProvider} onValueChange={setDefaultProvider}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Logique de routage</Label>
          <Select value={routingMode} onValueChange={setRoutingMode}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={saving} className="rounded-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
        {saved && <p className="text-sm text-emerald-600">Paramètres enregistrés.</p>}
      </form>
    </div>
  );
}