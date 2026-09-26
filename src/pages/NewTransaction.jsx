import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, Send, ShieldCheck, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";
import { NexaMark } from "@/components/NexaPayLogo";
import CardFields, { validateCardBrand } from "@/components/checkout/CardFields";
import ThreeDSModal from "@/components/checkout/ThreeDSModal";
import UssdPromptModal from "@/components/checkout/UssdPromptModal";
import MoMoFields from "@/components/checkout/MoMoFields";
import { COUNTRIES } from "@/lib/countries";

const COUNTRY_BY_CURRENCY = { XAF: "CM", XOF: "CI", GHS: "GH", NGN: "NG", EUR: "FR", USD: "US" };

const I18N = {
  FR: {
    secure: "Paiement sécurisé", poweredBy: "Paiement sécurisé par", order: "Commande", product: "Produit", pay: "Payer",
    processing: "Traitement…", back: "Retour au tableau de bord", email: "Email de confirmation",
    emailPh: "jean.dupont@email.com",
    methodCard: "Carte bancaire", methodMomo: "Mobile Money",
    success: "Paiement confirmé", successMsg: "Merci. Votre paiement a bien été reçu par NexaPay.",
    ref: "Référence", again: "Nouveau paiement", closeTab: "Vous pouvez fermer cet onglet.",
    errAmount: "Montant indisponible.", errEmail: "Veuillez saisir un email valide.",
    errCard: "Veuillez saisir un numéro de carte valide.", errCvc: "CVC invalide.", errExpiry: "Date d'expiration invalide.",
    errPhone: "Veuillez saisir un numéro de téléphone valide.", errMomo: "Opérateur Mobile Money non supporté pour ce pays.",
    errFail: "Échec du paiement.", timedOut: "Délai de confirmation dépassé.",
    waitingTitle: "Validation en cours…",
    waitingMsg: "Confirmez le paiement sur votre téléphone.",
  },
  EN: {
    secure: "Secure payment", poweredBy: "Secure payment by", order: "Order", product: "Product", pay: "Pay",
    processing: "Processing…", back: "Back to dashboard", email: "Confirmation email",
    emailPh: "john.doe@email.com",
    methodCard: "Bank card", methodMomo: "Mobile Money",
    success: "Payment confirmed", successMsg: "Thank you. Your payment has been received by NexaPay.",
    ref: "Reference", again: "New payment", closeTab: "You can close this tab.",
    errAmount: "Amount unavailable.", errEmail: "Please enter a valid email.",
    errCard: "Please enter a valid card number.", errCvc: "Invalid CVC.", errExpiry: "Invalid expiry date.",
    errPhone: "Please enter a valid phone number.", errMomo: "Mobile Money operator not supported for this country.",
    errFail: "Payment failed.", timedOut: "Confirmation timed out.",
    waitingTitle: "Validation in progress…",
    waitingMsg: "Confirm the payment on your phone.",
  },
};

