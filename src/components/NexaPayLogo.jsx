import { cn } from "@/lib/utils";

// Official NexaPay mark — the exact attached logo asset (white zigzag stroke
// on black). Rendered as-is; sized by the `size` prop.
const NEXAPAY_MARK_URL =
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/679c5d640_Nexapay.png";

export function NexaMark({ size = 28, className }) {
  // White-on-black mark tinted to the brand green via a multiply overlay:
  // green × white = green, green × black = black → green zigzag on black.
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-sm", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={NEXAPAY_MARK_URL}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        className="block h-full w-full object-contain"
      />
      <span className="pointer-events-none absolute inset-0 bg-[#3BB77E] mix-blend-multiply" />
    </span>
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