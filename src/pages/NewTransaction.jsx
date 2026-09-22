import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, CheckCircle2, Send, CreditCard, Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CardFields from "@/components/checkout/CardFields";
import MoMoFields from "@/components/checkout/MoMoFields";
import ProcessingOverlay from "@/components/checkout/ProcessingOverlay";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";

const FALLBACK_PK = "nexa_pk_test_123";

const I18N = {
  FR: {
    secure: "Paiement sécurisé",
    poweredBy: "Paiement sécurisé par",
    order: "Commande",
    pay: "Payer",
    processing: "Traitement…",
    back: "Retour au tableau de bord",
    email: "Email de confirmation",
    emailPh: "jean.dupont@email.com",
    card: "Carte bancaire",
    momo: "Mobile Money",
    success: "Paiement confirmé",
    successMsg: "Merci pour votre achat. Votre paiement a bien été reçu par NexaPay.",
    ref: "Référence",
    again: "Nouveau paiement",
    usdt: "USDT livrés",
    net: "Réseau",
    prov: "Exécuteur",
    txhash: "Hash de règlement",
    liveBadge: "Exécution réelle",
    mockBadge: "Mode démo",
    errAmount: "Montant de la commande indisponible.",
    errEmail: "Veuillez saisir un email valide.",
    errCard: "Numéro de carte invalide.",
    errExp: "Date d'expiration invalide.",
    errCvc: "CVC invalide.",
    errName: "Nom du titulaire requis.",
    errProvider: "Veuillez choisir un opérateur.",
    errPrefix: "Indicatif pays requis.",
    errPhone: "Numéro mobile money requis.",
    errFail: "Échec du paiement.",
  },
  EN: {
    secure: "Secure payment",
    poweredBy: "Secure payment by",
    order: "Order",
    pay: "Pay",
    processing: "Processing…",
    back: "Back to dashboard",
    email: "Confirmation email",
    emailPh: "john.doe@email.com",
    card: "Bank card",
    momo: "Mobile Money",
    success: "Payment confirmed",
    successMsg: "Thank you for your purchase. Your payment has been received by NexaPay.",
    ref: "Reference",
    again: "New payment",
    usdt: "USDT delivered",
    net: "Network",
    prov: "Executor",
    txhash: "Settlement hash",
    liveBadge: "Live execution",
    mockBadge: "Demo mode",
    errAmount: "Order amount unavailable.",
    errEmail: "Please enter a valid email.",
    errCard: "Invalid card number.",
    errExp: "Invalid expiration date.",
    errCvc: "Invalid CVC.",
    errName: "Cardholder name required.",
    errProvider: "Please choose an operator.",
    errPrefix: "Country code required.",
    errPhone: "Mobile money number required.",
    errFail: "Payment failed.",
  },
};

const formatTotal = (amount, currency, lang) => {
  try {
    return new Intl.NumberFormat(lang === "EN" ? "en-US" : "fr-FR", { style: "currency", currency: currency || "EUR" }).format(Number(amount) || 0);
  } catch {
    return `${amount} ${currency}`;
  }
};

const luhnValid = (num) => {
  const n = (num || "").replace(/\D/g, "");
  if (n.length < 13) return false;
  let s = 0, alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = +n[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    s += d; alt = !alt;
  }
  return s % 10 === 0;
};

