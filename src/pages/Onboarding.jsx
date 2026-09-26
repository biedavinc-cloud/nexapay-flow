import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { auth } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { TIERS } from "@/lib/tiers";
import { Check, ChevronRight, ChevronLeft, Upload, Palette, Wallet, ShieldCheck, Building2, Lock, CreditCard, Smartphone, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { CountrySelect, DialCodeSelect } from "@/components/CountrySelect";
import CardFields from "@/components/checkout/CardFields";
import MoMoFields from "@/components/checkout/MoMoFields";
import ThreeDSModal from "@/components/checkout/ThreeDSModal";
import UssdPromptModal from "@/components/checkout/UssdPromptModal";

const BG = "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/a6fcd431d_stux-euro-400249_1920.jpg";

const STEPS = [
  { key: "profile", label: "Profil", icon: Building2 },
  { key: "access", label: "Accès", icon: Lock },
  { key: "kyc", label: "Conformité", icon: ShieldCheck },
  { key: "config", label: "Configuration", icon: Palette },
];

export default function Onboarding() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    company_name: "", country: "", city: "", business_activity: "",
    phone_prefix: "+237", phone_local: "", phone: "",
    otp_optional: false, otp_code: "",
    tier: "BASIC", has_paid_access: false,
    id_number: "", id_name: "", kyc_doc_url: "", selfie_url: "",
    receiving_wallet: "", blockchain: "POLYGON",
    checkout_primary_color: "#6366F1", logo_url: "",
    card_number: "", card_expiry: "", card_cvc: "", card_name: "",
    access_method: "CARD", momo_country: "", momo_prefix: "+237", momo_provider: "", momo_phone: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [pubKey, setPubKey] = useState(null);
  React.useEffect(() => {
    base44.functions.invoke("getPublishableKey", {}).then((res) => {
      const d = res?.data || res;
      if (d?.publishable_key) setPubKey(d.publishable_key);
    }).catch(() => {});
  }, []);
  const [threeDS, setThreeDS] = useState(null); // { url, reference }
  const [ussd, setUssd] = useState(null); // { reference }

  function finishPayment(status, extra = {}) {
    setThreeDS(null);
    setUssd(null);
    if (status === "succeeded") {
      set("has_paid_access", true);
      toast({ title: "Paiement réussi", description: `Accès débloqué.${extra.transaction_id ? ` (TX ${extra.transaction_id})` : ""}` });
    } else {
      toast({ title: "Paiement refusé", description: extra.error || "Paiement non validé.", variant: "destructive" });
    }
  }

  // Background poll: checks checkoutStatus every 3s (~2min max) and settles
  // the pending 3DS/USSD modal once the PSP confirms succeeded or failed.
  function pollCheckoutStatus(reference) {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      if (attempts > 40) { clearInterval(interval); finishPayment("failed", { error: "Délai dépassé. Réessayez ou contactez le support." }); return; }
      try {
        const res = await base44.functions.invoke("checkoutStatus", { reference });
        const d = res?.data || res;
        if (d?.status === "succeeded" || d?.status === "failed") {
          clearInterval(interval);
          finishPayment(d.status, d);
        }
      } catch { /* transient network error, keep polling */ }
    }, 3000);
  }

  async function upload(key, file) {
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      set(key, file_url);
      toast({ title: "Fichier téléversé" });
    } catch (e) {
      toast({ title: "Échec upload", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function payAccess() {
    setBusy(true);
    try {
      const t = TIERS[form.tier];
      if (!pubKey) {
        toast({ title: "Erreur", description: "Configuration de paiement indisponible. Réessayez dans un instant.", variant: "destructive" });
        setBusy(false);
        return;
      }
      const payload = {
        key: pubKey,
        amount: t.price,
        currency: "USD",
        network: "TRC20",
        order_id: `ACCESS-${t.id}-${Date.now()}`,
        webhook_url: "",
      };
      if (form.access_method === "MOMO") {
        payload.payment_method = "MOBILE_MONEY";
        payload.momo = { provider: form.momo_provider || "Orange Money", prefix: form.momo_prefix, phone: form.momo_phone };
      } else {
        payload.payment_method = "CARD";
        payload.card = { number: form.card_number, expiry: form.card_expiry, cvc: form.card_cvc, name: form.card_name || form.company_name };
      }
      const res = await base44.functions.invoke("processCheckoutPayment", payload);
      const data = res?.data || res;

      if (data && data.status === "succeeded") {
        finishPayment("succeeded", data);
        return;
      }
      if (data && data.status === "requires_action" && data.auth_url) {
        // Cardholder's own bank verification (3D Secure) -- required by card
        // network rules, cannot be skipped or hidden.
        setThreeDS({ url: data.auth_url, reference: data.reference });
        pollCheckoutStatus(data.reference);
        return;
      }
      if (data && data.status === "pending" && data.reference) {
        // Mobile Money: waiting for the customer to enter their PIN.
        setUssd({ reference: data.reference });
        pollCheckoutStatus(data.reference);
        return;
      }
      finishPayment("failed", data || {});
    } catch (e) {
      toast({ title: "Erreur paiement", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function finish() {
    setBusy(true);
    try {
      const t = TIERS[form.tier];
      const tenant = await base44.entities.Tenant.create({
        company_name: form.company_name,
        country: form.country,
        city: form.city,
        business_activity: form.business_activity,
        tier: form.tier,
        has_paid_access: form.has_paid_access,
        daily_limit: t.daily_limit,
        commission_rate: t.commission,
        checkout_primary_color: form.checkout_primary_color,
        logo_url: form.logo_url,
        account_status: "AWAITING_APPROVAL",
        kyc_status: form.has_paid_access ? "PENDING_KYC" : "PENDING_PAYMENT",
        kyc_doc_url: form.kyc_doc_url,
        selfie_url: form.selfie_url,
        id_name: form.id_name,
        id_number: form.id_number,
        phone: `${form.phone_prefix}${form.phone_local}`,
        receiving_wallet: form.receiving_wallet,
        blockchain: form.blockchain,
        onboarding_complete: true,
      });
      await auth.updateMe({ tenant_id: tenant.id, kyc_status: "PENDING_KYC" });
      toast({ title: "Dossier soumis", description: "En attente de validation par NexaPay." });
      setTimeout(() => { window.location.href = "/approval-pending"; }, 1200);
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  const canNext = [
    !!(form.company_name && form.country && form.phone_local),
    form.has_paid_access,
    !!(form.kyc_doc_url && form.selfie_url && form.id_name),
    !!form.receiving_wallet,
  ][step];

  return (
    <div className="relative min-h-screen bg-secondary/40 py-10 px-4">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Image src={BG} alt="" className="h-full w-full object-cover opacity-[0.06]" fittingType="fill" />
      </div>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-heading font-semibold text-foreground">Onboarding Marchand</h1>
          <p className="text-muted-foreground text-sm">Configurez votre espace de production NexaPay</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                    {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-primary" : "bg-border"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {/* Step 1 — Profile */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-heading font-semibold text-lg">Profil professionnel</h2>
              <div className="grid gap-2">
                <Label htmlFor="cn">Nom de l'entreprise / entité</Label>
                <Input id="cn" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" /> Pays <span className="text-destructive">*</span></Label>
                  <CountrySelect value={form.country} onValueChange={(v) => set("country", v)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city" className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" /> Ville</Label>
                  <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Douala" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ba">Activité / secteur business</Label>
                <Input id="ba" value={form.business_activity} onChange={(e) => set("business_activity", e.target.value)} placeholder="E-commerce, Services, Import-export, Restauration..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ph" className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" /> Téléphone <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  <DialCodeSelect value={form.phone_prefix} onValueChange={(v) => set("phone_prefix", v)} />
                  <div className="relative flex-1">
                    <Input id="ph" inputMode="tel" value={form.phone_local} onChange={(e) => set("phone_local", e.target.value.replace(/[^\d]/g, "").slice(0, 12))} placeholder="612 34 56 78" className="pr-9" />
                    {form.phone_local.length >= 6 && <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Numéro de contact marchand. Indicatif pays détecté automatiquement.</p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground mt-1 cursor-pointer">
                  <input type="checkbox" checked={form.otp_optional} onChange={(e) => set("otp_optional", e.target.checked)} className="rounded" />
                  Vérifier ce numéro par SMS (OTP) — optionnel
                </label>
                {form.otp_optional && (
                  <Input value={form.otp_code} onChange={(e) => set("otp_code", e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Code OTP (6 chiffres)" className="rounded-xl" />
                )}
              </div>
            </div>
          )}

          {/* Step 2 — Tier & access */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-heading font-semibold text-lg">Sélection du tier & paiement d'accès</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {Object.values(TIERS).map((t) => (
                  <button key={t.id} onClick={() => set("tier", t.id)} className={`text-left p-4 rounded-xl border-2 transition ${form.tier === t.id ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}>
                    <div className="font-heading font-semibold">{t.label}</div>
                    <div className="text-2xl font-bold text-foreground my-1">${t.price}</div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>Limite: {t.daily_limit >= 9999999 ? "Illimitée" : `$${t.daily_limit}/jour`}</li>
                      <li>Commission: {t.commission}%</li>
                    </ul>
                  </button>
                ))}
              </div>
              {!form.has_paid_access ? (
                <div className="space-y-3 border border-border rounded-lg p-4">
                  <p className="text-sm font-medium">Paiement du frais d'accès — ${TIERS[form.tier].price} (via NexaPay)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => set("access_method", "CARD")} className={`px-3 py-2 rounded-xl border-2 text-sm font-medium flex items-center justify-center gap-2 transition ${form.access_method === "CARD" ? "border-primary bg-accent text-accent-foreground" : "border-border hover:border-primary/50"}`}>
                      <CreditCard className="w-4 h-4" /> Carte bancaire
                    </button>
                    <button type="button" onClick={() => set("access_method", "MOMO")} className={`px-3 py-2 rounded-xl border-2 text-sm font-medium flex items-center justify-center gap-2 transition ${form.access_method === "MOMO" ? "border-primary bg-accent text-accent-foreground" : "border-border hover:border-primary/50"}`}>
                      <Smartphone className="w-4 h-4" /> Mobile Money
                    </button>
                  </div>
                  {form.access_method === "CARD" ? (
                    <CardFields value={{ number: form.card_number, expiry: form.card_expiry, cvc: form.card_cvc, name: form.card_name }} onChange={(k, v) => set(k === "number" ? "card_number" : k === "expiry" ? "card_expiry" : k === "cvc" ? "card_cvc" : "card_name", v)} lang="FR" />
                  ) : (
                    <MoMoFields value={{ country: form.momo_country, prefix: form.momo_prefix, provider: form.momo_provider, phone: form.momo_phone }} onChange={(k, v) => set(k === "country" ? "momo_country" : k === "prefix" ? "momo_prefix" : k === "provider" ? "momo_provider" : "momo_phone", v)} lang="FR" />
                  )}
                  <Button onClick={payAccess} disabled={busy} className="w-full">
                    <Lock className="w-4 h-4" /> Payer & débloquer — ${TIERS[form.tier].price}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-primary font-medium bg-accent rounded-lg p-3">
                  <Check className="w-4 h-4" /> Accès débloqué & payé via NexaPay
                </div>
              )}
            </div>
          )}

          {/* Step 3 — KYC */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-heading font-semibold text-lg">Conformité & KYC institutionnel</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Nom légal (CNI/Passeport)</Label>
                  <Input value={form.id_name} onChange={(e) => set("id_name", e.target.value)} placeholder="Jean Dupont" />
                </div>
                <div className="grid gap-2">
                  <Label>Numéro du document</Label>
                  <Input value={form.id_number} onChange={(e) => set("id_number", e.target.value)} placeholder="12AB34567" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <UploadBox label="Pièce d'identité (CNI/Passeport)" url={form.kyc_doc_url} onFile={(f) => upload("kyc_doc_url", f)} />
                <UploadBox label="Selfie de validation (Liveness)" url={form.selfie_url} onFile={(f) => upload("selfie_url", f)} />
              </div>
              <p className="text-xs text-muted-foreground">Name-matching strict: la carte bancaire ou le compte de paiement doit correspondre au nom légal ci-dessus.</p>
            </div>
          )}

          {/* Step 4 — Config */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-heading font-semibold text-lg">Configuration technique</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Portefeuille USDT de réception</Label>
                  <Input value={form.receiving_wallet} onChange={(e) => set("receiving_wallet", e.target.value)} placeholder="0x... / T..." />
                </div>
                <div className="grid gap-2">
                  <Label>Réseau</Label>
                  <select value={form.blockchain} onChange={(e) => set("blockchain", e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="POLYGON">Polygon</option>
                    <option value="TRC20">TRC20</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Couleur du Widget</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.checkout_primary_color} onChange={(e) => set("checkout_primary_color", e.target.value)} className="w-9 h-9 rounded-md border border-input cursor-pointer" />
                    <Input value={form.checkout_primary_color} onChange={(e) => set("checkout_primary_color", e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Logo marchand (entête du module)</Label>
                  <UploadBox label="Logo (PNG/SVG)" url={form.logo_url} onFile={(f) => upload("logo_url", f)} />
                </div>
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
              <ChevronLeft className="w-4 h-4" /> Précédent
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext || busy}>
                Suivant <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={!canNext || busy}>
                <Wallet className="w-4 h-4" /> Finaliser
              </Button>
            )}
          </div>
        </div>
      </div>
      {threeDS && (
        <ThreeDSModal
          url={threeDS.url}
          lang="FR"
          onDone={() => { /* checkoutStatus is already polling in the background */ }}
          onClose={() => finishPayment("failed", { error: "Authentification annulée." })}
        />
      )}
      {ussd && (
        <UssdPromptModal
          phone={`${form.momo_prefix}${form.momo_phone}`}
          lang="FR"
          onCancel={() => finishPayment("failed", { error: "Paiement annulé." })}
        />
      )}
    </div>
  );
}

function UploadBox({ label, url, onFile }) {
  return (
    <div className="border-2 border-dashed border-border rounded-lg p-3 text-center">
      <div className="text-xs font-medium mb-2">{label}</div>
      {url ? (
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <Check className="w-4 h-4" /> Téléversé
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Upload className="w-4 h-4" /> Choisir un fichier
          <input type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}