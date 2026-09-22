import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "@/lib/adminAudit";
import { Plus, Trash2 } from "lucide-react";

export default function AdminSecurity() {
  const { toast } = useToast();
  const [ips, setIps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ip: "", label: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [i, l] = await Promise.all([
        base44.entities.SecurityIp.list("-created_date", 100),
        base44.entities.SuperadminAuditLog.list("-created_date", 100),
      ]);
      setIps(i); setLogs(l);
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addIp = async () => {
    if (!form.ip || !form.label) { toast({ title: "IP et libellé requis", variant: "destructive" }); return; }
    try {
      await base44.entities.SecurityIp.create({ ip: form.ip, label: form.label, active: true });
      await logAudit("add_security_ip", null, { ip: form.ip, label: form.label });
      setForm({ ip: "", label: "" });
      toast({ title: "IP ajoutée" });
      load();
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const removeIp = async (ip) => {
    try {
      await base44.entities.SecurityIp.delete(ip.id);
      await logAudit("remove_security_ip", null, { ip: ip.ip });
      toast({ title: "IP supprimée" });
      load();
    } catch (e) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-heading font-semibold">Sécurité & whitelist IP</h1>

      <div className="bg-card border border-border rounded-xl p-5 max-w-xl">
        <h3 className="font-heading font-semibold mb-3">Ajouter une IP autorisée</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-1"><Label>Adresse IP / CIDR</Label><Input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.1 ou 10.0.0.0/24" /></div>
          <div className="grid gap-1"><Label>Libellé</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Bureau admin" /></div>
        </div>
        <Button className="mt-3" onClick={addIp}><Plus className="w-4 h-4" /> Ajouter</Button>

        <div className="mt-5 space-y-2">
          {ips.map((ip) => (
            <div key={ip.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2 text-sm">
              <div><span className="font-mono">{ip.ip}</span> <span className="text-muted-foreground">· {ip.label}</span></div>
              <Button size="sm" variant="ghost" onClick={() => removeIp(ip)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </div>
          ))}
          {ips.length === 0 && !loading && <p className="text-sm text-muted-foreground">Aucune IP en whitelist.</p>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold mb-3">Journal d'audit administratif</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((l) => (
            <div key={l.id} className="border border-border rounded-lg px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{l.action}</span>
                <span className="text-xs text-muted-foreground">{(l.created_date || "").slice(0, 19)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{l.admin_email} {l.target_tenant_id ? `· tenant ${l.target_tenant_id.slice(0, 8)}` : ""}</div>
              {l.details && <div className="text-xs text-muted-foreground mt-1 font-mono break-all">{l.details}</div>}
            </div>
          ))}
          {logs.length === 0 && !loading && <p className="text-sm text-muted-foreground">Aucune action enregistrée.</p>}
        </div>
      </div>
    </div>
  );
}