export default function NewTransaction() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get("embed") === "true";
  const clientSecret = params.get("client_secret") || "";
  const publishableKey = params.get("publishable_key") || FALLBACK_PK;

  const [lang, setLang] = useState("FR");
  const t = I18N[lang];

  const [amount] = useState(() => Number(params.get("amount")) || 50);
  const [currency] = useState(params.get("currency") || "EUR");
  const network = params.get("network") || "TRC20";
  const orderRef = params.get("order_id") || "";
  const webhookUrl = params.get("webhook_url") || "";

  const [method, setMethod] = useState("CARD");
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const [momo, setMomo] = useState({ provider: "", prefix: "", phone: "" });
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach((id) => clearTimeout(id)), []);

  const total = formatTotal(amount, currency, lang);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!amount || amount <= 0) return setError(t.errAmount);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t.errEmail);
    if (method === "CARD") {
      if (!luhnValid(card.number)) return setError(t.errCard);
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return setError(t.errExp);
      if (!card.cvc) return setError(t.errCvc);
      if (!card.name.trim()) return setError(t.errName);
    } else {
      if (!momo.provider) return setError(t.errProvider);
      if (!momo.prefix) return setError(t.errPrefix);
      if (!momo.phone) return setError(t.errPhone);
    }

    const payload = {
      client_secret: clientSecret,
      payment_method: method,
      order_id: orderRef,
      webhook_url: webhookUrl,
      amount: clientSecret ? undefined : amount,
      currency: clientSecret ? undefined : currency,
      network: clientSecret ? undefined : network,
      card: method === "CARD" ? card : undefined,
      momo: method === "MOBILE_MONEY" ? momo : undefined,
      payer: { email: email.trim() },
    };

    setProcessing(true);
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 900); timers.current.push(t1);
    const t2 = setTimeout(() => setStep(2), 1800); timers.current.push(t2);
    try {
      const res = await base44.functions.invoke("processCheckoutPayment", { ...payload, key: publishableKey });
      const data = res?.data || res;
      if (data.status !== "succeeded") throw new Error(data.error || t.errFail);
      clearTimeout(t1);
      clearTimeout(t2);
      setStep(3);
      const t3 = setTimeout(() => {
        try {
          window.parent.postMessage(
            { status: "PAYMENT_SUCCESS", transactionId: data.transaction_id, cryptoTxHash: data.crypto_tx_hash },
            "*"
          );
        } catch (_) {}
        setProcessing(false);
        setResult(data);
        setSuccess(true);
      }, 700);
      timers.current.push(t3);
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      setError(err.message || t.errFail);
      setProcessing(false);
    }
  };

  const reset = () => { setSuccess(false); setResult(null); setError(""); setStep(0); };

  if (success) {
    return (
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <Image
            src="https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/3db633379_generated_image.png"
            alt="NexaPay"
            className="h-10 w-10 mx-auto mt-4 rounded-xl"
            fittingType="fill"
          />
          <h2 className="font-display text-xl font-semibold mt-3">{t.success}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.successMsg}</p>
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.order}</span>
              <span className="font-display font-semibold">{total}</span>
            </div>
            {orderRef && (
              <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border">
                <span className="text-muted-foreground">{t.ref}</span>
                <span className="font-mono">{orderRef}</span>
              </div>
            )}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">{t.poweredBy} NexaPay</p>
          <Button onClick={reset} variant="outline" className="rounded-full mt-5">{t.again}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8">
      {!isEmbed && (
        <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="rounded-full mb-6">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> {t.back}
        </Button>
      )}

      <div className="relative rounded-2xl border border-border bg-card p-6 md:p-7 shadow-sm">
        {processing && <ProcessingOverlay lang={lang} step={step} />}

        {/* Merchant lockup + language toggle */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/3db633379_generated_image.png"
              alt="NexaPay"
              className="h-12 w-12 rounded-2xl"
              fittingType="fill"
            />
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight leading-none">NexaPay</h1>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Lock className="h-3 w-3" /> {t.secure}</p>
            </div>
          </div>
          <div className="flex items-center rounded-full border border-border bg-secondary/60 p-0.5 text-xs font-medium">
            <button type="button" onClick={() => setLang("FR")} className={`px-2.5 py-1 rounded-full transition-colors ${lang === "FR" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>FR</button>
            <button type="button" onClick={() => setLang("EN")} className={`px-2.5 py-1 rounded-full transition-colors ${lang === "EN" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>EN</button>
          </div>
        </div>

        {/* Order amount — equivalent of the product amount (read-only) */}
        <div className="mt-5 rounded-xl border border-border bg-secondary/40 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.order}</span>
            <span className="font-display text-2xl font-semibold tracking-tight">{total}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <Tabs value={method} onValueChange={setMethod}>
            <TabsList className="grid grid-cols-2 w-full rounded-xl">
              <TabsTrigger value="CARD" className="rounded-xl"><CreditCard className="h-4 w-4 mr-1.5" /> {t.card}</TabsTrigger>
              <TabsTrigger value="MOBILE_MONEY" className="rounded-xl"><Smartphone className="h-4 w-4 mr-1.5" /> {t.momo}</TabsTrigger>
            </TabsList>
            <TabsContent value="CARD" className="mt-4">
              <CardFields lang={lang} value={card} onChange={(k, v) => setCard((c) => ({ ...c, [k]: v }))} />
            </TabsContent>
            <TabsContent value="MOBILE_MONEY" className="mt-4">
              <MoMoFields lang={lang} value={momo} onChange={(k, v) => setMomo((m) => ({ ...m, [k]: v }))} />
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} className="rounded-xl" />
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <Button type="submit" disabled={processing} className="w-full rounded-full bg-primary text-primary-foreground font-semibold shadow-sm hover:shadow-md transition-shadow h-11">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t.processing}</>
              : <><Send className="h-4 w-4 mr-2" /> {t.pay} {total}</>}
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-border text-center">
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> {t.poweredBy} NexaPay
          </p>
        </div>
      </div>
    </div>
  );
}