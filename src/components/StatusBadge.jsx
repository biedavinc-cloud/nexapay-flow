import React from "react";
import { CheckCircle2, Clock, Loader2, XCircle, ArrowRightCircle } from "lucide-react";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/25", Icon: Clock },
  FIAT_APPROVED: { label: "Fiat Approved", color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/25", Icon: ArrowRightCircle },
  PROCESSING_CRYPTO: { label: "Processing", color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/25", Icon: Loader2 },
  COMPLETED: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/25", Icon: CheckCircle2 },
  FAILED: { label: "Failed", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/25", Icon: XCircle },
};

export default function StatusBadge({ status, className = "" }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === "PROCESSING_CRYPTO" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}