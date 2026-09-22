import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { Server } from "lucide-react";

const PROVIDERS = [
  { value: "KUCOIN", label: "KuCoin" },
  { value: "BINANCE", label: "Binance" },
  { value: "WEB3_DIRECT", label: "Web3 Direct" },
];
const STATUSES = [
  { value: "OPERATIONAL", label: "Opérationnel" },
  { value: "DEGRADED", label: "Dégradé" },
  { value: "DOWN", label: "Hors service" },
  { value: "DISABLED", label: "Désactivé" },
];

export default function GestionPrestataires() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Gestion des prestataires"
        description="Gérez les fournisseurs de routage crypto KuCoin, Binance et autres."
        icon={Server}
      />
      <ConfigManager
        entity="ProviderConfig"
        addLabel="Ajouter un fournisseur"
        fields={[
          { name: "provider", label: "Fournisseur", type: "select", options: PROVIDERS, default: "KUCOIN" },
          { name: "label", label: "Libellé", type: "text", placeholder: "KuCoin production" },
          { name: "status", label: "Statut", type: "select", options: STATUSES, default: "OPERATIONAL" },
          { name: "success_rate", label: "Taux de succès (%)", type: "number", default: 90 },
          { name: "enabled", label: "Activé", type: "boolean", default: true },
          { name: "is_default", label: "Par défaut", type: "boolean", default: false },
          { name: "notes", label: "Notes", type: "text", placeholder: "Notes internes", span: "full" },
        ]}
      />
    </div>
  );
}