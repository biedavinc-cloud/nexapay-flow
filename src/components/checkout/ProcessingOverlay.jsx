import React from "react";
import { Loader2, CheckCircle2, CreditCard, ShieldCheck, Lock } from "lucide-react";

// Neutral, cardholder-facing steps — no crypto terminology is shown to the client.
const L = {
  FR: [
    "Vérification de votre carte…",
    "Autorisation sécurisée…",
    "Confirmation de votre paiement…",
    "Paiement confirmé",
  ],
  EN: [
    "Verifying your card…",
    "Secure authorization…",
    "Confirming your payment…",
    "Payment confirmed",
  ],
};

export default function ProcessingOverlay({ step, lang = "FR" }) {
  const labels = L[lang] || L.FR;
  const steps = [
    { icon: CreditCard, label: labels[0] },
    { icon: Lock, label: labels[1] },
    { icon: ShieldCheck, label: labels[2] },
    { icon: CheckCircle2, label: labels[3] },
  ];
  return (
    <div className="absolute inset-0 z-20 rounded-2xl bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5 p-8">
      {steps.map((s, i) => {
        const done = i < step;
        const active = i === step;
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                done
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : active
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="h-5 w-5" /> : active ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
            </div>
            <span className={`text-sm font-medium ${done ? "text-emerald-600" : active ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}