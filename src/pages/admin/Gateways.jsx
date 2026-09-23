import React, { useEffect, useState } from "react";
import { ShieldCheck, Loader2, Save, KeyRound } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { NexaMark } from "@/components/NexaPayLogo";

// Configurable PSP gateways. Monnify / Pawapay / Bizao are placeholders ready for keys.
const PROVIDERS = [
  { id: "KORAPAY", label: "Korapay", methods: "Carte", fields: [["public_key", "Public Key"], ["secret_key", "Secret Key"], ["encryption_key", "Encryption Key"]] },
  { id: "PAYUNIT", label: "PayUnit", methods: "Mobile Money", fields: [["api_user", "API User / App ID"], ["api_key", "API Key"], ["api_password", "API Password / Secret"]] },
  { id: "STRIPE", label: "Stripe", methods: "Carte", fields: [["publishable_key", "Publishable Key"], ["secret_key", "Secret Key"], ["webhook_secret", "Webhook Secret"]] },
  { id: "FLUTTERWAVE", label: "Flutterwave", methods: "Carte", fields: [["public_key", "Public Key"], ["secret_key", "Secret Key"], ["encryption_hash", "Encryption Hash"]] },
  { id: "PAYSTACK", label: "Paystack", methods: "Carte · Mobile Money", fields: [["public_key", "Public Key"], ["secret_key", "Secret Key"]] },
  { id: "MONNIFY", label: "Monnify", methods: "Carte · Mobile Money", fields: [["api_key", "API Key"], ["secret_key", "Secret Key"]] },
  { id: "PAWAPAY", label: "Pawapay", methods: "Mobile Money", fields: [["api_key", "API Key"], ["secret_key", "Secret Key"]] },
  { id: "BIZAO", label: "Bizao", methods: "Mobile Money", fields: [["api_key", "API Key"], ["secret_key", "Secret Key"]] },
];

export default function Gateways() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState({});
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await base44.functions.invoke("managePspConfig", { action: "list" });
      const d = r?.data || r;
      const map = {};
      (d.configs || []).forEach((c) => { map[c.provider] = c; });
      setConfigs(map);
      const dd = {};
      PROVIDERS.forEach((p) => {
        const c = map[p.id];
        dd[p.id] = {
          active: c?.active ?? false,
          environment: c?.environment ?? "sandbox",
          priority_card: c?.priority_card ?? 0,
          priority_momo: c?.priority_momo ?? 0,
          notes: c?.notes ?? "",
          creds: {},
        };
      });
      setDrafts(dd);
    } catch (e) {
      toast({ title: "Erreur de chargement", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id, patch) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  const setCred = (id, field, val) => setDrafts((d) => ({ ...d, [id]: { ...d[id], creds: { ...d[id].creds, [field]: val } } }));

  const save = async (p) => {
    setSaving(p.id);
    try {
      const dr = drafts[p.id];
      const creds = {};
      Object.entries(dr.creds).forEach(([k, v]) => {
        const s = String(v ?? "").trim();
        if (s && !s.includes("•")) creds[k] = s;
      });
      await base44.functions.invoke("managePspConfig", {
        action: "save", provider: p.id, active: dr.active, environment: dr.environment,
        priority_card: dr.priority_card, priority_momo: dr.priority_momo, notes: dr.notes, credentials: creds,
      });
      toast({ title: "Passerelle mise à jour", description: `${p.label} — ${dr.environment} · ${dr.active ? "Active" : "Inactive"}` });
      await load();
    } catch (e) {
      toast({ title: "Erreur d'enregistrement", description: e.message, variant: "destructive" });
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <NexaMark size={36} />
        <div>
          <h1 className="font-display text-2xl font-semibold">Passerelles & API Keys</h1>
          <p className="text-sm text-muted-foreground">Rotation dynamique des clés PSP — effet immédiat, sans redéploiement.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Clés chiffrées (AES-256-GCM) en base. Toute modification est appliquée en temps réel sur tous les endpoints de paiement NexaPay.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PROVIDERS.map((p) => {
          const cfg = configs[p.id];
          const dr = drafts[p.id] || { active: false, environment: "sandbox", priority_card: 0, priority_momo: 0, creds: {} };
          const masked = cfg?.masked_keys || {};
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <KeyRound className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold leading-tight">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground">{p.methods}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${dr.active ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-muted text-muted-foreground"}`}>
                    {dr.active ? "Active" : "Inactive"}
                  </span>
                  <Switch checked={dr.active} onCheckedChange={(v) => update(p.id, { active: v })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Environnement</Label>
                  <div className="flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
                    <button type="button" onClick={() => update(p.id, { environment: "sandbox" })} className={`flex-1 py-1 rounded-md transition-colors ${dr.environment === "sandbox" ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}>Sandbox</button>
                    <button type="button" onClick={() => update(p.id, { environment: "live" })} className={`flex-1 py-1 rounded-md transition-colors ${dr.environment === "live" ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}>Live</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Priorité Carte</Label>
                    <Input type="number" value={dr.priority_card} onChange={(e) => update(p.id, { priority_card: Number(e.target.value) })} className="h-8 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priorité MoMo</Label>
                    <Input type="number" value={dr.priority_momo} onChange={(e) => update(p.id, { priority_momo: Number(e.target.value) })} className="h-8 rounded-lg" />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {p.fields.map(([f, label]) => (
                  <div key={f} className="space-y-1">
                    <Label className="text-xs flex items-center justify-between">
                      {label}
                      {masked[f] && <span className="font-mono text-[10px] text-muted-foreground">{masked[f]}</span>}
                    </Label>
                    <Input
                      type="password"
                      placeholder={masked[f] ? `Enregistré — ${masked[f]}` : "Non configuré"}
                      value={dr.creds[f] || ""}
                      onChange={(e) => setCred(p.id, f, e.target.value)}
                      className="rounded-lg"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {cfg?.has_keys ? `Clés ${dr.environment} présentes` : "Aucune clé enregistrée"}
                </span>
                <Button onClick={() => save(p)} disabled={saving === p.id} className="rounded-full">
                  {saving === p.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}