import { cn } from "@/lib/utils";

// Official NexaPay mark — a geometric eye (almond outline + centered solid
// pupil), transparent background. Uses currentColor so it adapts to the
// surrounding text color: navy on light surfaces, white on dark surfaces.
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
        d="M8 50 C30 24 70 24 92 50 C70 76 30 76 8 50 Z"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="13" fill="currentColor" />
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
      <NexaMark size={size} className={wordmarkClassName} />
      {wordmark && (
        <span className={cn("font-semibold tracking-tight", wordmarkClassName)}>NexaPay</span>
      )}
    </span>
  );
}