import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { TIERS } from "@/lib/tiers";
import { Palette, Wallet, Upload, Building2, Check } from "lucide-react";

const MAX_LOGO_BYTES = 300 * 1024; // 300KB -- stored as a data URI, no external storage configured

export default function MerchantSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: "", checkout_primary_color: "#6366F1", logo_url: "",
    receiving_wallet: "", blockchain: "POLYGON", statement_descriptor: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const me = await auth.me();
        if (!me.tenant_id) { navigate("/onboarding"); return; }
        const res = await fetch("/api/merchant/tenant", { credentials: "include" });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to load");
        const t = d.tenant;
        setTenant(t);
        setForm({
          company_name: t.company_name || "",
          checkout_primary_color: t.checkout_primary_color || "#6366F1",
          logo_url: t.logo_url || "",
          receiving_wallet: t.receiving_wallet || "",
          blockchain: t.blockchain || "POLYGON",
          statement_descriptor: t.statement_descriptor || "",
        });
      } catch (e) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      } finally { setLoading(false); }
    })();
  }, []);

  async function uploadLogo(file) {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast({ title: "Fichier trop volumineux", description: "300 Ko maximum.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logo_url", reader.result);
    reader.onerror = () => toast({ title: "Échec de lecture du fichier", variant: "destructive" });
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/merchant/tenant", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      toast({ title: "Paramètres enregistrés" });
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  if (loading) return <div className="p-10 text-center text-muted-foreground">Chargement…</div>;
  if (!tenant) return null;
  const tier = TIERS[tenant.tier] || TIERS.BASIC;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold">Paramètres marchand</h1>
        <p className="text-muted-foreground text-sm">Personnalisez votre module de checkout</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-4 h-4" /> Identité</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Entreprise</Label>
            <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Statement Descriptor (relevé bancaire du client, 10 car. max)</Label>
            <Input
              value={form.statement_descriptor}
              onChange={(e) => set("statement_descriptor", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              placeholder={form.company_name ? form.company_name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) : "NEXAPAY"}
            />
            <p className="text-xs text-muted-foreground">
              Aperçu : <span className="font-mono">NXP* {form.statement_descriptor || (form.company_name || "NEXAPAY").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground">Tier {tier.label}</span>
            <span className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">Commission {tier.commission}%</span>
            <span className={`px-2.5 py-1 rounded-full ${tenant.has_paid_access ? "bg-primary text-primary-foreground" : "bg-destructive/10 text-destructive"}`}>
              {tenant.has_paid_access ? "Accès actif" : "Accès bloqué"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="w-4 h-4" /> Branding du Widget</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Couleur principale</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.checkout_primary_color} onChange={(e) => set("checkout_primary_color", e.target.value)} className="w-9 h-9 rounded-md border border-input cursor-pointer" />
              <Input value={form.checkout_primary_color} onChange={(e) => set("checkout_primary_color", e.target.value)} />
              <Button style={{ background: form.checkout_primary_color }} className="text-white">Aperçu</Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Logo</Label>
            {form.logo_url ? (
              <div className="flex items-center gap-3">
                <img src={form.logo_url} alt="logo" className="h-10 rounded border border-border" />
                <Button variant="outline" size="sm" onClick={() => set("logo_url", "")}>Retirer</Button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer px-3 py-2 border-2 border-dashed border-border rounded-md">
                <Upload className="w-4 h-4" /> Téléverser un logo (300 Ko max)
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wallet className="w-4 h-4" /> Portefeuille de réception</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Adresse USDT</Label>
            <Input value={form.receiving_wallet} onChange={(e) => set("receiving_wallet", e.target.value)} placeholder="0x... / T..." />
          </div>
          <div className="grid gap-2">
            <Label>Réseau</Label>
            <select value={form.blockchain} onChange={(e) => set("blockchain", e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="POLYGON">Polygon</option>
              <option value="TRC20">TRC20</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Check className="w-4 h-4" /> Enregistrer
        </Button>
      </div>
    </div>
  );
}
