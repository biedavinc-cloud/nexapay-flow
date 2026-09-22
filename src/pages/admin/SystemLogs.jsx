import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function AdminSystemLogs() {
  const [tab, setTab] = useState("webhooks");
  const [wh, setWh] = useState([]);
  const [errs, setErrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [w, e] = await Promise.all([
          base44.entities.WebhookLog.list("-created_date", 200),
          base44.entities.TransactionLog.filter({ level: "ERROR" }, "-created_date", 200),
        ]);
        setWh(w); setErrs(e);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <h1 className="text-2xl font-heading font-semibold">Journal des erreurs & console webhooks</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab("webhooks")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "webhooks" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>Webhooks</button>
        <button onClick={() => setTab("errors")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "errors" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>Erreurs</button>
      </div>

      {loading ? <p className="text-muted-foreground">Chargement…</p> : tab === "webhooks" ? (
        <div className="overflow-x-auto bg-card border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr><th className="py-3 px-4">Date</th><th className="py-3 px-4">Événement</th><th className="py-3 px-4">URL</th><th className="py-3 px-4">HTTP</th><th className="py-3 px-4">Statut</th><th className="py-3 px-4">Order</th></tr>
            </thead>
            <tbody>
              {wh.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="py-2 px-4 text-xs text-muted-foreground">{(l.created_date || "").slice(0, 19)}</td>
                  <td className="py-2 px-4 font-mono text-xs">{l.event}</td>
                  <td className="py-2 px-4 text-xs truncate max-w-[220px]">{l.endpoint_url}</td>
                  <td className="py-2 px-4">{l.http_status || "—"}</td>
                  <td className="py-2 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${l.status === "SUCCESS" ? "bg-emerald-50 text-emerald-600" : l.status === "RETRYING" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>{l.status}</span></td>
                  <td className="py-2 px-4 text-xs font-mono">{l.order_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2">
          {errs.length === 0 ? <p className="text-muted-foreground">Aucune erreur récente.</p> : errs.map((l) => (
            <div key={l.id} className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <div className="text-xs text-red-500">{(l.created_date || "").slice(0, 19)} · {l.reference_fiat || ""}</div>
              <div className="text-red-700 mt-0.5">{l.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}