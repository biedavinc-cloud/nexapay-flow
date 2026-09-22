import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { Webhook, Loader2, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function WebhookConsole() {
  const [webhooks, setWebhooks] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [w, e] = await Promise.all([
        base44.entities.WebhookLog.list("-created_date", 100),
        base44.entities.TransactionLog.filter({ level: "ERROR" }, "-created_date", 100),
      ]);
      setWebhooks(w);
      setErrors(e);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Console webhooks"
        description="Webhooks envoyés au marketplace et journaux d'erreurs d'exécution API."
        icon={Webhook}
      />
      <Tabs defaultValue="webhooks">
        <TabsList className="rounded-xl">
          <TabsTrigger value="webhooks" className="rounded-xl">Webhooks ({webhooks.length})</TabsTrigger>
          <TabsTrigger value="errors" className="rounded-xl">Erreurs API ({errors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : webhooks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Aucun webhook envoyé.</div>
            ) : (
              <div className="divide-y divide-border">
                {webhooks.map((l) => (
                  <div key={l.id} className="p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2 w-56 shrink-0">
                      <StatusPill status={l.status} />
                      <span className="text-xs text-muted-foreground">{new Date(l.created_date).toLocaleString("fr-FR")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.event} · {l.order_id || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.endpoint_url}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">HTTP {l.http_status || "—"} · {l.attempts || 1} tentative(s)</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="errors" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : errors.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Aucune erreur d'exécution.</div>
            ) : (
              <div className="divide-y divide-border">
                {errors.map((l) => (
                  <div key={l.id} className="p-4 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.reference_fiat || l.transaction_id} · {l.from_status || "—"} → {l.to_status} · {l.actor} · {new Date(l.created_date).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}