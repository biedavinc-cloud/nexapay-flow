import { cn } from "@/lib/utils";

// Official NexaPay mark — the green "N" (#3BB77E) only, transparent background.
// Drawn as one continuous angular stroke (left vertical slightly shorter than
// the right). No container, no fill behind it.
const GREEN = "#3BB77E";

export function NexaMark({ size = 28, className }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 25 L32 75 L68 20 L68 80"
        stroke={GREEN}
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NexaPayLogo({
  size = 28,
  wordmark = true,
  wordmarkClassName = "text-foreground",
  className,
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <NexaMark size={size} />
      {wordmark && (
        <span className={cn("font-semibold tracking-tight", wordmarkClassName)}>NexaPay</span>
      )}
    </span>
  );
}