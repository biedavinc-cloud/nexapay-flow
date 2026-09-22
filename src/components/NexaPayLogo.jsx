import { cn } from "@/lib/utils";

// Official NexaPay mark — green cards + padlock icon. The source PNG is green
// icon on a solid black background; we render only the icon in brand green with
// a transparent background by using the image as a luminance mask (bright =
// visible, black = transparent) over a green fill.
const NEXAPAY_MARK_URL =
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/59c01e422_1Nexapay.png";

export function NexaMark({ size = 28, className }) {
  const mask = `url(${NEXAPAY_MARK_URL})`;
  const layerStyle = {
    position: "absolute",
    inset: 0,
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
  };
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Stacked masked layers so the green icon reads as fully opaque
          (the icon's mid-luminance green otherwise masks at ~53% alpha). */}
      <span style={layerStyle} />
      <span style={layerStyle} />
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