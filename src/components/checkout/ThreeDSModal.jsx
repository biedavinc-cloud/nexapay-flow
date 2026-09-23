import React from "react";
import { Loader2, ShieldCheck, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const L = {
  FR: {
    title: "Authentification de votre banque",
    msg: "Saisissez le code de sécurité (OTP/3D Secure) envoyé par votre banque, puis cliquez sur Continuer.",
    open: "Ouvrir dans un nouvel onglet",
    done: "J'ai terminé — Continuer",
    close: "Fermer",
  },
  EN: {
    title: "Bank authentication",
    msg: "Enter the security code (OTP/3D Secure) sent by your bank, then click Continue.",
    open: "Open in a new tab",
    done: "I'm done — Continue",
    close: "Close",
  },
};

// White-label 3D Secure modal: the bank's secure challenge is shown inside a NexaPay
// overlay. The client never leaves the checkout — no PSP name is displayed.
export default function ThreeDSModal({ url, lang = "FR", onDone, onClose, busy }) {
  const t = L[lang] || L.FR;
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold">{t.title}</span>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label={t.close}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="px-4 py-3 text-xs text-muted-foreground leading-relaxed">{t.msg}</p>
        <div className="relative h-80 w-full bg-secondary/30">
          <iframe src={url} title="3DS" className="absolute inset-0 h-full w-full" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" />
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border">
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> {t.open}
          </a>
          <Button type="button" onClick={onDone} disabled={busy} className="rounded-full">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {t.done}
          </Button>
        </div>
      </div>
    </div>
  );
}