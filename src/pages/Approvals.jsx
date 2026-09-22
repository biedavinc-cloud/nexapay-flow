import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Check, X } from "lucide-react";

export default function Approvals() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Tenant.list("-created_date", 100);
      setRows(all.filter((t) => t.account_status === "AWAITING_APPROVAL" || t.account_status === "PENDING_ONBOARDING"));
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (t, status) => {
    try {
      await base44.entities.Tenant.update(t.id, {
        account_status: status,
        has_paid_access: status === "APPROVED",
        kyc_status: status === "APPROVED" ? "APPROVED" : "REJECTED",
      });
      toast({ title: status === "APPROVED" ? "Marchand approuvé" : "Marchand refusé" });
      load();
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-heading font-semibold mb-1">Approbations marchands</h1>
      <p className="text-muted-foreground text-sm mb-6">Validez les comptes marchands en attente</p>
      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">Aucun marchand en attente.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{t.company_name}</div>
                <div className="text-xs text-muted-foreground">Tier {t.tier} · {t.phone || "—"} · {t.account_status}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decide(t, "APPROVED")}><Check className="w-4 h-4" /> Approuver</Button>
                <Button size="sm" variant="outline" onClick={() => decide(t, "REJECTED")}><X className="w-4 h-4" /> Refuser</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}