import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_STYLE = {
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  RETRYING: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function WebhookAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.WebhookLog.list("-created_date", 200);
      setLogs(data);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = filter === "ALL" ? logs : logs.filter((l) => l.status === filter);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Audit des Webhooks"
        description="Historique des notifications envoyées aux plateformes partenaires, statuts HTTP et tentatives de réessai."
        icon={ScrollText}
      />

      <div className="flex items-center gap-2 mb-4">
        {["ALL", "SUCCESS", "FAILED", "RETRYING"].map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter(s)}
          >
            {s === "ALL" ? "Tous" : s === "SUCCESS" ? "Succès" : s === "FAILED" ? "Échecs" : "Réessais"}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="rounded-full ml-auto" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Actualiser
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Aucun webhook envoyé pour le moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Événement</th>
                  <th className="px-4 py-3 font-medium">Endpoint</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">HTTP</th>
                  <th className="px-4 py-3 font-medium">Tentatives</th>
                  <th className="px-4 py-3 font-medium">Commande</th>
                  <th className="px-4 py-3 font-medium">Réponse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(l.created_date).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 font-medium">{l.event}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{l.endpoint_url}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_STYLE[l.status] || ""}>{l.status}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono">{l.http_status ?? "—"}</td>
                    <td className="px-4 py-3">{l.attempts ?? 1}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{l.order_id || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[260px] truncate">{l.response_snippet || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}