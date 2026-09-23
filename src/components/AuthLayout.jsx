import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import NexaPayLogo from "@/components/NexaPayLogo";

const BG = "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/4e7a5383c_peggy_marco-key-1020134_1920.jpg";

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Branded image panel (desktop) */}
      <div className="hidden md:flex md:w-1/2 relative bg-[#081735] overflow-hidden">
        <Image src={BG} alt="" className="absolute inset-0 h-full w-full opacity-30" fittingType="fill" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#081735]/50 via-transparent to-[#0c2046]/70" />
        <div className="relative z-10 flex flex-col justify-between p-10 text-white">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <NexaPayLogo size={34} wordmarkClassName="text-white" />
          </Link>
          <div className="max-w-sm">
            <h2 className="text-2xl font-display font-semibold leading-tight">Paiements fiat → crypto, livrés directement dans votre wallet.</h2>
            <p className="text-white/70 text-sm mt-4">Aucun solde à gérer. Aucun exchange intermédiaire. Chaque paiement achète l'USDT et le crédite instantanément.</p>
          </div>
          <p className="text-xs text-white/40">© NexaPay 2026. All rights reserved.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 bg-gradient-to-b from-[#F9FFFB] via-background to-[#F9FFFB]">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link to="/" className="inline-flex">
              <NexaPayLogo size={40} />
            </Link>
          </div>
          <div className="text-center mb-7">
            <h1 className="text-2xl md:text-[28px] font-display font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
          </div>
          <div className="bg-card rounded-3xl shadow-xl shadow-primary/5 border border-border/80 p-7 md:p-8">{children}</div>
          {footer && <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>}
        </div>
      </div>
    </div>
  );
}