import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { KeyRound } from "lucide-react";

const rand = () => Math.random().toString(36).slice(2, 12);

export default function ApiKeys() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Clés API"
        description="Générez les clés (secrète + publique) pour connecter votre marketplace."
        icon={KeyRound}
      />
      <ConfigManager
        entity="ApiKey"
        addLabel="Générer une paire de clés"
        fields={[
          { name: "label", label: "Libellé", type: "text", placeholder: "Marketplace production", span: "full" },
          { name: "secret_key", label: "Clé secrète", type: "password", hidden: true, generate: () => `nexa_sk_live_${rand()}` },
          { name: "publishable_key", label: "Clé publique", type: "text", hidden: true, generate: () => `nexa_pk_live_${rand()}` },
          { name: "active", label: "Active", type: "boolean", default: true },
        ]}
      />
    </div>
  );
}