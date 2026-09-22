import { cn } from "@/lib/utils";

// Official NexaPay mark — a rounded diamond (eye aperture, 4-fold symmetric)
// with a solid square pupil at its center. Transparent background; uses
// currentColor so it adapts to the surrounding text color (navy on light,
// white on dark).
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
      {/* Rounded diamond aperture — four convex sides meeting at four points */}
      <path
        d="M50 6 C66 14 86 34 94 50 C86 66 66 86 50 94 C34 86 14 66 6 50 C14 34 34 14 50 6 Z"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      {/* Square pupil */}
      <rect x="37" y="37" width="26" height="26" fill="currentColor" />
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