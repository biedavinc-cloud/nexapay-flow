import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { Server, Lock } from "lucide-react";

const PROVIDERS = [
  { value: "KUCOIN", label: "KuCoin" },
  { value: "BINANCE", label: "Binance" },
  { value: "BINGX", label: "BingX" },
  { value: "COINBASE", label: "Coinbase" },
  { value: "WEB3_DIRECT", label: "Web3 Direct" },
];
const STATUSES = [
  { value: "OPERATIONAL", label: "Opérationnel" },
  { value: "DEGRADED", label: "Dégradé" },
  { value: "DOWN", label: "Hors service" },
  { value: "DISABLED", label: "Désactivé" },
];

export default function ManageProviders() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Fournisseurs crypto"
        description="Configurez les exchanges et activez/désactivez les retraits."
        icon={Server}
      />
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-5 flex items-start gap-2 text-sm text-amber-700">
        <Lock className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Les clés API secrètes des exchanges se configurent dans la page <strong>Secrets</strong> du tableau de bord
          (KUCOIN_API_KEY / KUCOIN_API_SECRET / KUCOIN_PASSPHRASE, BINANCE_API_KEY / BINANCE_API_SECRET,
          BINGX_API_KEY / BINGX_API_SECRET, COINBASE_API_KEY / COINBASE_API_SECRET).
          Le portefeuille de réception USDT se configure dans la page <strong>Portefeuilles crypto</strong>.
          Cette page gère l'activation des retraits et les métadonnées.
        </span>
      </div>
      <ConfigManager
        entity="ProviderConfig"
        addLabel="Ajouter un exchange"
        fields={[
          { name: "provider", label: "Exchange", type: "select", options: PROVIDERS, default: "KUCOIN" },
          { name: "label", label: "Libellé", type: "text", placeholder: "KuCoin production" },
          { name: "status", label: "Statut", type: "select", options: STATUSES, default: "OPERATIONAL" },
          { name: "success_rate", label: "Taux de succès (%)", type: "number", default: 90 },
          { name: "enabled", label: "Activé", type: "boolean", default: true },
          { name: "withdrawals_enabled", label: "Retraits activés", type: "boolean", default: false },
          { name: "is_default", label: "Par défaut", type: "boolean", default: false },
          { name: "api_key_label", label: "Libellé clé API", type: "text", placeholder: "nexa-kucoin-prod", span: "full" },
          { name: "has_api_secret", label: "API secret configuré", type: "boolean", default: false },
          { name: "has_passphrase", label: "Passphrase configurée", type: "boolean", default: false },
          { name: "notes", label: "Notes", type: "text", placeholder: "Notes internes", span: "full" },
        ]}
      />
    </div>
  );
}