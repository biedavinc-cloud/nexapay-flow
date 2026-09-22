import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, ShieldAlert, Crown, Loader2 } from "lucide-react";

export default function AdminRoles() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("superadminRoles", { action: "list" });
      const data = res?.data || res;
      setUsers(data.users || []);
      setCount(data.superadminCount || 0);
    } catch (e) {
      toast({ title: "Erreur", description: e?.message || "Accès refusé", variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setRole = async (u, role) => {
    setBusy(u.id);
    try {
      const res = await base44.functions.invoke("superadminRoles", { action: "setRole", user_id: u.id, role });
      const data = res?.data || res;
      if (data.error) {
        toast({ title: "Action bloquée", description: data.error, variant: "destructive" });
      } else {
        toast({ title: role === "SUPER_ADMIN" ? "SuperAdmin promu" : "Rôle révoqué", description: `${u.email} → ${role}` });
        load();
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Erreur";
      toast({ title: "Action bloquée", description: msg, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const guardActive = count <= 2;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <h1 className="text-2xl font-heading font-semibold">Gestion des rôles & SuperAdmins</h1>

      <div className={`rounded-xl border p-4 flex items-start gap-3 ${guardActive ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
        {guardActive ? <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" /> : <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5" />}
        <div className="text-sm">
          <p className="font-medium text-foreground">Protection des SuperAdmins — règle des 2 minimum</p>
          <p className="text-muted-foreground mt-0.5">
            {guardActive
              ? `Il ne reste que ${count} SuperAdmin(s) actif(s). Rétrogradation et suppression désactivées tant qu'il y a 2 SuperAdmins ou moins.`
              : `${count} SuperAdmins actifs — gestion disponible.`}
          </p>
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Chargement…</p> : (
        <div className="overflow-x-auto bg-card border border-border rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-medium">Utilisateur</th>
                <th className="py-3 px-4 font-medium">Rôle</th>
                <th className="py-3 px-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSuper = u.role === "SUPER_ADMIN";
                const revokeDisabled = isSuper && guardActive;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4">
                      <div className="font-medium">{u.full_name || u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1 text-primary font-medium"><Crown className="w-3.5 h-3.5" /> SUPER_ADMIN</span>
                      ) : <span className="text-muted-foreground">{u.role || "user"}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {!isSuper ? (
                          <Button size="sm" onClick={() => setRole(u, "SUPER_ADMIN")} disabled={busy === u.id}>
                            {busy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />} Promouvoir
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRole(u, "user")}
                            disabled={revokeDisabled || busy === u.id}
                            title={revokeDisabled ? "Minimum 2 SuperAdmins requis" : ""}
                          >
                            {busy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Révoquer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}