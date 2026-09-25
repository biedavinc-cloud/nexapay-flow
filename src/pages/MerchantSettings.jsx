import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { auth } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { TIERS } from "@/lib/tiers";
import { Palette, Wallet, Upload, Building2, Check } from "lucide-react";

export default function MerchantSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: "", checkout_primary_color: "#6366F1", logo_url: "",
    receiving_wallet: "", blockchain: "POLYGON",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const me = await auth.me();
        if (!me.tenant_id) { navigate("/onboarding"); return; }
        const t = await base44.entities.Tenant.get(me.tenant_id);
        setTenant(t);
        setForm({
          company_name: t.company_name || "",
          checkout_primary_color: t.checkout_primary_color || "#6366F1",
          logo_url: t.logo_url || "",
          receiving_wallet: t.receiving_wallet || "",
          blockchain: t.blockchain || "POLYGON",
        });
      } catch (e) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      } finally { setLoading(false); }
    })();
  }, []);

  async function uploadLogo(file) {
    if (!file) return;
    setSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      set("logo_url", file_url);
    } catch (e) {
      toast({ title: "Échec upload", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function save() {
    setSaving(true);
    try {
      await base44.entities.Tenant.update(tenant.id, form);
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
                <Upload className="w-4 h-4" /> Téléverser un logo
                <input type="file" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
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