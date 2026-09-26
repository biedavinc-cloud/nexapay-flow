import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Lock, Send, ShieldCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NexaMark } from "@/components/NexaPayLogo";
import { base44 } from "@/api/base44Client";

const I18N = {
  FR: {
    secure: "Paiement sécurisé", poweredBy: "Paiement sécurisé par", order: "Commande", pay: "Payer",
    redirecting: "Redirection…", email: "Email de confirmation", emailPh: "jean.dupont@email.com",
    redirectNote: "Vous finaliserez le paiement de manière sécurisée (carte bancaire ou Mobile Money).",
    loading: "Chargement du paiement…", notFound: "Ce lien de paiement est introuvable ou a été désactivé.",
    errAmount: "Montant indisponible.", errEmail: "Veuillez saisir un email valide.", errFail: "Échec du paiement.",
  },
  EN: {
    secure: "Secure payment", poweredBy: "Secure payment by", order: "Order", pay: "Pay",
    redirecting: "Redirecting…", email: "Confirmation email", emailPh: "john.doe@email.com",
    redirectNote: "You will complete the payment securely (bank card or Mobile Money).",
    loading: "Loading payment…", notFound: "This payment link could not be found or has been disabled.",
    errAmount: "Amount unavailable.", errEmail: "Please enter a valid email.", errFail: "Payment failed.",
  },
};

const formatTotal = (amount, currency, lang) => {
  try {
    return new Intl.NumberFormat(lang === "EN" ? "en-US" : "fr-FR", { style: "currency", currency: currency || "EUR" }).format(Number(amount) || 0);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function PayLink() {
  const { slug } = useParams();
  const [lang, setLang] = useState("EN");
  const embed = new URLSearchParams(window.location.search).get("embed") === "true";
  const t = I18N[lang];
  const [link, setLink] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("resolvePaymentLink", { slug });
        const data = res?.data || res;
        if (data?.error) { setStatus("error"); return; }
        setLink(data);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    })();
  }, [slug]);

  const total = link ? formatTotal(link.amount, link.currency, lang) : "";

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!link || !link.amount || link.amount <= 0) return setError(t.errAmount);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t.errEmail);
    const qs = new URLSearchParams({
      amount: String(link.amount),
      currency: link.currency || "EUR",
      network: link.network || "TRC20",
      tenant_id: link.tenant_id || "",
      order_id: link.slug || "",
      embed: embed ? "true" : "false",
    }).toString();
    window.location.href = `/payments/new?${qs}`;
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-7 shadow-sm text-center">
          <NexaMark size={40} className="mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">{t.notFound}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="max-w-md w-full">
        <div className="relative rounded-2xl border border-border bg-card p-6 md:p-7 shadow-sm">
          {submitting && (
            <div className="absolute inset-0 z-10 rounded-2xl bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t.redirecting}</p>
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
              <button type="button" onClick={() => setLang("FR")} className={`px-2.5 py-1 rounded-full ${lang === "FR" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>FR</button>
              <button type="button" onClick={() => setLang("EN")} className={`px-2.5 py-1 rounded-full ${lang === "EN" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>EN</button>
            </div>
          </div>

          {link.description && <p className="mt-4 text-sm text-muted-foreground">{link.description}</p>}

          <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t.order}</span>
              <span className="font-display text-2xl font-semibold tracking-tight">{total}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} className="rounded-xl" />
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 flex items-start gap-2.5">
              <ExternalLink className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{t.redirectNote}</p>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            <Button type="submit" disabled={submitting} className="w-full rounded-full bg-primary text-primary-foreground font-semibold shadow-sm hover:shadow-md transition-shadow h-11">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t.redirecting}</>
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
    </div>
  );
}