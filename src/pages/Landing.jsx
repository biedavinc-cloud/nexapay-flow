import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Check, Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { NexaMark } from "@/components/NexaPayLogo";

const I18N = {
  FR: {
    nav: { product: "Produit", developers: "Développeurs", company: "Entreprise", pricing: "Tarifs", login: "Connexion", start: "Créer un compte gratuit", contact: "ou Contactez-nous" },
    heroBadge: "Paiements fiat → crypto instantanés",
    heroTitle: "Paiements en ligne et hors ligne modernes, livrés en crypto",
    heroSub: "NexaPay aide les commerçants à encaisser par carte ou Mobile Money, et crédite automatiquement l'USDT dans votre wallet — sans solde à gérer, sans exchange intermédiaire.",
    ctaStart: "Créer un compte gratuit",
    ctaContact: "ou Contactez-nous",
    trusted: "Approuvé par des commerçants en Afrique et au-delà",
    watch: "Regarder notre dirigeant expliquer comment NexaPay convertit chaque paiement en USDT livré dans votre wallet",
    s2title: "Des paiements simples et faciles",
    s2sub: "Lancer une activité est difficile. Être payé ne devrait pas l'être.",
    s2a: "Offrez à vos clients une expérience de paiement fluide",
    s2ad: "Acceptez tous les moyens de paiement populaires, en ligne comme hors ligne, sans jamais gérer de solde.",
    s2b: "Profitez de taux de réussite exceptionnels",
    s2bd: "Notre moteur d'exécution directe achète la crypto et la livre en quelques secondes.",
    s2link: "Voir comment nous atteignons ces taux de réussite",
    s3title: "Construisez des expériences de paiement sur mesure avec des API bien documentées",
    s3text: "Nos API claires et complètes vous permettent de construire aussi bien un projet de week-end qu'un produit financier desservant des centaines de milliers de clients. Si vous pouvez l'imaginer, vous pouvez le construire avec NexaPay.",
    s3f1: "Encaisser des paiements ponctuels et récurrents par carte ou Mobile Money",
    s3f2: "Déclencher l'achat instantané d'USDT à chaque paiement",
    s3f3: "Consulter l'historique complet de vos transactions et versements",
    s3f4: "Vérifier l'identité de vos clients",
    s3link: "Démarrer avec l'API NexaPay",
    s4title: "Protégez-vous et vos clients grâce à une détection de fraude avancée",
    s4text: "La combinaison de systèmes anti-fraude automatiques et manuels de NexaPay vous protège contre les transactions frauduleuses et les contestations associées.",
    noBalance: "Pas de solde. Pas d'exchange. Chaque paiement de votre client achète la crypto et la crédite directement dans votre wallet.",
    footer: "Propriété privée d'un intellectuel en IA",
    features: {
      c1: ["Carte", "Compte bancaire", "Virement", "USSD", "POS"],
      c2: ["Apple Pay", "Google Pay", "Visa QR", "Mobile Money"],
    },
    footNav: ["Produit", "Développeurs", "Sécurité", "Entreprise", "Tarifs"],
  },
  EN: {
    nav: { product: "Product", developers: "Developers", company: "Company", pricing: "Pricing", login: "Log in", start: "Create a free account", contact: "or Contact Sales" },
    heroBadge: "Fiat → crypto instant payments",
    heroTitle: "Modern online and offline payments, settled in crypto",
    heroSub: "NexaPay helps businesses get paid by card or Mobile Money, and automatically credits USDT to your wallet — no balance to manage, no intermediary exchange.",
    ctaStart: "Create a free account",
    ctaContact: "or Contact Sales",
    trusted: "Trusted by businesses across Africa and beyond",
    watch: "Watch our leadership explain how NexaPay turns every payment into USDT delivered to your wallet",
    s2title: "Simple, easy payments",
    s2sub: "Building a business is hard. Getting paid shouldn't be.",
    s2a: "Delight customers with a seamless payments experience",
    s2ad: "Accept every popular payment method, online and offline, without ever managing a balance.",
    s2b: "Enjoy phenomenal transaction success rates",
    s2bd: "Our direct execution engine buys the crypto and settles it in seconds.",
    s2link: "Find out how we achieve high success rates",
    s3title: "Build custom payments experiences with well-documented APIs",
    s3text: "Developers love our thorough, well-documented APIs that let you build everything from simple weekend projects to complex financial products serving hundreds of thousands of customers. If you can imagine it, you can build it with NexaPay.",
    s3f1: "Collect one-time and recurring payments by card or Mobile Money",
    s3f2: "Trigger an instant USDT purchase on every payment",
    s3f3: "Retrieve the full history of your transactions and settlements",
    s3f4: "Verify the identity of your customers",
    s3link: "NexaPay API Quickstart",
    s4title: "Protect yourself and your customers with advanced fraud detection",
    s4text: "NexaPay's combination of automated and manual fraud systems protects you from fraudulent transactions and associated chargeback claims.",
    noBalance: "No balance. No exchange. Every payment from your customer buys the crypto and credits it straight to your wallet.",
    footer: "Private property of an AI intellect",
    features: {
      c1: ["Card", "Bank Account", "Bank Transfer", "USSD", "POS"],
      c2: ["Apple Pay", "Google Pay", "Visa QR", "Mobile Money"],
    },
    footNav: ["Product", "Developers", "Security", "Company", "Pricing"],
  },
};

