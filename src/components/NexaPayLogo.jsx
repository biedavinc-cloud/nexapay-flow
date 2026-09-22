import { cn } from "@/lib/utils";

// Official NexaPay mark — the exact attached logo asset (white zigzag stroke
// on black). Rendered as-is; sized by the `size` prop.
const NEXAPAY_MARK_URL =
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/679c5d640_Nexapay.png";

export function NexaMark({ size = 28, className }) {
  return (
    <img
      src={NEXAPAY_MARK_URL}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 object-contain rounded-sm", className)}
    />
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