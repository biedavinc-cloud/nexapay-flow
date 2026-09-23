import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, ShieldAlert, Crown, Loader2, UserPlus, Users2 } from "lucide-react";
import { STAFF_ROLES, roleLabel } from "@/lib/staffRoles";

export default function AdminRoles() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);

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
        toast({ title: "Rôle mis à jour", description: `${u.email} → ${roleLabel(role)}` });
        load();
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Erreur";
      toast({ title: "Action bloquée", description: msg, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const sendInvite = async () => {
    setInviting(true);
    try {
      const res = await base44.functions.invoke("superadminRoles", {
        action: "invite", email: inviteEmail, role: inviteRole,
      });
      const data = res?.data || res;
      if (data.error) {
        toast({ title: "Invitation échouée", description: data.error, variant: "destructive" });
      } else {
        toast({
          title: "Invitation envoyée",
          description: inviteRole === "SUPER_ADMIN"
            ? `${inviteEmail} invité·e. Promouvez-le·la en SUPER_ADMIN après son inscription.`
            : `${inviteEmail} invité·e en tant que ${roleLabel(inviteRole)}.`,
        });
        setInviteEmail(""); setInviteRole("user"); setInviteOpen(false); load();
      }
    } catch (e) {
      toast({ title: "Invitation échouée", description: e?.message || "Erreur", variant: "destructive" });
    } finally { setInviting(false); }
  };

  const guardActive = count <= 2;
  const staffCount = users.filter((u) => ["SUPPORT", "FINANCE", "COMPLIANCE", "DEVELOPER"].includes(u.role)).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-semibold">Gestion des rôles & SuperAdmins</h1>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="w-4 h-4 mr-2" /> Inviter un utilisateur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" type="email" placeholder="staff@nexapay.io"
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rôle initial</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label} — {r.desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {inviteRole === "SUPER_ADMIN" && (
                  <p className="text-xs text-amber-600">
                    L'invitation part en rôle standard ; promouvez en SUPER_ADMIN après inscription (règle des 2 minimum).
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Annuler</Button>
              <Button onClick={sendInvite} disabled={inviting || !inviteEmail}>
                {inviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Envoyer l'invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <Users2 className="w-8 h-8 text-primary" />
          <div><p className="text-2xl font-semibold">{users.length}</p><p className="text-xs text-muted-foreground">Utilisateurs</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <Crown className="w-8 h-8 text-primary" />
          <div><p className="text-2xl font-semibold">{count}</p><p className="text-xs text-muted-foreground">SuperAdmins</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div><p className="text-2xl font-semibold">{staffCount}</p><p className="text-xs text-muted-foreground">Staff spécialisé</p></div>
        </div>
      </div>

      {/* 2-superadmin guard */}
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
                <th className="py-3 px-4 font-medium">Rôle actuel</th>
                <th className="py-3 px-4 font-medium">Changer le rôle</th>
                <th className="py-3 px-4 font-medium">SuperAdmin</th>
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
                        <span className="inline-flex items-center gap-1 text-primary font-medium"><Crown className="w-3.5 h-3.5" /> SuperAdmin</span>
                      ) : <span className="text-muted-foreground">{roleLabel(u.role)}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <Select
                        value={isSuper ? "__super" : (u.role || "user")}
                        onValueChange={(v) => v !== "__super" && setRole(u, v)}
                        disabled={busy === u.id}
                      >
                        <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {isSuper && <SelectItem value="__super">SuperAdmin (actif)</SelectItem>}
                          {STAFF_ROLES.filter((r) => r.value !== "SUPER_ADMIN").map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4">
                      {!isSuper ? (
                        <Button size="sm" onClick={() => setRole(u, "SUPER_ADMIN")} disabled={busy === u.id}>
                          {busy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />} Promouvoir
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setRole(u, "user")}
                          disabled={revokeDisabled || busy === u.id}
                          title={revokeDisabled ? "Minimum 2 SuperAdmins requis" : ""}>
                          {busy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Révoquer
                        </Button>
                      )}
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