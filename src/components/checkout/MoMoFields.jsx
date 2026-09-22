import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, FRANC_ZONE_FIRST, detectOperator } from "@/lib/countries";

const L = {
  FR: { country: "Pays", phone: "Numéro de téléphone", phCountry: "Sélectionner un pays", operator: "Opérateur détecté", push: "Un code OTP / push USSD sera envoyé pour confirmer le paiement." },
  EN: { country: "Country", phone: "Phone number", phCountry: "Select country", operator: "Detected operator", push: "An OTP / USSD push will be sent to confirm the payment." },
};

export default function MoMoFields({ value, onChange, lang = "FR" }) {
  const t = L[lang] || L.FR;
  const country = value.country || "";
  const countryObj = useMemo(() => COUNTRIES.find((c) => c.code === country), [country]);
  const prefix = value.prefix || countryObj?.dial || "";
  const operator = useMemo(() => detectOperator(prefix, value.phone || ""), [prefix, value.phone]);

  const onCountry = (code) => {
    const c = COUNTRIES.find((x) => x.code === code);
    onChange("country", code);
    if (c) onChange("prefix", c.dial);
    onChange("provider", detectOperator(c?.dial || "", value.phone || ""));
  };
  const onPhone = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 12);
    onChange("phone", raw);
    onChange("provider", detectOperator(prefix, raw));
  };

  const franc = FRANC_ZONE_FIRST.filter((c) => c.francZone);
  const others = FRANC_ZONE_FIRST.filter((c) => !c.francZone);
  const current = COUNTRIES.find((c) => c.code === country);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t.country}</Label>
        <Select value={country} onValueChange={onCountry}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder={t.phCountry}>
              {current ? `${current.flag} ${current.name}` : t.phCountry}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Zone Franc (XAF / XOF)</SelectLabel>
              {franc.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Autres pays</SelectLabel>
              {others.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="momo-phone">{t.phone}</Label>
        <div className="flex gap-2">
          <Input value={prefix} readOnly className="rounded-xl w-28 bg-muted/40 font-medium" />
          <Input
            id="momo-phone"
            inputMode="tel"
            value={value.phone || ""}
            onChange={onPhone}
            placeholder="612345678"
            className="rounded-xl flex-1"
          />
        </div>
        {operator && <Badge variant="secondary" className="mt-1">{t.operator}: {operator}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">{t.push}</p>
    </div>
  );
}