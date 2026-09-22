import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import CardBrandLogo from "@/components/checkout/CardBrandLogo";

const L = {
  FR: { number: "Numéro de carte", expiry: "Expiration", cvc: "CVC", name: "Nom du titulaire", phName: "Jean Dupont" },
  EN: { number: "Card number", expiry: "Expiry", cvc: "CVC", name: "Cardholder name", phName: "John Doe" },
};

// Instant prefix-based brand detection (logo appears as the user types).
function detectBrand(num) {
  const n = (num || "").replace(/\s+/g, "");
  if (!n) return "";
  if (/^35(2[89]|[3-8][0-9])/.test(n)) return "JCB";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(30[0-5]|3095|36|38|39)/.test(n)) return "Diners";
  if (/^(6011|65|64[4-9]|622)/.test(n)) return "Discover";
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  return "";
}

// Full-length validators (used at submission).
export function validateCardBrand(num) {
  const n = (num || "").replace(/\s+/g, "");
  if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(n)) return "Visa";
  if (/^(5[1-5][0-9]{14}|2(?:2(?:2[1-9]|[3-9][0-9])|[3-6][0-9][0-9]|7(?:[01][0-9]|20))[0-9]{12})$/.test(n)) return "Mastercard";
  if (/^3[47][0-9]{13}$/.test(n)) return "Amex";
  if (/^6(?:011|5[0-9]{2})[0-9]{12}$/.test(n)) return "Discover";
  if (/^3(?:0[0-5]|095)[0-9]{11}$/.test(n) || /^36[0-9]{12}$/.test(n)) return "Diners";
  if (/^(352[89]|35[3-8][0-9])[0-9]{12}$/.test(n)) return "JCB";
  return "";
}

function formatNumber(digits, brand) {
  if (brand === "Amex") {
    const d = digits.slice(0, 15);
    const a = d.slice(0, 4);
    const b = d.slice(4, 10);
    const c = d.slice(10, 15);
    return [a, b, c].filter(Boolean).join(" ");
  }
  const d = digits.slice(0, 16);
  return d.replace(/(.{4})(?=.)/g, "$1 ").trim();
}

export default function CardFields({ value, onChange, lang = "FR" }) {
  const t = L[lang] || L.FR;
  const brand = detectBrand((value.number || ""));

  const handleNumber = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    const b = detectBrand(digits);
    onChange("number", formatNumber(digits, b));
  };
  const handleExpiry = (e) => {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) digits = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    onChange("expiry", digits);
  };
  const handleCvc = (e) => {
    const max = brand === "Amex" ? 4 : 3;
    onChange("cvc", e.target.value.replace(/\D/g, "").slice(0, max));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="card-number">{t.number}</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="card-number"
            inputMode="numeric"
            value={value.number}
            onChange={handleNumber}
            placeholder="4242 4242 4242 4242"
            className="rounded-xl pl-9 pr-20"
          />
          {brand && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <CardBrandLogo brand={brand} />
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="card-expiry">{t.expiry}</Label>
          <Input
            id="card-expiry"
            inputMode="numeric"
            value={value.expiry}
            onChange={handleExpiry}
            placeholder="MM/YY"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="card-cvc">{t.cvc}</Label>
          <Input
            id="card-cvc"
            inputMode="numeric"
            value={value.cvc}
            onChange={handleCvc}
            placeholder={brand === "Amex" ? "1234" : "123"}
            className="rounded-xl"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="card-name">{t.name}</Label>
        <Input
          id="card-name"
          value={value.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder={t.phName}
          className="rounded-xl"
        />
      </div>
    </div>
  );
}