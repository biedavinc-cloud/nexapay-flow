import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { Link as LinkIcon } from "lucide-react";

const rand = () => Math.random().toString(36).slice(2, 16);

export default function Webhooks() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Webhooks"
        description="Définissez l'URL cible et le secret de signature pour recevoir les notifications."
        icon={LinkIcon}
      />
      <ConfigManager
        entity="WebhookEndpoint"
        addLabel="Ajouter un endpoint"
        fields={[
          { name: "label", label: "Libellé", type: "text", placeholder: "Marketplace prod" },
          { name: "url", label: "URL cible", type: "text", placeholder: "https://marche.com/webhooks/nexapay", span: "full" },
          { name: "signing_secret", label: "Secret de signature", type: "password", generate: () => `whsec_${rand()}` },
          { name: "events", label: "Événements", type: "text", default: "payment.succeeded,payment.failed", span: "full" },
          { name: "active", label: "Actif", type: "boolean", default: true },
        ]}
      />
    </div>
  );
}