import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NexaMark } from "@/components/NexaPayLogo";
import { ArrowRight, Zap } from "lucide-react";
import PricingCalculator from "@/components/PricingCalculator";

const TRANSPARENCY = [
  { big: "$0", title: "No monthly fees", text: "No recurring software fees. Pay a one-time setup, then only a low per-transaction rate." },
  { big: "$0", title: "No lock-in", text: "No long-term contracts or cancellation fees. Your wallet and your funds stay yours." },
  { big: "Instant", title: "Crypto payouts", text: "Every transaction settles automatically as USDT/USDC straight to your self-custody wallet." },
];

const FEES = [
  { label: "One-time onboarding", value: "from $219", sub: "Starter $219 · Growth $359 · Scale $1099" },
  { label: "Monthly software fees", value: "$0", sub: "No recurring platform fee, ever" },
  { label: "Recurring payments", value: "+0.4% / txn", sub: "Automate your subscription billing" },
  { label: "Card & data migration", value: "$0", sub: "Transfer from another payment provider" },
  { label: "Chargeback", value: "$15", sub: "$0 for cases resolved in your favor" },
  { label: "API & webhooks access", value: "$0", sub: "Full developer access, included" },
  { label: "Instant wallet settlement", value: "Included", sub: "Automated USDT/USDC payout to your wallet" },
  { label: "PCI compliance", value: "$0", sub: "Annual self-assessment included" },
];

function FeeCol({ items }) {
  return (
    <div className="divide-y divide-black/5">
      {items.map((f) => (
        <div key={f.label} className="flex items-start justify-between gap-4 py-5">
          <div>
            <p className="text-sm font-medium text-[#081735]">{f.label}</p>
            <p className="text-xs text-[#6D7A92] mt-1">{f.sub}</p>
          </div>
          <span className="text-lg font-bold text-[#081735] shrink-0">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white text-[#081735] font-body">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><NexaMark size={36} /><span className="font-semibold text-lg tracking-tight text-[#081735]">NexaPay</span></Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:inline text-sm text-[#6D7A92] hover:text-[#081735]">Log in</Link>
            <Link to="/register"><Button className="rounded-full bg-[#3BB77E] hover:bg-[#33a36e] text-white" size="sm">Create a free account</Button></Link>
          </div>
        </div>
      </header>

      <section className="bg-[#F9FFFB]">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#3BB77E]/10 px-3 py-1 text-xs font-medium text-[#2f9762]"><Zap className="h-3.5 w-3.5" /> Instant Crypto Settlement for Merchants</span>
          <h1 className="font-semibold text-3xl md:text-5xl tracking-tight leading-tight mt-5 text-[#081735]">Pricing that scales with you.<br className="hidden md:block" /> No games, just transparency.</h1>
          <p className="text-base md:text-lg text-[#6D7A92] mt-5 max-w-2xl mx-auto">A one-time setup unlocks your merchant account. Then pay a low per-transaction rate — and every payout settles instantly as USDT/USDC directly into your wallet.</p>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 pb-16 md:pb-20">
          <PricingCalculator />
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 pb-16 md:pb-20">
          <h2 className="font-semibold text-2xl md:text-4xl tracking-tight text-[#081735] text-center">No games, just transparency</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {TRANSPARENCY.map((c) => (
              <div key={c.title} className="rounded-2xl bg-[#1a1a4d] p-7 text-white">
                <p className="text-4xl font-bold text-[#FCE566]">{c.big}</p>
                <h3 className="font-semibold text-lg mt-3">{c.title}</h3>
                <p className="text-sm text-white/70 mt-2">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F9FFFB]">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <h2 className="font-semibold text-2xl md:text-4xl tracking-tight text-[#081735] text-center">Detailed fee breakdown</h2>
          <p className="text-[#6D7A92] mt-2 text-center max-w-2xl mx-auto">Everything in USD. No hidden fees, no surprises.</p>
          <div className="grid md:grid-cols-2 gap-x-10 mt-8 bg-white rounded-2xl border border-black/5 p-6 md:p-8">
            <FeeCol items={FEES.slice(0, 4)} />
            <div className="md:border-l md:border-black/5 md:pl-10">
              <FeeCol items={FEES.slice(4)} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center">
          <h2 className="font-semibold text-2xl md:text-4xl tracking-tight text-[#081735]">Start accepting payments that settle in crypto</h2>
          <p className="text-[#6D7A92] mt-3 max-w-xl mx-auto">Create your merchant account in minutes. One-time setup, instant wallet settlement, no lock-in.</p>
          <div className="flex items-center justify-center gap-4 mt-7">
            <Link to="/register"><Button className="rounded-full bg-[#3BB77E] hover:bg-[#33a36e] text-white h-11 px-6">Create a free account</Button></Link>
            <Link to="/" className="text-sm font-medium text-[#081735] hover:underline inline-flex items-center gap-1">Back to home <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#081735] text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2"><NexaMark size={28} /><span className="font-semibold">NexaPay</span></div>
          <p className="text-xs text-white/50 text-center">© NexaPay 2026. Instant Crypto Settlement for Merchants. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}