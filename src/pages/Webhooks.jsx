import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { Link as LinkIcon } from "lucide-react";

const adapter = {
  list: async () => {
    const res = await fetch("/api/merchant/webhooks", { credentials: "include" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load");
    return res.json();
  },
  create: async (record) => {
    const res = await fetch("/api/merchant/webhooks", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: record.label, url: record.url, events: record.events }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Failed to create");
    return d;
  },
  toggle: async (id, field, value) => {
    const res = await fetch(`/api/merchant/webhooks/${id}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Update failed");
  },
  remove: async (id) => {
    const res = await fetch(`/api/merchant/webhooks/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Delete failed");
  },
};

export default function Webhooks() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Webhooks"
        description="Définissez l'URL cible et le secret de signature pour recevoir les notifications."
        icon={LinkIcon}
      />
      <ConfigManager
        adapter={adapter}
        addLabel="Ajouter un endpoint"
        fields={[
          { name: "label", label: "Libellé", type: "text", placeholder: "Marketplace prod" },
          { name: "url", label: "URL cible", type: "text", placeholder: "https://marche.com/webhooks/nexapay", span: "full" },
          { name: "signing_secret", label: "Secret de signature", type: "password", generate: () => "" },
          { name: "events", label: "Événements", type: "text", default: "payment.succeeded,payment.failed", span: "full" },
          { name: "active", label: "Actif", type: "boolean", default: true },
        ]}
      />
    </div>
  );
}
