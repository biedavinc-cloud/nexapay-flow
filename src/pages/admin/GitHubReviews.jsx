import React, { useEffect, useState } from "react";
import { GitPullRequest, ExternalLink, RefreshCw, Loader2, Users, Inbox } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

function timeAgo(iso) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h`;
  const days = Math.round(h / 24);
  return `${days} j`;
}

export default function AdminGitHubReviews() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await base44.functions.invoke("listGitHubReviewPRs", {});
      const d = res?.data || res;
      if (d?.error) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <GitPullRequest className="h-6 w-6 text-primary" /> Pull requests ouvertes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `${data.prs.length} PR(s) ouverte(s) · ${data.scanned}/${data.repoCount} dépôts scannés (compte GitHub connecté du builder)` : "Via l'API GitHub — toutes les PR ouvertes de vos dépôts."}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="rounded-xl">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />} Actualiser
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Scan des dépôts GitHub…</div>
      ) : !data || data.prs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune pull request ouverte sur vos dépôts. 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.prs.map((p) => (
            <a key={`${p.repo}-${p.number}`} href={p.url} target="_blank" rel="noreferrer"
              className="block rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">{p.repo}</span>
                    <span className="text-xs text-muted-foreground">#{p.number}</span>
                    {p.draft && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Draft</span>}
                  </div>
                  <p className="font-medium mt-1.5 truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    {p.authorAvatar && <img src={p.authorAvatar} alt="" className="h-4 w-4 rounded-full" />}
                    <span>par {p.author}</span>
                    <span>·</span>
                    <span>mis à jour {timeAgo(p.updated_at)}</span>
                    {p.review_requested ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"><Users className="h-3 w-3" /> revue demandée</span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">sans reviewer</span>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              {p.reviewers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.reviewers.map((r) => (
                    <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{r}</span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}