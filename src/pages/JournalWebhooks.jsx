import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { Webhook, Loader2 } from "lucide-react";

export default function JournalWebhooks() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await base44.entities.WebhookLog.list("-created_date", 200);
      setLogs(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Journal des webhooks"
        description="Historique des notifications envoyées au marketplace, statuts et tentatives."
        icon={Webhook}
      />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucun webhook envoyé.</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((l) => (
              <div key={l.id} className="p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2 w-56 shrink-0">
                  <StatusPill status={l.status} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.created_date).toLocaleString("fr-FR")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {l.event} · {l.order_id || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{l.endpoint_url}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  HTTP {l.http_status || "—"} · {l.attempts || 1} tentative(s)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}