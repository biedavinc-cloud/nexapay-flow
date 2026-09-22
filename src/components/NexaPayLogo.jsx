import { cn } from "@/lib/utils";

// Official NexaPay mark — green "N" (#3BB77E) on a pure-black square (#000000),
// drawn as one continuous angular stroke (left vertical slightly shorter than
// the right). variant="ringed" adds a faint white ring so the black square stays
// visible on dark backgrounds (footer / auth panel).
const GREEN = "#3BB77E";

export function NexaMark({ size = 36, variant = "solid", className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg shrink-0",
        variant === "ringed" && "ring-1 ring-white/15",
        className
      )}
      style={{ width: size, height: size, background: "#000000" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size * 0.6} height={size * 0.6}>
        <path
          d="M34 26 L34 74 L66 20 L66 80"
          stroke={GREEN}
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

export default function NexaPayLogo({
  size = 36,
  variant = "solid",
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