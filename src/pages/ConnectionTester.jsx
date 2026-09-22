import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug, Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";

export default function ConnectionTester() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({}); // provider -> { ok, message, testing }

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ProviderConfig.list("-created_date", 50);
      setProviders(data);
    } catch { setProviders([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const testOne = async (name) => {
    setResults((r) => ({ ...r, [name]: { testing: true } }));
    try {
      const res = await base44.functions.invoke("testExchangeConnection", { provider: name });
      const item = (res.data?.results || []).find((x) => x.provider === name);
      setResults((r) => ({ ...r, [name]: item || { ok: false, message: "Aucun résultat" } }));
    } catch (err) {
      setResults((r) => ({ ...r, [name]: { ok: false, message: err?.message || "Erreur" } }));
    }
  };

  const testAll = async () => {
    for (const p of providers) {
      // eslint-disable-next-line no-await-in-loop
      await testOne(p.provider);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Test de connexion"
        description="Vérifiez instantanément la validité des clés API des exchanges configurés."
        icon={Plug}
      />

      <div className="flex justify-end mb-4">
        <Button variant="outline" className="rounded-full" onClick={testAll} disabled={loading || !providers.length}>
          <Zap className="h-4 w-4 mr-1.5" /> Tout tester
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : providers.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Aucun fournisseur configuré. Ajoutez-en dans « Fournisseurs crypto ».</div>
        ) : (
          <div className="divide-y divide-border">
            {providers.map((p) => {
              const r = results[p.provider];
              return (
                <div key={p.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.provider}</span>
                      {p.enabled
                        ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Activé</Badge>
                        : <Badge variant="outline" className="bg-muted text-muted-foreground">Désactivé</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.label || "—"} · statut {p.status || "—"}</p>
                    {r && !r.testing && (
                      <p className={`text-xs mt-1 flex items-center gap-1.5 ${r.ok ? "text-emerald-600" : "text-red-600"}`}>
                        {r.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {r.message}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => testOne(p.provider)} disabled={r?.testing}>
                    {r?.testing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plug className="h-4 w-4 mr-1.5" />}
                    Tester
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}