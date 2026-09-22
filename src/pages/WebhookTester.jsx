import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Webhook, Loader2, Send, CheckCircle2, XCircle } from "lucide-react";

const EVENTS = [
  { value: "payment.succeeded", label: "payment.succeeded" },
  { value: "payment.failed", label: "payment.failed" },
  { value: "payment.processing", label: "payment.processing" },
];

export default function WebhookTester() {
  const [endpoints, setEndpoints] = useState([]);
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState("payment.succeeded");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState(50);
  const [currency, setCurrency] = useState("EUR");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.WebhookEndpoint.list("-created_date", 100);
        setEndpoints(data);
      } catch { setEndpoints([]); }
    })();
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!url) return;
    setSending(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("sendTestWebhook", {
        url, event, order_id: orderId || undefined, amount: Number(amount) || 0, currency,
      });
      setResult(res.data);
    } catch (err) {
      setResult({ ok: false, error: err?.message || "Erreur d'envoi" });
    }
    setSending(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Console Test Webhook"
        description="Simulez l'envoi d'un webhook signé vers une URL externe pour tester la réactivité de votre marketplace."
        icon={Webhook}
      />

      <form onSubmit={send} className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Label>Endpoint enregistré</Label>
          <Select value={url} onValueChange={setUrl}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choisir un endpoint ou saisir une URL" /></SelectTrigger>
            <SelectContent>
              {endpoints.map((ep) => (
                <SelectItem key={ep.id} value={ep.url}>{ep.label} — {ep.url}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://votre-site.com/webhooks/nexapay" className="rounded-xl mt-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Événement</Label>
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENTS.map((ev) => <SelectItem key={ev.value} value={ev.value}>{ev.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Référence commande</Label>
            <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="auto-générée si vide" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Montant</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Devise</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-xl" />
          </div>
        </div>

        <Button type="submit" disabled={sending || !url} className="rounded-full">
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Envoyer le webhook de test
        </Button>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            {result.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
            <span className="font-semibold">{result.ok ? "Webhook livré" : "Échec de livraison"}</span>
            <span className="text-sm text-muted-foreground">HTTP {result.http_status ?? "—"}</span>
          </div>
          {result.signature_header && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Signature envoyée (en-tête NexaPay-Signature)</p>
              <code className="block text-xs font-mono bg-muted/60 rounded-lg p-2 break-all">{result.signature_header}</code>
            </div>
          )}
          {result.error && <p className="text-sm text-red-600">{result.error}</p>}
          {result.response_snippet && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Réponse du serveur</p>
              <code className="block text-xs font-mono bg-muted/60 rounded-lg p-2 break-all">{result.response_snippet}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}