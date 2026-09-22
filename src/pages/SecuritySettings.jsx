import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { ShieldAlert, Lock } from "lucide-react";

export default function SecuritySettings() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Sécurité & Whitelist IP"
        description="Adresses IP autorisées à appeler vos API et clé de sécurité serveur."
        icon={ShieldAlert}
      />
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-5 flex items-start gap-2 text-sm text-amber-700">
        <Lock className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          La clé de sécurité serveur (signature webhook <code>whsec_</code>) se configure dans la page
          <strong> Secrets</strong> du tableau de bord. Cette page gère la whitelist IP.
        </span>
      </div>
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