import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2, Copy, Eye, EyeOff, Check, X } from "lucide-react";

// Generic config CRUD: a create form + a list with active toggle, secret reveal/copy and delete.
// fields: { name, label, type: text|password|number|date|select|boolean, options?, placeholder?, default?, span?, hidden?, generate? }
export default function ConfigManager({ entity, fields, addLabel = "Ajouter" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [lastCreated, setLastCreated] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities[entity].list("-created_date", 200);
      setItems(data);
    } catch (e) {
      setItems([]);
      toast({ variant: "destructive", title: "Chargement impossible", description: e?.message || "Erreur inconnue" });
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (name, val) => setForm((f) => ({ ...f, [name]: val }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const record = {};
    try {
      for (const f of fields) {
        if (f.generate) record[f.name] = f.generate();
        else if (f.type === "boolean") record[f.name] = form[f.name] ?? f.default ?? false;
        else if (f.type === "number") record[f.name] = Number(form[f.name] ?? f.default ?? 0);
        else record[f.name] = (form[f.name] ?? f.default ?? "").toString();
      }
      const created = await base44.entities[entity].create(record);
      setForm({});
      const secretFields = fields.filter((f) => f.type === "password" || f.generate);
      setLastCreated({ record: created, recordRaw: record, fields: secretFields });
      if (secretFields.length) {
        toast({
          title: "Élément créé",
          description: "Copiez vos valeurs ci-dessous — elles ne s'afficheront qu'une seule fois.",
        });
      } else {
        toast({ title: "Élément créé avec succès." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Échec de la création", description: e?.message || "Erreur inconnue" });
    }
    setSaving(false);
    load();
  };

  const toggle = async (item, field) => {
    try {
      await base44.entities[entity].update(item.id, { [field]: !item[field] });
    } catch (e) {
      toast({ variant: "destructive", title: "Mise à jour impossible", description: e?.message });
    }
    load();
  };

  const remove = async (id) => {
    try {
      await base44.entities[entity].delete(id);
    } catch (e) {
      toast({ variant: "destructive", title: "Suppression impossible", description: e?.message });
    }
    load();
  };

  const copy = (val, label, key) => {
    navigator.clipboard?.writeText(val || "");
    if (key) {
      setCopiedField(key);
      setTimeout(() => setCopiedField(""), 1500);
    }
    toast({ title: `${label} copié` });
  };

  const visibleFields = fields.filter((f) => !f.hidden && f.type !== "boolean");
  const boolFields = fields.filter((f) => f.type === "boolean");

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {fields.map((f) =>
          f.hidden || f.generate ? null : (
            <div
              key={f.name}
              className={f.span === "full" ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}
            >
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.type === "select" ? (
                <Select value={form[f.name] ?? ""} onValueChange={(v) => setField(f.name, v)}>
                  <SelectTrigger id={f.name} className="rounded-xl">
                    <SelectValue placeholder={f.placeholder || "Sélectionner"} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "boolean" ? (
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    id={f.name}
                    checked={form[f.name] ?? f.default ?? false}
                    onCheckedChange={(v) => setField(f.name, v)}
                  />
                </div>
              ) : (
                <Input
                  id={f.name}
                  type={f.type === "password" ? "password" : f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  className="rounded-xl"
                />
              )}
            </div>
          )
        )}
        <div className="md:col-span-2">
          <Button type="submit" disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {addLabel}
          </Button>
        </div>
      </form>

      {lastCreated && lastCreated.fields.length > 0 && (
        <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <h3 className="font-display text-sm font-semibold text-emerald-800">Valeurs générées — copiez-les maintenant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-700 hover:text-emerald-900"
              onClick={() => setLastCreated(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-emerald-700/80">
            Ces valeurs confidentielles ne sont affichées qu'ici. Copiez-les et stockez-les en lieu sûr.
          </p>
          <div className="space-y-2">
            {lastCreated.fields.map((f) => {
              const val = lastCreated.record[f.name] || lastCreated.recordRaw[f.name] || "";
              const key = f.name;
              const isCopied = copiedField === key;
              return (
                <div key={key} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                  <span className="text-[11px] font-medium text-emerald-700 w-28 shrink-0">{f.label}</span>
                  <code className="flex-1 min-w-0 truncate font-mono text-xs text-foreground">{String(val)}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 text-emerald-700 hover:text-emerald-900"
                    onClick={() => copy(val, f.label, key)}
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucun élément pour le moment.</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 flex-1 min-w-0 text-sm">
                  {visibleFields.map((f) => {
                    const opt = f.options?.find((o) => o.value === item[f.name]);
                    const val = opt ? opt.label : item[f.name];
                    const isSecret = f.type === "password" || f.generate;
                    const shown = isSecret ? revealed[item.id + f.name] : true;
                    return (
                      <div key={f.name} className="min-w-0">
                        <span className="text-[11px] text-muted-foreground block">{f.label}</span>
                        {isSecret ? (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium truncate block font-mono text-xs">{shown ? (String(val ?? "—")) : "••••••••"}</span>
                            <button type="button" onClick={() => setRevealed((r) => ({ ...r, [item.id + f.name]: !r[item.id + f.name] }))} className="text-muted-foreground hover:text-foreground shrink-0">
                              {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <button type="button" onClick={() => copy(val, f.label)} className="text-muted-foreground hover:text-foreground shrink-0">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ) : (
                          <span className="font-medium truncate block">{String(val ?? "—")}</span>
                        )}
                      </div>
                    );
                  })}
                  {boolFields.map((f) => (
                    <div key={f.name} className="min-w-0">
                      <span className="text-[11px] text-muted-foreground block">{f.label}</span>
                      <Switch checked={!!item[f.name]} onCheckedChange={() => toggle(item, f.name)} />
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(item.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}