import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { ShieldCheck, Loader2, Save, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Security() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState({});

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ProviderConfig.list("-created_date", 50);
    setProviders(data);
    setEdit(
      Object.fromEntries(
        data.map((p) => [
          p.id,
          {
            api_key_label: p.api_key_label || "",
            has_api_secret: !!p.has_api_secret,
            has_passphrase: !!p.has_passphrase,
          },
        ])
      )
    );
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async (id) => {
    await base44.entities.ProviderConfig.update(id, edit[id]);
    load();
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Sécurité"
        description="Identifiants API sensibles des fournisseurs crypto (Binance, KuCoin…)."
        icon={ShieldCheck}
      />
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-5 flex items-start gap-2 text-sm text-amber-700">
        <Lock className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Les valeurs secrètes réelles (API secret, passphrase) sont stockées de façon chiffrée dans la
          page <strong>Secrets</strong> du tableau de bord. Cette console gère les libellés et indique
          quelles pièces sont configurées.
        </span>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : providers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucun fournisseur configuré. Ajoutez-en depuis « Gestion des prestataires ».
          </div>
        ) : (
          <div className="divide-y divide-border">
            {providers.map((p) => (
              <div key={p.id} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <p className="text-[11px] text-muted-foreground">Fournisseur</p>
                  <p className="font-semibold">{p.provider}</p>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Libellé clé API</Label>
                  <Input
                    className="rounded-xl"
                    value={edit[p.id]?.api_key_label || ""}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, [p.id]: { ...s[p.id], api_key_label: e.target.value } }))
                    }
                    placeholder="nexa-kucoin-prod"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!edit[p.id]?.has_api_secret}
                      onCheckedChange={(v) =>
                        setEdit((s) => ({ ...s, [p.id]: { ...s[p.id], has_api_secret: v } }))
                      }
                    />
                    <span className="text-sm">API secret configuré</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!edit[p.id]?.has_passphrase}
                      onCheckedChange={(v) =>
                        setEdit((s) => ({ ...s, [p.id]: { ...s[p.id], has_passphrase: v } }))
                      }
                    />
                    <span className="text-sm">Passphrase configurée</span>
                  </div>
                </div>
                <div>
                  <Button onClick={() => save(p.id)} className="rounded-full">
                    <Save className="h-4 w-4 mr-1" /> Enregistrer
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