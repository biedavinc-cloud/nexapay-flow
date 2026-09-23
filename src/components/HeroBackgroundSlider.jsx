import React, { useEffect, useState } from "react";
import { Image } from "@/components/ui/image";

const IMAGES = [
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/9fbb74edb_leonhard_niederwimmer-frankfurt-4945405_1920.jpg",
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/e04ba5f27_fotoblend-banknotes-7850299_1920.jpg",
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/336c97c4d_joseweslley899-ai-generated-8964754_1920.png",
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/9049276e5_daniel_nebreda-architecture-3134465_1920.jpg",
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/00a072d27_joseweslley899-ai-generated-8964580_1920.png",
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/224439020_ccfb-finance-4858797_1920.jpg",
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/6cea13712_51581-work-1627703_1920.jpg",
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/e2bac2303_thedigitalway-credit-cards-1583534_1920.jpg",
  "https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/9b0e0811e_trixtammy-mirroring-4661419_1920.jpg",
];

export default function HeroBackgroundSlider({ interval = 4500 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % IMAGES.length), interval);
    return () => clearInterval(t);
  }, [interval]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {IMAGES.map((src, idx) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
          style={{ opacity: idx === i ? 0.9 : 0 }}
          aria-hidden="true"
        >
          <Image src={src} alt="" className="h-full w-full" fittingType="fill" />
        </div>
      ))}
      {/* Scrim for legibility over a light theme — keeps the hero text crisp while the photos read through. */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-transparent to-white/85" />
    </div>
  );
}