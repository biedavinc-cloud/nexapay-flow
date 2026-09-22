import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { Coins } from "lucide-react";

export default function CurrencyManagement() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Gestion des devises"
        description="Définissez les devises fiat supportées et les seuils de conversion automatique vers USDT."
        icon={Coins}
      />
      <ConfigManager
        entity="CurrencyConfig"
        addLabel="Ajouter une devise"
        fields={[
          { name: "code", label: "Code ISO", type: "text", placeholder: "EUR", span: "full" },
          { name: "label", label: "Libellé", type: "text", placeholder: "Euro" },
          { name: "symbol", label: "Symbole", type: "text", placeholder: "€" },
          { name: "enabled", label: "Acceptée", type: "boolean", default: true },
          { name: "auto_convert", label: "Conversion auto USDT", type: "boolean", default: true },
          { name: "min_threshold", label: "Seuil min. (fiat)", type: "number", default: 0 },
          { name: "margin_pct", label: "Marge (%)", type: "number", default: 0 },
        ]}
      />
    </div>
  );
}