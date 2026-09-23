import React, { useState } from "react";
import { CreditCard, Smartphone, Building2 } from "lucide-react";

const TABS = [
  { id: "momo", label: "Mobile Money", icon: Smartphone },
  { id: "card", label: "Credit Cards", icon: CreditCard },
  { id: "bank", label: "Bank Transfers", icon: Building2 },
];

// Three merchant plans — one-time onboarding fee + per-volume rate tier.
const PLANS = [
  { name: "Starter", fee: "$219", max: 10000, commission: "2.5% + $0.30" },
  { name: "Growth", fee: "$359", max: 50000, commission: "1.9% + $0.20" },
  { name: "Scale", fee: "$1099", max: 100000, commission: "1.5% + $0.10" },
];

// Per-method effective rates by tier (USD). Three tiers, no custom.
const RATES = {
  momo: { primary: ["2.5% + $0.30", "1.9% + $0.20", "1.5% + $0.10"], other: { global: "3.5% + $0.30", local: "1.2% + $0.20" } },
  card: { primary: ["2.9% + $0.30", "2.3% + $0.20", "1.9% + $0.10"], other: { global: "2.9% + $0.30", local: "2.5% + $0.30" } },
  bank: { primary: ["1.5% + $0.20", "1.0% + $0.15", "0.8% + $0.10"], other: { global: "1.5% + $0.20", local: "0.8% + $0.10" } },
};

const TIERS = [
  { volume: "Up to $10,000 / month" },
  { volume: "$10,000 – $50,000 / month" },
  { volume: "$50,000 – $100,000 / month" },
];

function tierIndex(v) {
  if (v < 10000) return 0;
  if (v < 50000) return 1;
  return 2;
}
const fmtVol = (n) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);

export default function PricingCalculator() {
  const [tab, setTab] = useState("momo");
  const [volume, setVolume] = useState(10000);
  const idx = tierIndex(volume);
  const plan = PLANS[idx];
  const rates = RATES[tab];
  const pct = (volume / 100000) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-black/5 p-6 md:p-8">
      {/* Tabs + currency */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex rounded-full bg-[#F1F5F9] p-1">
          {TABS.map((tb) => {
            const active = tab === tb.id;
            const Icon = tb.icon;
            return (
              <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${active ? "bg-[#1a1a4d] text-white shadow-sm" : "text-[#6D7A92] hover:text-[#081735]"}`}>
                <Icon className="h-4 w-4" /> {tb.label}
              </button>
            );
          })}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-[#081735]">
          🇺🇸 USD
        </div>
      </div>

      {/* Header */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-[#081735]">Interchange plus pricing</h3>
        <p className="text-sm text-[#6D7A92] mt-1">
          Effective rates are based on <span className="font-medium text-[#081735]">Combined</span> card types and a transaction size of <span className="font-medium text-[#081735]">$3.00</span>.
        </p>
      </div>

      {/* Main metric + secondary */}
      <div className="mt-6 grid md:grid-cols-2 gap-5 items-stretch">
        <div className="rounded-2xl border border-black/5 bg-[#FAFAFF] p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6D7A92]">Your effective rate</p>
          <p className="text-4xl md:text-5xl font-bold text-[#081735] mt-2">{rates.primary[idx]}</p>
          <div className="flex items-center gap-3 mt-4">
            <span className="inline-flex items-center rounded-full bg-[#1a1a4d] px-3 py-1 text-xs font-semibold text-white">{plan.name} plan</span>
            <span className="text-sm text-[#081735]"><span className="font-semibold">{plan.fee}</span> one-time</span>
          </div>
        </div>
        <div className="rounded-2xl border border-black/5 p-6 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6D7A92]">Other card types</p>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-[#F9FFFB] px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-[#081735]"><CreditCard className="h-4 w-4 text-[#6D4AFF]" /> Global cards</span>
              <span className="font-semibold text-[#081735]">{rates.other.global}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#F9FFFB] px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-[#081735]"><Smartphone className="h-4 w-4 text-[#6D4AFF]" /> Local methods</span>
              <span className="font-semibold text-[#081735]">{rates.other.local}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#081735]">Monthly volume</p>
          <p className="text-sm font-semibold text-[#6D4AFF]">{fmtVol(volume)}</p>
        </div>
        <div className="relative mt-4 h-2 w-full rounded-full bg-[#E2E8F0]">
          <div className="absolute h-2 rounded-full bg-[#6D4AFF]" style={{ width: `${pct}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-white border-2 border-[#6D4AFF] shadow" style={{ left: `${pct}%` }} />
          <input type="range" min={0} max={100000} step={1000} value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Monthly volume" />
        </div>
        <p className="text-xs text-[#6D7A92] mt-2">Select your monthly volume to customize your rates.</p>
      </div>

      {/* Tier table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-black/5">
        <div className="grid grid-cols-3 bg-[#F1F5F9] text-xs font-semibold uppercase tracking-wider text-[#6D7A92]">
          <div className="px-4 py-3">In-person rate</div>
          <div className="px-4 py-3">Monthly volume</div>
          <div className="px-4 py-3">Plan</div>
        </div>
        {TIERS.map((row, i) => {
          const active = i === idx;
          return (
            <div key={i} className={`grid grid-cols-3 text-sm ${active ? "bg-[#E0D7FF] text-[#1a1a4d] font-semibold" : "text-[#081735] border-t border-black/5"}`}>
              <div className="px-4 py-3 font-medium">{rates.primary[i]}</div>
              <div className="px-4 py-3">{row.volume}</div>
              <div className="px-4 py-3">{PLANS[i].name} · {PLANS[i].fee}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}