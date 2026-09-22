import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { Wallet } from "lucide-react";

const CHAINS = [
  { value: "TRC20", label: "Tron (TRC20)" },
  { value: "ERC20", label: "Ethereum (ERC20)" },
  { value: "POLYGON", label: "Polygon" },
];

export default function Wallets() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Wallets de réception"
        description="Adresses USDT (TRC20 / ERC20 / Polygon) où la crypto est déposée après achat."
        icon={Wallet}
      />
      <ConfigManager
        entity="CryptoWallet"
        addLabel="Ajouter un wallet"
        fields={[
          { name: "label", label: "Libellé", type: "text", placeholder: "Trésorerie USDT" },
          { name: "address", label: "Adresse de réception", type: "text", placeholder: "T...", span: "full" },
          { name: "chain", label: "Réseau", type: "select", options: CHAINS, default: "TRC20" },
          { name: "currency", label: "Devise", type: "text", default: "USDT" },
          { name: "is_default", label: "Par défaut", type: "boolean", default: false },
        ]}
      />
    </div>
  );
}