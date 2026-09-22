import { cn } from "@/lib/utils";

// Official NexaPay mark — geometric "N" (diagonal + right vertical, negative-space gap)
// rendered in the platform green (#3BB77E = --primary).
const GREEN = "#3BB77E";

export function NexaMark({ size = 36, variant = "navy", className }) {
  const bg = variant === "translucent" ? "rgba(255,255,255,0.12)" : "#081735";
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-lg shrink-0", className)}
      style={{ width: size, height: size, background: bg }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size * 0.6} height={size * 0.6}>
        {/* right vertical stroke */}
        <rect x="58" y="18" width="15" height="64" rx="7.5" fill={GREEN} />
        {/* diagonal stroke top-left → bottom-right */}
        <path d="M30 20 L70 80" stroke={GREEN} strokeWidth="15" strokeLinecap="round" fill="none" />
      </svg>
    </span>
  );
}

export default function NexaPayLogo({
  size = 36,
  variant = "navy",
  wordmark = true,
  wordmarkClassName = "text-foreground",
  className,
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <NexaMark size={size} variant={variant} />
      {wordmark && (
        <span className={cn("font-semibold tracking-tight", wordmarkClassName)}>NexaPay</span>
      )}
    </span>
  );
}