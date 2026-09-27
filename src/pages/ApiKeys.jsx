import React from "react";
import PageHeader from "@/components/PageHeader";
import ConfigManager from "@/components/admin/ConfigManager";
import { KeyRound } from "lucide-react";

const adapter = {
  list: async () => {
    const res = await fetch("/api/merchant/api-keys", { credentials: "include" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load");
    return res.json();
  },
  create: async (record) => {
    const res = await fetch("/api/merchant/api-keys", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: record.label }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Failed to create");
    return d;
  },
  toggle: async (id, field, value) => {
    const res = await fetch(`/api/merchant/api-keys/${id}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Update failed");
  },
  remove: async (id) => {
    const res = await fetch(`/api/merchant/api-keys/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Delete failed");
  },
};

export default function ApiKeys() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Clés API"
        description="Générez les clés (secrète + publique) pour connecter votre marketplace."
        icon={KeyRound}
      />
      <ConfigManager
        adapter={adapter}
        addLabel="Générer une paire de clés"
        fields={[
          { name: "label", label: "Libellé", type: "text", placeholder: "Marketplace production", span: "full" },
          { name: "secret_key", label: "Clé secrète", type: "password", hidden: true, generate: () => "" },
          { name: "publishable_key", label: "Clé publique", type: "text", hidden: true, generate: () => "" },
          { name: "active", label: "Active", type: "boolean", default: true },
        ]}
      />
    </div>
  );
}
