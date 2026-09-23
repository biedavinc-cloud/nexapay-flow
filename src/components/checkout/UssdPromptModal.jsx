import React from "react";
import { Loader2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const L = {
  FR: {
    title: "Validation Mobile Money",
    msg: "Un prompt USSD a été envoyé sur votre téléphone. Veuillez saisir votre code PIN pour valider le paiement.",
    waiting: "En attente de votre validation…",
    cancel: "Annuler",
  },
  EN: {
    title: "Mobile Money validation",
    msg: "A USSD prompt has been sent to your phone. Please enter your PIN to validate the payment.",
    waiting: "Waiting for your validation…",
    cancel: "Cancel",
  },
};

// In-app USSD/OTP prompt — the customer validates on their phone; the checkout polls
// in the background and closes this modal on confirmation. The user never leaves NexaPay.
export default function UssdPromptModal({ phone, lang = "EN", onCancel }) {
  const t = L[lang] || L.EN;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold">{t.title}</span>
          </div>
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground" aria-label={t.cancel}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-7 text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <p className="mt-4 text-sm text-foreground leading-relaxed">{t.msg}</p>
          {phone && <p className="mt-2 font-mono text-sm text-muted-foreground">{phone}</p>}
          <p className="mt-4 text-xs text-muted-foreground">{t.waiting}</p>
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-full">{t.cancel}</Button>
        </div>
      </div>
    </div>
  );
}