const formatTotal = (amount, currency, lang) => {
  try {
    return new Intl.NumberFormat(lang === "EN" ? "en-US" : "fr-FR", { style: "currency", currency: currency || "EUR" }).format(Number(amount) || 0);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function NewTransaction() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get("embed") === "true";
  const clientSecret = params.get("client_secret") || "";
  const [publishableKey, setPublishableKey] = useState(params.get("publishable_key") || "");
  useEffect(() => {
    if (publishableKey) return;
    fetch("/api/checkout/publishable-key").then((r) => r.json()).then((d) => {
      if (d?.publishable_key) setPublishableKey(d.publishable_key);
    }).catch(() => {});
  }, [publishableKey]);

  const [lang, setLang] = useState("EN");
  const t = I18N[lang];

  const [amount] = useState(() => Number(params.get("amount")) || 50);
  const [currency] = useState(params.get("currency") || "EUR");
  const network = params.get("network") || "TRC20";
  const tenantId = params.get("tenant_id") || "";
  const orderRef = params.get("order_id") || "";
  const product = params.get("product") || params.get("label") || "";
  const webhookUrl = params.get("webhook_url") || "";

  const [method, setMethod] = useState("card");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const defaultCountry = COUNTRY_BY_CURRENCY[currency] || "CM";
  const defaultDial = (COUNTRIES.find((c) => c.code === defaultCountry) || {}).dial || "";
  const [momo, setMomo] = useState({ country: defaultCountry, prefix: defaultDial, phone: "", provider: "" });
  const [submitting, setSubmitting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [threeDS, setThreeDS] = useState(null);
  const [ussd, setUssd] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const doneRef = useRef(false);
  const timers = useRef([]);
  useEffect(() => () => { doneRef.current = true; timers.current.forEach((id) => clearTimeout(id)); }, []);

  const total = formatTotal(amount, currency, lang);

  const onCardChange = (field, val) => setCard((c) => ({ ...c, [field]: val }));
  const onMomoChange = (field, val) => setMomo((m) => ({ ...m, [field]: val }));

  const finishSuccess = (reference, transactionId) => {
    doneRef.current = true; setDone({ status: "COMPLETED", reference, transaction_id: transactionId });
    setWaiting(false); setThreeDS(null); setUssd(null);
    try { window.parent.postMessage({ status: "PAYMENT_SUCCESS", transactionId, reference }, "*"); } catch {}
  };
  const finishFailed = (reference, msg) => {
    doneRef.current = true; setDone({ status: "FAILED", reference }); setWaiting(false); setThreeDS(null); setUssd(null);
    setError(msg || t.errFail);
    try { window.parent.postMessage({ status: "PAYMENT_FAILED", reference }, "*"); } catch {}
  };

  // Single status endpoint for both PSPs -- checkoutStatus never reveals
  // which one handled the payment (Korapay direct charge or PayUnit push).
  const pollStatus = (reference) => {
    const poll = async () => {
      try {
        const r = await fetch(`/api/checkout/status?reference=${encodeURIComponent(reference)}`, {
          headers: publishableKey ? { Authorization: `Bearer ${publishableKey}` } : {},
        });
        const d = await r.json();
        if (doneRef.current) return;
        if (d.status === "succeeded") return finishSuccess(d.reference || reference, d.transaction_id);
        if (d.status === "failed") return finishFailed(d.reference || reference, d.error);
        const id = setTimeout(poll, 3000); timers.current.push(id);
      } catch { const id = setTimeout(poll, 4000); timers.current.push(id); }
    };
    poll();
    const stop = setTimeout(() => { if (!doneRef.current) finishFailed(reference, t.timedOut); }, 600000);
    timers.current.push(stop);
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!amount || amount <= 0) return setError(t.errAmount);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t.errEmail);
    if (!validateCardBrand(card.number)) return setError(t.errCard);
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return setError(t.errExpiry);
    if (card.cvc.length < 3) return setError(t.errCvc);

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/process", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: clientSecret ? undefined : publishableKey,
          client_secret: clientSecret || undefined,
          amount: clientSecret ? undefined : amount, currency: clientSecret ? undefined : currency,
          network: clientSecret ? undefined : network, payment_method: "CARD",
          tenant_id: tenantId || undefined, order_id: orderRef || undefined, webhook_url: webhookUrl || undefined,
          payer: { email: email.trim() },
          card: { number: card.number.replace(/\s+/g, ""), expiry: card.expiry, cvc: card.cvc, name: card.name || undefined },
        }),
      });
      const data = await res.json();

      if (data.status === "requires_action") {
        setSubmitting(false); setThreeDS({ url: data.auth_url, reference: data.reference });
        pollStatus(data.reference);
        return;
      }
      if (data.status === "succeeded") {
        setSubmitting(false);
        return finishSuccess(data.reference || data.transaction_id, data.transaction_id);
      }
      throw new Error(data.error || t.errFail);
    } catch (err) {
      setError(err.message || t.errFail); setSubmitting(false);
    }
  };

  const handleMomoSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!amount || amount <= 0) return setError(t.errAmount);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t.errEmail);
    if (!momo.phone || momo.phone.length < 6) return setError(t.errPhone);
    if (!momo.provider) return setError(t.errMomo);

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/process", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: clientSecret ? undefined : publishableKey,
          client_secret: clientSecret || undefined,
          amount: clientSecret ? undefined : amount, currency: clientSecret ? undefined : currency,
          network: clientSecret ? undefined : network, payment_method: "MOBILE_MONEY",
          tenant_id: tenantId || undefined, order_id: orderRef || undefined, webhook_url: webhookUrl || undefined,
          payer: { email: email.trim() },
          country: momo.country,
          momo: { provider: momo.provider, prefix: momo.prefix, phone: momo.phone },
        }),
      });
      const data = await res.json();
      if (data.status !== "pending") throw new Error(data.error || t.errFail);

      setSubmitting(false);
      doneRef.current = false;
      setUssd({ reference: data.reference, phone: momo.phone });
      pollStatus(data.reference);
    } catch (err) {
      setError(err.message || t.errFail); setSubmitting(false);
    }
  };

  const reset = () => { setDone(null); setError(""); setWaiting(false); setThreeDS(null); setUssd(null); };

  // Success
  if (done && done.status === "COMPLETED") {
    return (
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <NexaMark size={38} className="mx-auto mt-4" />
          <h2 className="font-display text-xl font-semibold mt-3">{t.success}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.successMsg}</p>
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-4 py-3 space-y-2">
            {product && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.product}</span>
                <span className="font-medium">{product}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.order}</span>
              <span className="font-display font-semibold">{total}</span>
            </div>
            {done.reference && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">{t.ref}</span>
                <span className="font-mono">{done.reference}</span>
              </div>
            )}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">{t.poweredBy} NexaPay</p>
          {isEmbed && <p className="mt-3 text-sm text-muted-foreground">{t.closeTab}</p>}
          {!isEmbed && <Button onClick={reset} variant="outline" className="rounded-full mt-4">{t.again}</Button>}
        </div>
      </div>
    );
  }

  // Waiting (Card 3DS settlement / MoMo polling — MoMo shows the USSD modal instead)
  if (waiting && !ussd) {
    return (
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <NexaMark size={38} className="mx-auto mt-4" />
          <h2 className="font-display text-xl font-semibold mt-3">{t.waitingTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.waitingMsg}</p>
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <p className="mt-4 text-[11px] text-muted-foreground">{t.poweredBy} NexaPay</p>
        </div>
      </div>
    );
  }

  // Failed
  if (done && done.status === "FAILED") {
    return (
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-7 shadow-sm text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-red-50 border border-red-200">
            <XCircle className="h-7 w-7 text-red-600" />
          </div>
          <NexaMark size={38} className="mx-auto mt-4" />
          <h2 className="font-display text-xl font-semibold mt-3">{t.errFail}</h2>
          {error && <p className="text-sm text-muted-foreground mt-1">{error}</p>}
          <Button onClick={reset} variant="outline" className="rounded-full mt-5">{t.again}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8">
      {threeDS && (
        <ThreeDSModal url={threeDS.url} lang={lang} busy={waiting}
          onClose={() => { setThreeDS(null); setWaiting(true); }}
          onDone={() => { setThreeDS(null); setWaiting(true); pollStatus(threeDS.reference); }}
        />
      )}
      {ussd && (
        <UssdPromptModal phone={momo.prefix && momo.phone ? `${momo.prefix}${momo.phone}` : momo.phone} lang={lang}
          onCancel={() => { setUssd(null); setWaiting(false); reset(); }}
        />
      )}

      {!isEmbed && (
        <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="rounded-full mb-6">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> {t.back}
        </Button>
      )}

      <div className="relative rounded-2xl border border-border bg-card p-6 md:p-7 shadow-sm">
        {submitting && (
          <div className="absolute inset-0 z-10 rounded-2xl bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t.processing}</p>
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <NexaMark size={44} />
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

        <div className="mt-5 rounded-xl border border-border bg-secondary/40 px-4 py-3.5">
          {product && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t.product}</span>
              <span className="text-sm font-medium">{product}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.order}</span>
            <span className="font-display text-2xl font-semibold tracking-tight">{total}</span>
          </div>
        </div>

        {/* Payment method selection */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/30 p-1">
          <button type="button" onClick={() => setMethod("card")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${method === "card" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <CreditCard className="h-4 w-4" /> {t.methodCard}
          </button>
          <button type="button" onClick={() => setMethod("momo")} className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${method === "momo" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <Smartphone className="h-4 w-4" /> {t.methodMomo}
          </button>
        </div>

        <form onSubmit={method === "card" ? handleCardSubmit : handleMomoSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} className="rounded-xl" />
          </div>

          {method === "card" ? (
            <CardFields value={card} onChange={onCardChange} lang={lang} />
          ) : (
            <MoMoFields value={momo} onChange={onMomoChange} lang={lang} />
          )}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <Button type="submit" disabled={submitting} className="w-full rounded-full bg-primary text-primary-foreground font-semibold shadow-sm hover:shadow-md transition-shadow h-11">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t.processing}</>
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