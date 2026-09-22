import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FRANC_ZONE_FIRST } from "@/lib/countries";

export function CountrySelect({ value, onValueChange, placeholder = "Sélectionner un pays" }) {
  const franc = FRANC_ZONE_FIRST.filter((c) => c.francZone);
  const others = FRANC_ZONE_FIRST.filter((c) => !c.francZone);
  const current = FRANC_ZONE_FIRST.find((c) => c.code === value);
  return (
    <Select value={value || ""} onValueChange={onValueChange}>
      <SelectTrigger className="rounded-xl">
        <SelectValue placeholder={placeholder}>
          {current ? `${current.flag} ${current.name}` : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Zone Franc (XAF / XOF)</SelectLabel>
          {franc.map((c) => (
            <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Autres pays</SelectLabel>
          {others.map((c) => (
            <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function DialCodeSelect({ value, onValueChange, placeholder = "Indicatif" }) {
  return (
    <Select value={value || ""} onValueChange={onValueChange}>
      <SelectTrigger className="rounded-xl w-28">
        <SelectValue placeholder={placeholder}>{value || placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {FRANC_ZONE_FIRST.map((c) => (
          <SelectItem key={c.code} value={c.dial}>{c.flag} {c.dial}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}