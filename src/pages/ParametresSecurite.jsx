import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { ShieldAlert } from "lucide-react";

export default function ParametresSecurite() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Paramètres de sécurité"
        description="Adresses IP autorisées à appeler vos API et périodes de validité des accès."
        icon={ShieldAlert}
      />
      <ConfigManager
        entity="SecurityIp"
        addLabel="Autoriser une IP"
        fields={[
          { name: "ip", label: "Adresse IP / CIDR", type: "text", placeholder: "192.168.1.1 ou 10.0.0.0/24" },
          { name: "label", label: "Libellé", type: "text", placeholder: "Serveur marketplace" },
          { name: "active", label: "Active", type: "boolean", default: true },
          { name: "expires_at", label: "Expire le", type: "date" },
        ]}
      />
    </div>
  );
}