import React from "react";

// Inline SVG brand marks so the checkout shows real card logos instead of text.
export default function CardBrandLogo({ brand }) {
  const b = (brand || "").toLowerCase();
  const cls = "h-6";

  if (b === "visa") {
    return (
      <svg viewBox="0 0 64 22" className={cls} role="img" aria-label="Visa" preserveAspectRatio="xMidYMid meet">
        <rect width="64" height="22" rx="3" fill="#1A1F71" />
        <text x="32" y="15" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontStyle="italic" fontSize="11" fill="#FFFFFF" letterSpacing="0.5">VISA</text>
      </svg>
    );
  }
  if (b === "mastercard") {
    return (
      <svg viewBox="0 0 64 22" className={cls} role="img" aria-label="Mastercard" preserveAspectRatio="xMidYMid meet">
        <rect width="64" height="22" rx="3" fill="#FFFFFF" />
        <circle cx="27" cy="11" r="7" fill="#EB001B" />
        <circle cx="37" cy="11" r="7" fill="#F79E1B" opacity="0.9" />
      </svg>
    );
  }
  if (b === "amex") {
    return (
      <svg viewBox="0 0 64 22" className={cls} role="img" aria-label="American Express" preserveAspectRatio="xMidYMid meet">
        <rect width="64" height="22" rx="3" fill="#2E77BB" />
        <text x="32" y="15" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="7.5" fill="#FFFFFF" letterSpacing="0.5">AMEX</text>
      </svg>
    );
  }
  if (b === "discover") {
    return (
      <svg viewBox="0 0 64 22" className={cls} role="img" aria-label="Discover" preserveAspectRatio="xMidYMid meet">
        <rect width="64" height="22" rx="3" fill="#FFFFFF" />
        <circle cx="48" cy="11" r="6" fill="#F76B1C" opacity="0.85" />
        <text x="30" y="15" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="6.5" fill="#1A1A1A" letterSpacing="0.3">DISCOVER</text>
      </svg>
    );
  }
  if (b === "diners") {
    return (
      <svg viewBox="0 0 64 22" className={cls} role="img" aria-label="Diners Club" preserveAspectRatio="xMidYMid meet">
        <rect width="64" height="22" rx="3" fill="#FFFFFF" />
        <circle cx="32" cy="11" r="7.5" fill="#0079BE" />
        <path d="M32 4 a7 7 0 0 0 0 14 z" fill="#FFFFFF" />
        <text x="44" y="14" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="5" fill="#0079BE">DINERS</text>
      </svg>
    );
  }
  if (b === "jcb") {
    return (
      <svg viewBox="0 0 64 22" className={cls} role="img" aria-label="JCB" preserveAspectRatio="xMidYMid meet">
        <rect width="64" height="22" rx="3" fill="#0E4C96" />
        <text x="14" y="15" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="9" fill="#FFFFFF">J</text>
        <text x="32" y="15" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="9" fill="#FFFFFF">C</text>
        <text x="50" y="15" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="9" fill="#FFFFFF">B</text>
      </svg>
    );
  }
  return null;
}