import React, { useEffect, useState } from "react";
import { Link2, Copy, CheckCircle2, Plus, Trash2, Power, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const genSlug = () => `nx_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

const NETWORKS = ["TRC20", "ERC20", "POLYGON"];
const CURRENCIES = ["EUR", "USD", "XAF", "XOF", "GBP", "CAD"];

export default function PaymentLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ label: "", amount: "", currency: "EUR", network: "TRC20", description: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.PaymentLink.list("-created_date", 100);
      setLinks(data || []);
    } catch (e) {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const linkUrl = (l) => `${window.location.origin}/pay/${encodeURIComponent(l.slug)}`;

  const create = async (e) => {
    e.preventDefault();
    if (!form.label.trim() || !form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      const rec = await base44.entities.PaymentLink.create({
        label: form.label.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        network: form.network,
        description: form.description.trim(),
        slug: genSlug(),
        active: true,
      });
      setLinks((p) => [rec, ...p]);
      setForm({ label: "", amount: "", currency: "EUR", network: "TRC20", description: "" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (l) => {
    const updated = await base44.entities.PaymentLink.update(l.id, { active: !l.active });
    setLinks((p) => p.map((x) => (x.id === l.id ? updated : x)));
  };

  const remove = async (l) => {
    await base44.entities.PaymentLink.delete(l.id);
    setLinks((p) => p.filter((x) => x.id !== l.id));
  };

  const copy = async (l) => {
    try {
      await navigator.clipboard.writeText(linkUrl(l));
      setCopied(l.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Liens de paiement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Créez un lien avec un montant fixe et envoyez-le à votre client. Il ouvre le lien, paie, et le crypto est versé dans le wallet NexaPay.
        </p>
      </div>

      <form onSubmit={create} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Libellé</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Abonnement mensuel" className="rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label>Montant</Label>
            <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="50.00" className="rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label>Devise</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Réseau</Label>
            <Select value={form.network} onValueChange={(v) => setForm({ ...form, network: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description (optionnel)</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détails affichés au client" className="rounded-xl" />
          </div>
        </div>
        <Button type="submit" disabled={saving} className="rounded-full mt-5">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Créer le lien
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display font-semibold">Vos liens ({links.length})</h2>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : links.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Aucun lien pour l'instant.</div>
        ) : (
          <div className="divide-y divide-border">
            {links.map((l) => (
              <div key={l.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{l.label}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${l.active ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-muted text-muted-foreground border border-border"}`}>
                      {l.active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate font-mono">{linkUrl(l)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{l.amount} {l.currency} · {l.network} · {l.slug}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => copy(l)}>
                    {copied === l.id ? <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
                    {copied === l.id ? "Copié" : "Copier"}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => toggle(l)}>
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full text-red-600" onClick={() => remove(l)}>
                    <Trash2 className="h-4 w-4" />
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