const PARTNERS = ["MTN", "Bolt", "AXA", "Domino's", "Uber"];

export default function Landing() {
  const [lang, setLang] = useState("FR");
  const t = I18N[lang];

  const Check = ({ children }) => (
    <li className="flex items-start gap-2.5 text-sm text-[#081735]">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#3BB77E]/15">
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-[#3BB77E]" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
      {children}
    </li>
  );

  return (
    <div className="min-h-screen bg-white text-[#081735] font-body">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <NexaMark size={36} />
            <span className="font-semibold text-lg tracking-tight text-[#081735]">NexaPay</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[#6D7A92]">
            <a href="#product" className="hover:text-[#081735]">{t.nav.product}</a>
            <Link to="/api-docs" className="hover:text-[#081735]">{t.nav.developers}</Link>
            <a href="#company" className="hover:text-[#081735]">{t.nav.company}</a>
            <a href="#pricing" className="hover:text-[#081735]">{t.nav.pricing}</a>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-black/10 p-0.5 text-xs font-medium">
              <button type="button" onClick={() => setLang("FR")} className={`px-2.5 py-1 rounded-full ${lang === "FR" ? "bg-[#081735] text-white" : "text-[#6D7A92]"}`}>FR</button>
              <button type="button" onClick={() => setLang("EN")} className={`px-2.5 py-1 rounded-full ${lang === "EN" ? "bg-[#081735] text-white" : "text-[#6D7A92]"}`}>EN</button>
            </div>
            <Link to="/login" className="hidden sm:inline text-sm text-[#6D7A92] hover:text-[#081735]">{t.nav.login}</Link>
            <Link to="/register"><Button className="rounded-full bg-[#3BB77E] hover:bg-[#33a36e] text-white" size="sm">{t.nav.start}</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#F9FFFB]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#3BB77E]/10 px-3 py-1 text-xs font-medium text-[#2f9762]">
              <Zap className="h-3.5 w-3.5" /> {t.heroBadge}
            </span>
            <h1 className="font-semibold text-3xl md:text-5xl tracking-tight leading-tight mt-5 text-[#081735]">{t.heroTitle}</h1>
            <p className="text-base md:text-lg text-[#6D7A92] mt-5 max-w-xl">{t.heroSub}</p>
            <div className="flex items-center gap-4 mt-7">
              <Link to="/register"><Button className="rounded-full bg-[#3BB77E] hover:bg-[#33a36e] text-white h-11 px-6">{t.ctaStart}</Button></Link>
              <span className="text-sm text-[#007AFF] hover:underline cursor-pointer">{t.ctaContact}</span>
            </div>
            <p className="text-xs text-[#6D7A92] mt-5">{t.trusted}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 opacity-70">
              {PARTNERS.map((p) => <span key={p} className="text-sm font-semibold text-[#081735]/80 tracking-tight">{p}</span>)}
            </div>
          </div>
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-white border border-black/5 p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#007AFF]/10"><Play className="h-5 w-5 text-[#007AFF]" /></span>
              <p className="text-sm text-[#081735] max-w-xs">{t.watch}</p>
            </div>
            <div className="w-full rounded-xl border border-[#3BB77E]/20 bg-white px-5 py-4 text-sm text-[#2f9762]">
              {t.noBalance}
            </div>
          </div>
        </div>
      </section>

      {/* Simple, easy payments */}
      <section id="product" className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <h2 className="font-semibold text-2xl md:text-4xl tracking-tight text-[#081735]">{t.s2title}</h2>
          <p className="text-[#6D7A92] mt-2">{t.s2sub}</p>
          <div className="grid md:grid-cols-2 gap-10 mt-10 items-center">
            <div className="rounded-2xl overflow-hidden bg-[#F9FFFB] border border-black/5 aspect-[4/3]">
              <Image src="https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/ff6298b36_kredite-banknotes-4516005_1920.jpg" alt="Paiements simples et faciles" className="w-full h-full object-cover" fittingType="fill" />
            </div>
            <div className="space-y-10">
              <div>
                <h3 className="font-semibold text-xl text-[#081735]">{t.s2a}</h3>
                <p className="text-sm text-[#6D7A92] mt-2 max-w-md">{t.s2ad}</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 mt-5">
                  <ul className="space-y-2.5">{t.features.c1.map((f) => <Check key={f}>{f}</Check>)}</ul>
                  <ul className="space-y-2.5">{t.features.c2.map((f) => <Check key={f}>{f}</Check>)}</ul>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-xl text-[#081735]">{t.s2b}</h3>
                <p className="text-sm text-[#6D7A92] mt-2 max-w-md">{t.s2bd}</p>
                <p className="text-sm text-[#007AFF] hover:underline cursor-pointer mt-3 inline-flex items-center gap-1">{t.s2link} <ArrowRight className="h-3.5 w-3.5" /></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Build custom payments */}
      <section id="developers" className="bg-[#F9FFFB]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-semibold text-2xl md:text-4xl tracking-tight text-[#081735]">{t.s3title}</h2>
            <p className="text-[#6D7A92] mt-4 max-w-lg">{t.s3text}</p>
            <ul className="space-y-2.5 mt-6 max-w-lg">
              <Check>{t.s3f1}</Check>
              <Check>{t.s3f2}</Check>
              <Check>{t.s3f3}</Check>
              <Check>{t.s3f4}</Check>
            </ul>
            <Link to="/api-docs" className="text-sm text-[#007AFF] hover:underline mt-6 inline-flex items-center gap-1">{t.s3link} <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="rounded-2xl overflow-hidden bg-white border border-black/5 aspect-[4/3]">
            <Image src="https://media.base44.com/images/public/6ab1104e47d4f74022c69d27/eb4dd9554_nattanan23-money-2724241_1920.jpg" alt="Expériences de paiement sur mesure" className="w-full h-full object-cover" fittingType="fill" />
          </div>
        </div>
      </section>

      {/* Protect yourself */}
      <section id="security" className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div className="flex justify-center">
            <div className="relative h-56 w-56">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#3BB77E] to-[#7ed4a6]" />
              <div className="absolute inset-6 rounded-full bg-white" />
              <div className="absolute inset-12 rounded-full bg-gradient-to-br from-[#3BB77E]/60 to-[#a9e6c4]" />
              <div className="absolute inset-20 rounded-full bg-white" />
            </div>
          </div>
          <div>
            <h2 className="font-semibold text-2xl md:text-4xl tracking-tight text-[#081735]">{t.s4title}</h2>
            <p className="text-[#6D7A92] mt-4 max-w-lg">{t.s4text}</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <h2 className="font-semibold text-2xl md:text-4xl tracking-tight text-[#081735] text-center">Tarifs & accès production</h2>
          <p className="text-[#6D7A92] mt-2 text-center max-w-2xl mx-auto">Un frais d'accès unique débloque votre espace. La commission est prélevée à la source sur chaque conversion Fiat → USDT.</p>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {[
              { name: "Basic", price: "$200", limit: "Jusqu'à $200 / jour", commission: "3,5%", highlight: false },
              { name: "Advanced", price: "$619", limit: "Jusqu'à $5 000 / jour", commission: "2,0%", highlight: true },
              { name: "Pro", price: "$1099", limit: "Volume illimité", commission: "0,8%", highlight: false },
            ].map((p) => (
              <div key={p.name} className={`rounded-2xl border p-6 ${p.highlight ? "border-[#3BB77E] bg-[#F9FFFB] shadow-sm" : "border-black/5"}`}>
                <div className="font-semibold text-lg text-[#081735]">{p.name}</div>
                <div className="text-3xl font-bold text-[#081735] my-2">{p.price}</div>
                <div className="text-xs text-[#6D7A92]">Frais d'accès unique</div>
                <ul className="mt-4 space-y-2 text-sm text-[#081735]">
                  <li className="flex items-center gap-2"><Check /><span>Limite: {p.limit}</span></li>
                  <li className="flex items-center gap-2"><Check /><span>Commission: {p.commission} par conversion</span></li>
                  <li className="flex items-center gap-2"><Check /><span>Prélèvement à la source</span></li>
                </ul>
                <Link to="/register"><Button className={`mt-6 w-full rounded-full ${p.highlight ? "bg-[#3BB77E] hover:bg-[#33a36e] text-white" : "bg-[#081735] hover:bg-[#0f2147] text-white"}`}>Choisir {p.name}</Button></Link>
              </div>
            ))}
          </div>
          <div className="mt-12 overflow-x-auto rounded-2xl border border-black/5 bg-[#F9FFFB]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#6D7A92] border-b border-black/5">
                  <th className="py-3 px-4 font-medium">Caractéristiques</th>
                  <th className="py-3 px-4 font-medium">Basic</th>
                  <th className="py-3 px-4 font-medium">Advanced</th>
                  <th className="py-3 px-4 font-medium">Pro</th>
                </tr>
              </thead>
              <tbody className="text-[#081735]">
                {[
                  ["Frais d'accès unique", "$200", "$619", "$1099"],
                  ["Limite quotidienne", "$200 / jour", "$5 000 / jour", "Illimité"],
                  ["Commission", "3,5%", "2,0%", "0,8%"],
                  ["Prélèvement", "À la source", "À la source", "À la source"],
                  ["KYC", "Simplifié (Identité + OTP)", "Standard (Identité + Liveness)", "Avancé (Entreprise + Kbis)"],
                  ["Personnalisation Widget", "Couleur principale", "Couleur + Logo", "Couleur + Logo + Domaines"],
                  ["Support", "Standard (Email)", "Prioritaire (Chat)", "Dédié 24/7 + API"],
                ].map((r, i) => (
                  <tr key={i} className="border-b border-black/5 last:border-0">
                    <td className="py-3 px-4 font-medium">{r[0]}</td>
                    <td className="py-3 px-4">{r[1]}</td>
                    <td className="py-3 px-4">{r[2]}</td>
                    <td className="py-3 px-4">{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="company" className="bg-[#081735] text-white">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2">
                <NexaMark size={32} variant="translucent" />
                <span className="font-semibold text-lg text-white">NexaPay</span>
              </div>
              <p className="text-sm text-white/60 mt-4 max-w-xs">{t.heroSub}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Contact</p>
              <p className="text-sm text-white/80">Toll-Free: +1 (897) 843-8246</p>
              <a href="mailto:sales@nexapayme.org" className="text-sm text-white/80 hover:text-[#3BB77E] block mt-1">Email: sales@nexapayme.org</a>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">NexaPay head office</p>
              <p className="text-sm text-white/80">Suite 500 - 470 2 Ave SW</p>
              <p className="text-sm text-white/80">Mark's, Albertanio T2P 8E9</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mt-4 mb-2">Seattle office</p>
              <p className="text-sm text-white/80">Suite 4800 - 709 5th Avenue</p>
              <p className="text-sm text-white/80">Seattle, Lithuania 89104</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Navigation</p>
              <nav className="flex flex-col gap-2 text-sm text-white/70">
                <a href="#product" className="hover:text-white">{t.footNav[0]}</a>
                <Link to="/api-docs" className="hover:text-white">Documentation</Link>
                <a href="#security" className="hover:text-white">{t.footNav[2]}</a>
                <a href="#company" className="hover:text-white">{t.footNav[3]}</a>
                <Link to="/login" className="hover:text-white">{t.nav.login}</Link>
              </nav>
            </div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-6">
            <p className="text-xs text-white/50 leading-relaxed">
              NexaPay operates under NexaPay UAB, a company registered in Lithuania (a European Union member state) with company code 304696889 and a registered address at Algirdo str. 38, Vilnius, Lithuania. NexaPay UAB is an Electronic Money Institution payment solution on-ramp (EMI license No. 24) authorized and regulated by the Central Bank of Lithuania (CBoL). CBoL is subject to the regulation of the European Central Bank. Financial institution SWIFT/BIC code: CNUALT21XXX
            </p>
            <p className="text-center text-sm text-white/60 mt-5">© Nexapay 2026. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}