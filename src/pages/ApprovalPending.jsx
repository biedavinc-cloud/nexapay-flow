import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { auth } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, XCircle, RefreshCw } from "lucide-react";

export default function ApprovalPending() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, status: null, tenant: null });

  const load = async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const me = await auth.me();
      if (me.role === "admin") { navigate("/dashboard", { replace: true }); return; }
      if (!me.tenant_id) { navigate("/onboarding", { replace: true }); return; }
      const tenant = await base44.entities.Tenant.get(me.tenant_id);
      setState({ loading: false, status: tenant.account_status, tenant });
      if (tenant.account_status === "APPROVED") {
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
      }
    } catch {
      setState({ loading: false, status: "ERROR", tenant: null });
    }
  };

  useEffect(() => { load(); }, []);

  if (state.loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Vérification…</div>;

  const status = state.status;
  return (
    <div className="min-h-screen bg-secondary/40 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
        {status === "AWAITING_APPROVAL" && (
          <>
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4"><Clock className="w-7 h-7 text-amber-600" /></div>
            <h1 className="text-xl font-heading font-semibold">Compte en attente de validation</h1>
            <p className="text-sm text-muted-foreground mt-2">Notre équipe vérifie votre dossier KYC. Le Dashboard sera débloqué automatiquement dès validation.</p>
          </>
        )}
        {status === "REJECTED" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><XCircle className="w-7 h-7 text-red-600" /></div>
            <h1 className="text-xl font-heading font-semibold">Compte refusé</h1>
            <p className="text-sm text-muted-foreground mt-2">Votre dossier n'a pas été validé. Contactez le support pour plus d'informations.</p>
          </>
        )}
        {status === "APPROVED" && (
          <>
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4"><ShieldCheck className="w-7 h-7 text-primary" /></div>
            <h1 className="text-xl font-heading font-semibold">Compte validé</h1>
            <p className="text-sm text-muted-foreground mt-2">Redirection vers votre Dashboard…</p>
          </>
        )}
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /> Actualiser</Button>
          {state.tenant && <Button variant="ghost" onClick={() => navigate("/onboarding")}>Revoir l'onboarding</Button>}
        </div>
      </div>
    </div>
  );
}