import React from "react";

const TONES = {
  OPERATIONAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DEGRADED: "bg-amber-50 text-amber-700 border-amber-200",
  DOWN: "bg-red-50 text-red-700 border-red-200",
  DISABLED: "bg-slate-100 text-slate-500 border-slate-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PROCESSING_CRYPTO: "bg-sky-50 text-sky-700 border-sky-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FIAT_APPROVED: "bg-sky-50 text-sky-700 border-sky-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RETRYING: "bg-amber-50 text-amber-700 border-amber-200",
  INFO: "bg-sky-50 text-sky-700 border-sky-200",
  WARN: "bg-amber-50 text-amber-700 border-amber-200",
  ERROR: "bg-red-50 text-red-700 border-red-200",
};

export default function StatusPill({ status, className = "" }) {
  const tone = TONES[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone} ${className}`}>
      {status}
    </span>
  );
}