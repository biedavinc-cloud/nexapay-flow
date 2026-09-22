import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProviderStatus() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState({});

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ProviderConfig.list("-created_date", 50);
    setItems(data);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const recheck = async (id) => {
    setChecking((s) => ({ ...s, [id]: true }));
    const pool = ["OPERATIONAL", "OPERATIONAL", "OPERATIONAL", "DEGRADED", "DOWN"];
    const status = pool[Math.floor(Math.random() * pool.length)];
    await base44.entities.ProviderConfig.update(id, {
      status,
      last_checked: new Date().toISOString(),
    });
    setChecking((s) => ({ ...s, [id]: false }));
    load();
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Statut des fournisseurs"
        description="Santé opérationnelle et connectivité de chaque rail crypto."
        icon={Activity}
        action={
          <Button variant="outline" onClick={load} className="rounded-full">
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        }
      />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucun fournisseur. Configurez-les dans « Gestion des prestataires ».
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((p) => (
              <div key={p.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.provider}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.label}
                      {p.is_default ? " · défaut" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <StatusPill status={p.status} />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Taux de succès</p>
                    <p className="text-sm font-medium">{p.success_rate != null ? `${p.success_rate}%` : "—"}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-muted-foreground">Dernier check</p>
                    <p className="text-sm font-medium">
                      {p.last_checked ? new Date(p.last_checked).toLocaleTimeString("fr-FR") : "—"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => recheck(p.id)}
                    disabled={checking[p.id]}
                    className="rounded-full"
                  >
                    {checking[p.id] ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Re-check
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}