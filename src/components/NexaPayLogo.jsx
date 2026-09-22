import { cn } from "@/lib/utils";

// Official NexaPay mark — the exact attached logo asset (white zigzag stroke
// on black). Rendered as-is; sized by the `size` prop.
const NEXAPAY_MARK_URL =
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/679c5d640_Nexapay.png";

export function NexaMark({ size = 28, className }) {
  // Brand-green zigzag with NO background: the white-on-black PNG is used as a
  // luminance mask (white = visible, black = transparent) over a green fill.
  const mask = `url(${NEXAPAY_MARK_URL})`;
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: "#3BB77E",
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskMode: "luminance",
        maskMode: "luminance",
      }}
      aria-hidden="true"
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