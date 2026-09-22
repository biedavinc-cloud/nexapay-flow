import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { Wallet } from "lucide-react";

const CHAINS = [
  { value: "TRC20", label: "TRC20 (Tron)" },
  { value: "ERC20", label: "ERC20 (Ethereum)" },
  { value: "BEP20", label: "BEP20 (BSC)" },
  { value: "POLYGON", label: "Polygon" },
];

export default function CryptoWallets() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Portefeuilles crypto"
        description="Adresses de dépôt où les fonds convertis sont envoyés après règlement."
        icon={Wallet}
      />
      <ConfigManager
        entity="CryptoWallet"
        addLabel="Ajouter un portefeuille"
        fields={[
          { name: "label", label: "Libellé", type: "text", placeholder: "Trésorerie USDT" },
          { name: "address", label: "Adresse de dépôt", type: "text", placeholder: "T...", span: "full" },
          { name: "chain", label: "Réseau", type: "select", options: CHAINS, default: "TRC20" },
          { name: "currency", label: "Devise", type: "text", default: "USDT" },
          { name: "is_default", label: "Par défaut", type: "boolean", default: false },
        ]}
      />
    </div>
  );
}