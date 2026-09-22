import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { BookOpen, Copy, Check, Terminal, Webhook, KeyRound, Layout, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = "https://thankful-nexa-pay-flow.base44.app";

function CodeBlock({ code, title }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative">
      {title && <p className="text-xs font-semibold text-muted-foreground mb-1.5">{title}</p>}
      <pre className="rounded-xl border border-border bg-secondary/60 p-4 text-xs font-mono overflow-x-auto text-foreground/90 leading-relaxed">{code}</pre>
      <Button variant="ghost" size="sm" onClick={copy} className="absolute top-2 right-2 rounded-lg">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function Section({ icon: Icon, title, step, children }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        {step && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">{step}</span>}
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h2 className="font-display text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Pill({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-primary/10 text-primary border-primary/20",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return <span className={`rounded-md px-2 py-0.5 text-xs font-bold border ${tones[tone]}`}>{children}</span>;
}

const CREATE_SESSION_CURL = `curl -X POST ${BASE}/functions/createCheckoutSession \\
  -H "Authorization: Bearer nexa_sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100,
    "currency": "EUR",
    "order_id": "ORD-1234",
    "webhook_url": "https://votre-site.com/webhooks/nexapay"
  }'`;

const CREATE_SESSION_JS = `// Côté serveur (backend de votre marketplace)
const r = await fetch("${BASE}/functions/createCheckoutSession", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + NEXAPAY_SECRET_KEY, // nexa_sk_live_...
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    amount: 100,          // montant de la marchandise (fiat)
    currency: "EUR",      // EUR, USD, XOF, XAF...
    order_id: "ORD-1234",
    webhook_url: "https://votre-site.com/webhooks/nexapay"
  })
});

const session = await r.json();
// session.client_secret  -> à transmettre au widget
// session.checkout_url  -> URL de l'iframe
// session.session_id     -> votre référence interne`;

const CREATE_SESSION_RES = `{
  "session_id": "cs_LXYZABC123",
  "client_secret": "eyJ...signature",
  "checkout_url": "${BASE}/payments/new?embed=true&client_secret=eyJ...",
  "publishable_key": "nexa_pk_live_...",
  "amount": 100,
  "currency": "EUR",
  "order_id": "ORD-1234"
}`;

const WIDGET_HTML = `<!-- Intégrez le checkout NexaPay en iframe -->
<iframe
  src="CHECKOUT_URL_OBTENUE_ETAPE_1"
  width="420" height="640" frameborder="0"
  style="border:0; border-radius: 16px;"
></iframe>

<script>
  // Écoutez les évènements de paiement renvoyés par l'iframe
  window.addEventListener("message", (e) => {
    if (!e.data) return;
    if (e.data.status === "succeeded") {
      console.log("Paiement réussi :", e.data.crypto_tx_hash, e.data.transaction_id);
      // Mettez à jour votre commande côté serveur
    } else if (e.data.status === "failed") {
      console.error("Échec :", e.data.error);
    }
  });
</script>`;

const PROCESS_CURL = `curl -X POST ${BASE}/functions/processCheckoutPayment \\
  -H "Authorization: Bearer nexa_pk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_secret": "eyJ...",
    "payment_method": "CARD",
    "card": { "number": "4242424242424242", "expiry": "12/28", "cvc": "123", "name": "Jean Dupont" },
    "payer": { "email": "client@exemple.com" }
  }'`;

const PROCESS_JS = `// Exécuté par le widget (ou votre frontend) avec la clé PUBLIQUE
const r = await fetch("${BASE}/functions/processCheckoutPayment", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + NEXAPAY_PUBLISHABLE_KEY, // nexa_pk_live_...
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    client_secret,
    payment_method: "CARD",   // ou "MOBILE_MONEY"
    card: { number, expiry, cvc, name },
    payer: { email: "client@exemple.com" }
    // Pour Mobile Money : momo: { provider, prefix, phone }
  })
});

const result = await r.json();
// result.status === "succeeded"  -> paiement + achat USDT + retrait effectués
// result.crypto_tx_hash          -> hash de la transaction de retrait
// result.usdt                    -> quantité d'USDT livrée`;

const PROCESS_RES = `{
  "status": "succeeded",
  "transaction_id": "NX-2026-AB12CD",
  "usdt": 108.25,
  "crypto_provider": "BINANCE",
  "crypto_tx_hash": "0x1a2b3c...",
  "live": true,
  "rate_live": true
}`;

const ROUTE_CURL = `curl -X POST ${BASE}/functions/routePayment \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount_fiat": 100,
    "currency_fiat": "EUR",
    "payment_method": "CARD",
    "destination_wallet": "TM6yX8fkfQcwBkd3VkaxfoZtAw5cEbBUas",
    "network": "TRC20",
    "client_name": "Jean Dupont",
    "webhook_url": "https://votre-site.com/webhooks/nexapay"
  }'`;

const WEBHOOK_NODE = `// Vérification de signature côté votre serveur (Node.js / Express)
import crypto from "crypto";

function verifyNexaPaySignature(rawBody, signatureHeader, signingSecret) {
  // signatureHeader = "t=1695300000,v1=<hex>"
  const parts = Object.fromEntries(
    signatureHeader.split(",").map(kv => kv.split("="))
  );
  const { t, v1 } = parts;
  if (!t || !v1) return false;

  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(\`\${t}.\${rawBody}\`)
    .digest("hex");

  // Protection contre les attaques par synchronisation
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

app.post("/webhooks/nexapay", express.raw({ type: "*/*" }), (req, res) => {
  const sig = req.headers["nexapay-signature"];
  const ok = verifyNexaPaySignature(req.body.toString(), sig, NEXAPAY_WEBHOOK_SECRET);
  if (!ok) return res.status(401).send("Signature invalide");

  const event = JSON.parse(req.body);
  if (event.event === "payment.succeeded") {
    // Marquez la commande comme payée, livrez le bien/service
    console.log("Ordre " + event.order_id + " livré : " + event.usdt + " USDT");
  } else if (event.event === "payment.failed") {
    // Gérez l'échec
    console.error("Échec ordre " + event.order_id + " : " + event.error);
  }
  res.json({ received: true });
});`;

const WEBHOOK_PHP = `// Vérification de signature côté votre serveur (PHP)
function verifyNexaPaySignature($rawBody, $signatureHeader, $signingSecret) {
  $parts = [];
  foreach (explode(",", $signatureHeader) as $kv) {
    [$k, $v] = explode("=", $kv, 2);
    $parts[$k] = $v;
  }
  if (empty($parts["t"]) || empty($parts["v1"])) return false;
  $expected = hash_hmac("sha256", $parts["t"] . "." . $rawBody, $signingSecret);
  return hash_equals($expected, $parts["v1"]);
}

$raw = file_get_contents("php://input");
$sig = $_SERVER["HTTP_NEXAPAY_SIGNATURE"];
if (!verifyNexaPaySignature($raw, $sig, $NEXAPAY_WEBHOOK_SECRET)) {
  http_response_code(401);
  exit("Signature invalide");
}
$event = json_decode($raw, true);
if ($event["event"] === "payment.succeeded") {
  // Marquez la commande $event["order_id"] comme payée
} elseif ($event["event"] === "payment.failed") {
  // Gérez l'échec
}
http_response_code(200);`;

const WEBHOOK_PAYLOAD_SUCCEEDED = `POST https://votre-site.com/webhooks/nexapay
Content-Type: application/json
NexaPay-Signature: t=1695300000,v1=a1b2c3d4e5...

{
  "event": "payment.succeeded",
  "order_id": "ORD-1234",
  "transaction_id": "NX-2026-AB12CD",
  "amount": 100,
  "currency": "EUR",
  "usdt": 108.25,
  "network": "TRC20",
  "crypto_payout_status": "COMPLETED",
  "crypto_provider": "BINANCE",
  "crypto_tx_hash": "0x1a2b3c...",
  "live": true
}`;

const WEBHOOK_PAYLOAD_FAILED = `{
  "event": "payment.failed",
  "order_id": "ORD-1234",
  "transaction_id": "NX-2026-AB12CD",
  "amount": 100,
  "currency": "EUR",
  "usdt": 108.25,
  "crypto_payout_status": "FAILED",
  "error": "All providers failed. Last: Binance execution failed."
}`;

export default function ApiDocs() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Documentation API"
        description="Intégrez NexaPay — on-ramp fiat → USDT direct vers votre wallet TRC20. À transmettre à votre développeur."
        icon={BookOpen}
      />

      <div className="space-y-5">
        <Section icon={Layout} title="Aperçu du flux NexaPay">
          <p className="text-sm text-muted-foreground">
            NexaPay est un PSP on-ramp (pas un exchange). Votre marketplace expose nos clés API ; au checkout,
            le client paie en fiat (carte ou mobile money) et NexaPay achète immédiatement l'USDT équivalent
            sur son propre compte exchange, puis le retire vers votre wallet de réception TRC20 configuré.
          </p>
          <div className="rounded-lg bg-secondary/60 border border-border p-3 text-xs font-mono text-foreground/80 leading-relaxed">
            Client checkout → (1) Création de session [serveur marchand]<br />
            → (2) Widget iframe affiché au client<br />
            → (3) Client paie → achat USDT + retrait vers votre wallet<br />
            → (4) Webhook signé → votre serveur confirme la commande
          </div>
        </Section>

        <Section icon={KeyRound} title="Authentification & clés" step={1}>
          <p className="text-sm text-muted-foreground">
            Créez vos clés dans l'onglet <b>Clés API</b> du dashboard. Deux clés sont générées :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Pill>secrète</Pill>
                <code className="text-xs font-mono">nexa_sk_live_...</code>
              </div>
              <p className="text-xs text-muted-foreground">Usage serveur uniquement (création de session). Ne jamais exposer côté client.</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Pill tone="green">publique</Pill>
                <code className="text-xs font-mono">nexa_pk_live_...</code>
              </div>
              <p className="text-xs text-muted-foreground">Usage client/widget (exécution du paiement). Sûre à exposer.</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <b>Base URL :</b> <code className="font-mono">{BASE}</code>
          </div>
        </Section>

        <Section icon={Terminal} title="Créer une session de checkout" step={2}>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill>POST</Pill>
            <code className="text-sm font-mono">/functions/createCheckoutSession</code>
          </div>
          <p className="text-sm text-muted-foreground">
            Appelé côté serveur avec votre <b>clé secrète</b>. Retourne un <code className="font-mono">client_secret</code> et une
            <code className="font-mono"> checkout_url</code> à utiliser pour le widget.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <CodeBlock code={CREATE_SESSION_CURL} title="Requête — cURL" />
            <CodeBlock code={CREATE_SESSION_JS} title="Requête — JavaScript" />
            <CodeBlock code={CREATE_SESSION_RES} title="Réponse 200 OK" />
          </div>
          <div className="rounded-lg border border-border p-3 text-xs space-y-1">
            <p className="font-semibold">Paramètres de la requête</p>
            <ul className="text-muted-foreground space-y-0.5 list-disc pl-4">
              <li><code className="font-mono">amount</code> <Pill tone="amber">requis</Pill> — montant de la marchandise (number)</li>
              <li><code className="font-mono">currency</code> — code ISO fiat : EUR, USD, XOF, XAF… (défaut EUR)</li>
              <li><code className="font-mono">order_id</code> — votre identifiant de commande</li>
              <li><code className="font-mono">webhook_url</code> — URL cible pour la notification signée</li>
            </ul>
          </div>
        </Section>

        <Section icon={Layout} title="Intégration du widget (iframe)" step={3}>
          <p className="text-sm text-muted-foreground">
            Affichez le checkout dans une iframe en utilisant la <code className="font-mono">checkout_url</code> obtenue à l'étape 2.
            L'iframe communique le résultat via <code className="font-mono">postMessage</code>.
          </p>
          <CodeBlock code={WIDGET_HTML} title="HTML + écoute des évènements" />
        </Section>

        <Section icon={Terminal} title="Exécuter le paiement (widget)" step={4}>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill>POST</Pill>
            <code className="text-sm font-mono">/functions/processCheckoutPayment</code>
          </div>
          <p className="text-sm text-muted-foreground">
            Appelé par le widget avec la <b>clé publique</b> et le <code className="font-mono">client_secret</code>.
            Valide le moyen de paiement, convertit en USDT au taux live, exécute l'achat + le retrait, renvoie le résultat.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <CodeBlock code={PROCESS_CURL} title="Requête — cURL (carte)" />
            <CodeBlock code={PROCESS_JS} title="Requête — JavaScript" />
            <CodeBlock code={PROCESS_RES} title="Réponse — succès" />
          </div>
          <div className="rounded-lg border border-border p-3 text-xs space-y-1">
            <p className="font-semibold">Paramètres</p>
            <ul className="text-muted-foreground space-y-0.5 list-disc pl-4">
              <li><code className="font-mono">client_secret</code> <Pill tone="amber">requis</Pill> — issu de la session</li>
              <li><code className="font-mono">payment_method</code> — <code className="font-mono">CARD</code> ou <code className="font-mono">MOBILE_MONEY</code></li>
              <li><code className="font-mono">card</code> — <code className="font-mono">{`{ number, expiry: "MM/AA", cvc, name }`}</code> (si CARD)</li>
              <li><code className="font-mono">momo</code> — <code className="font-mono">{`{ provider, prefix, phone }`}</code> (si MOBILE_MONEY)</li>
              <li><code className="font-mono">payer</code> — <code className="font-mono">{`{ email }`}</code></li>
            </ul>
          </div>
        </Section>

        <Section icon={Terminal} title="Exécution directe (routePayment)" step={5}>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill>POST</Pill>
            <code className="text-sm font-mono">/functions/routePayment</code>
          </div>
          <p className="text-sm text-muted-foreground">
            Alternative serveur-à-serveur (sans widget) : déclenche directement l'achat USDT + le retrait vers le wallet de réception.
            Utile pour les flux backend automatisés.
          </p>
          <CodeBlock code={ROUTE_CURL} title="Requête — cURL" />
          <div className="rounded-lg border border-border p-3 text-xs space-y-1">
            <p className="font-semibold">Paramètres</p>
            <ul className="text-muted-foreground space-y-0.5 list-disc pl-4">
              <li><code className="font-mono">amount_fiat</code> <Pill tone="amber">requis</Pill> — montant fiat (number)</li>
              <li><code className="font-mono">currency_fiat</code> — fiat (défaut EUR)</li>
              <li><code className="font-mono">payment_method</code> <Pill tone="amber">requis</Pill> — CARD, MOBILE_MONEY, BANK_TRANSFER, DIRECT_CRYPTO</li>
              <li><code className="font-mono">destination_wallet</code> <Pill tone="amber">requis</Pill> — adresse de réception</li>
              <li><code className="font-mono">network</code> — TRC20, ERC20 ou POLYGON (défaut TRC20)</li>
              <li><code className="font-mono">webhook_url</code> — URL de notification signée</li>
            </ul>
          </div>
        </Section>

        <Section icon={Webhook} title="Webhooks de notification" step={6}>
          <p className="text-sm text-muted-foreground">
            Après exécution, NexaPay envoie un évènement signé à votre <code className="font-mono">webhook_url</code>.
            Configurez votre endpoint et son <b>secret de signature</b> dans l'onglet <b>Webhooks</b> du dashboard.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <CodeBlock code={WEBHOOK_PAYLOAD_SUCCEEDED} title="Payload — payment.succeeded" />
            <CodeBlock code={WEBHOOK_PAYLOAD_FAILED} title="Payload — payment.failed" />
          </div>
          <div className="rounded-lg bg-amber-50/60 border border-amber-200 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Toujours <b>vérifier la signature</b> avant de traiter l'évènement. Répondez <code className="font-mono">200</code> rapidement
              (les livraisons échouées sont journalisées dans l'onglet <b>Journal Webhooks</b>).
            </p>
          </div>
        </Section>

        <Section icon={ShieldCheck} title="Vérification de signature" step={7}>
          <p className="text-sm text-muted-foreground">
            L'en-tête <code className="font-mono">NexaPay-Signature</code> a la forme{" "}
            <code className="font-mono">{`t=<timestamp>,v1=<hmac>`}</code>.
            Le HMAC est calculé sur <code className="font-mono">"{`t`}.{`rawBody`}"</code> avec votre secret de signature, en SHA-256 hex.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <CodeBlock code={WEBHOOK_NODE} title="Node.js / Express" />
            <CodeBlock code={WEBHOOK_PHP} title="PHP" />
          </div>
        </Section>

        <Section icon={AlertTriangle} title="Codes d'erreur">
          <div className="text-xs space-y-1">
            <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5">
              <Pill tone="amber">400</Pill><span className="text-muted-foreground">Paramètres invalides (montant, méthode, réseau…)</span>
              <Pill tone="amber">401</Pill><span className="text-muted-foreground">Clé absente/invalide ou client_secret invalide</span>
              <Pill tone="amber">500</Pill><span className="text-muted-foreground">Erreur interne — voir les logs de la fonction</span>
            </div>
            <p className="text-muted-foreground pt-2">
              En cas d'échec d'exécution crypto, <code className="font-mono">status</code> vaut <code className="font-mono">"failed"</code> et
              <code className="font-mono"> error</code> contient la raison. Le champ <code className="font-mono">live</code> indique si l'exécution
              s'est faite sur un exchange réel (<code className="font-mono">true</code>) ou en mode simulé (<code className="font-mono">false</code>).
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}