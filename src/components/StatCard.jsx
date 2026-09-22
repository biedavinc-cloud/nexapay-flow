import React from "react";

export default function StatCard({ label, value, sub, icon: Icon, accent = "text-primary" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className={`h-4.5 w-4.5 ${accent}`} />}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}