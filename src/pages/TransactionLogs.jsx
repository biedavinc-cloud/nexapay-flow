import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { ScrollText, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TransactionLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("ALL");

  useEffect(() => {
    (async () => {
      const data = await base44.entities.TransactionLog.list("-created_date", 200);
      setLogs(data);
      setLoading(false);
    })();
  }, []);

  const filtered = level === "ALL" ? logs : logs.filter((l) => l.level === level);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Journal des transactions"
        description="Piste d'audit : changements de statut et erreurs système."
        icon={ScrollText}
        action={
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous niveaux</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucun log.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((l) => (
              <div key={l.id} className="p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2 w-56 shrink-0">
                  <StatusPill status={l.level} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.created_date).toLocaleString("fr-FR")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.reference_fiat || l.transaction_id} · {l.from_status || "—"} → {l.to_status} · {l.actor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}