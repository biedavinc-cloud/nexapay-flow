import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexaMark } from "@/components/NexaPayLogo";
import { base44 } from "@/api/base44Client";

const I18N = {
  FR: {
    processing: "Traitement de votre paiement…",
    processingMsg: "Nous confirmons la réception du paiement auprès de Payunit. Cette page se met à jour automatiquement.",
    success: "Paiement confirmé",
    successMsg: "Merci. Votre paiement a bien été reçu par NexaPay.",
    failed: "Paiement échoué",
    error: "Erreur",
    order: "Montant",
    ref: "Référence",
    closeTab: "Vous pouvez fermer cet onglet.",
    backHome: "Retour à l'accueil",
    missing: "Référence de paiement manquante.",
    timedOut: "Délai de confirmation dépassé. Vérifiez votre paiement ou réessayez.",
    poweredBy: "Paiement sécurisé par",
  },
  EN: {
    processing: "Processing your payment…",
    processingMsg: "We are confirming the payment with Payunit. This page updates automatically.",
    success: "Payment confirmed",
    successMsg: "Thank you. Your payment has been received by NexaPay.",
    failed: "Payment failed",
    error: "Error",
    order: "Amount",
    ref: "Reference",
    closeTab: "You can close this tab.",
    backHome: "Back to home",
    missing: "Payment reference missing.",
    timedOut: "Confirmation timed out. Check your payment or try again.",
    poweredBy: "Secure payment by",
  },
};

const formatTotal = (amount, currency) => {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR" }).format(Number(amount) || 0);
  } catch {
    return `${amount} ${currency}`;
  }
};

export default function PayunitReturn() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") || "";
  const isEmbed = params.get("embed") === "true";
  const [lang] = useState("FR");
  const t = I18N[lang];
  const [state, setState] = useState("processing"); // processing | success | failed | error
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const doneRef = useRef(false);
  const timers = useRef([]);
  useEffect(() => () => { doneRef.current = true; timers.current.forEach((id) => clearTimeout(id)); }, []);

  useEffect(() => {
    if (!ref) { setState("error"); setError(t.missing); return; }
    const poll = async () => {
      try {
        const res = await base44.functions.invoke("checkPayunitStatus", { ref });
        const d = res?.data || res;
        if (doneRef.current) return;
        if (d.status === "COMPLETED") {
          doneRef.current = true;
          setData(d); setState("success");
          try { window.parent.postMessage({ status: "PAYMENT_SUCCESS", transactionId: d.transaction_id, reference: d.reference }, "*"); } catch {}
          return;
        }
        if (d.status === "FAILED") {
          doneRef.current = true;
          setData(d); setError(d.error || t.failed); setState("failed");
          try { window.parent.postMessage({ status: "PAYMENT_FAILED", reference: d.reference }, "*"); } catch {}
          return;
        }
        const id = setTimeout(poll, 3000); timers.current.push(id);
      } catch {
        const id = setTimeout(poll, 4000); timers.current.push(id);
      }
    };
    poll();
    const stop = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; setState("failed"); setError(t.timedOut); }
    }, 600000);
    timers.current.push(stop);
  }, [ref]);

  const card = (icon, title, msg, tone) => (
    <div className="max-w-md w-full rounded-2xl border border-border bg-card p-7 shadow-sm text-center">
      {icon}
      <NexaMark size={38} className="mx-auto mt-4" />
      <h2 className="font-display text-xl font-semibold mt-3">{title}</h2>
      {msg && <p className="text-sm text-muted-foreground mt-1">{msg}</p>}
      {data && (data.amount || data.reference) && (
        <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-4 py-3 space-y-2">
          {data.amount != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.order}</span>
              <span className="font-display font-semibold">{formatTotal(data.amount, data.currency)}</span>
            </div>
          )}
          {data.reference && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground">{t.ref}</span>
              <span className="font-mono">{data.reference}</span>
            </div>
          )}
        </div>
      )}
      {error && tone === "failed" && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      <p className="mt-4 text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> {t.poweredBy} NexaPay
      </p>
      {state === "success" && (isEmbed ? (
        <p className="mt-5 text-sm text-muted-foreground">{t.closeTab}</p>
      ) : (
        <Button asChild variant="outline" className="rounded-full mt-5">
          <Link to="/">{t.backHome}</Link>
        </Button>
      ))}
      {state === "failed" && !isEmbed && (
        <Button asChild variant="outline" className="rounded-full mt-5">
          <Link to="/">{t.backHome}</Link>
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      {state === "processing" && card(
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>,
        t.processing, t.processingMsg, "processing"
      )}
      {state === "success" && card(
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>,
        t.success, t.successMsg, "success"
      )}
      {(state === "failed" || state === "error") && card(
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-red-50 border border-red-200">
          <XCircle className="h-7 w-7 text-red-600" />
        </div>,
        state === "error" ? t.error : t.failed, null, "failed"
      )}
    </div>
  );
}