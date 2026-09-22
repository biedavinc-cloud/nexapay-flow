import React from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  LogOut,
  Activity,
  ScrollText,
  Webhook,
  BarChart3,
  TrendingUp,
  Settings,
  KeyRound,
  Link as LinkIcon,
  Wallet,
  ShieldCheck,
  Server,
  ShieldAlert,
  Percent,
  BookOpen,
  History,
  ClipboardCheck,
  Coins,
  RadioTower,
  Plug,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { SUPERADMIN_EMAILS } from "@/lib/superadminWhitelist";
import { NexaMark } from "@/components/NexaPayLogo";

const SECTIONS = [
  {
    title: "Paiements",
    items: [
      { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, end: true },
      { to: "/payments/new", label: "Nouvel achat crypto", icon: PlusCircle, end: false },
      { to: "/payment-links", label: "Liens de paiement", icon: LinkIcon },
    ],
  },
  {
    title: "Surveillance",
    items: [
      { to: "/provider-status", label: "Statut fournisseurs", icon: Activity },
      { to: "/payment-history", label: "Journal des paiements", icon: History },
      { to: "/transaction-logs", label: "Journal transactions", icon: ScrollText },
      { to: "/webhook-console", label: "Console webhooks", icon: Webhook },
    ],
  },
  {
    title: "Analyse",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/rapports-performance", label: "Rapports performance", icon: TrendingUp },
    ],
  },
  {
    title: "Exchanges & Crypto",
    items: [
      { to: "/manage-providers", label: "Fournisseurs crypto", icon: Server },
      { to: "/wallets", label: "Wallets de réception", icon: Wallet },
      { to: "/rate-management", label: "Taux & marges", icon: Percent },
    ],
  },
  {
    title: "Configuration",
    items: [
      { to: "/settings", label: "Paramètres", icon: Settings },
      { to: "/api-keys", label: "Clés API", icon: KeyRound },
      { to: "/webhooks", label: "Webhooks", icon: LinkIcon },
      { to: "/crypto-wallets", label: "Portefeuilles crypto", icon: Wallet },
      { to: "/security", label: "Sécurité", icon: ShieldCheck },
      { to: "/security-settings", label: "Sécurité & IP", icon: ShieldAlert },
      { to: "/gestion-prestataires", label: "Gestion prestataires", icon: Server },
      { to: "/parametres-securite", label: "Paramètres sécurité", icon: ShieldAlert },
      { to: "/api-docs", label: "Documentation API", icon: BookOpen },
      { to: "/approvals", label: "Approbations marchands", icon: ClipboardCheck },
    ],
  },
  {
    title: "Outils & Tests",
    items: [
      { to: "/webhook-audit", label: "Audit des webhooks", icon: ClipboardCheck },
      { to: "/currency-management", label: "Gestion des devises", icon: Coins },
      { to: "/webhook-tester", label: "Test webhook", icon: RadioTower },
      { to: "/connection-tester", label: "Test de connexion", icon: Plug },
    ],
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gate, setGate] = React.useState("loading");

  const handleLogout = async () => {
    await base44.auth.logout("/login");
  };

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me.role === "admin" || me.role === "SUPER_ADMIN" || SUPERADMIN_EMAILS.includes(me.email)) { if (!cancelled) setGate("ok"); return; }
        const path = location.pathname;
        if (path === "/onboarding" || path === "/approval-pending") { if (!cancelled) setGate("ok"); return; }
        if (!me.data?.tenant_id) { navigate("/onboarding", { replace: true }); return; }
        const tenant = await base44.entities.Tenant.get(me.data.tenant_id);
        const st = tenant.account_status || "PENDING_ONBOARDING";
        if (st === "APPROVED") { if (!cancelled) setGate("ok"); return; }
        if (st === "AWAITING_APPROVAL" || st === "REJECTED") { navigate("/approval-pending", { replace: true }); return; }
        navigate("/onboarding", { replace: true });
      } catch {
        if (!cancelled) setGate("ok");
      }
    })();
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (gate === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
          <NexaMark size={36} />
          <div className="leading-tight">
            <p className="font-display font-semibold tracking-tight text-foreground">NexaPay</p>
            <p className="text-[11px] text-muted-foreground">Crypto Engine</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <NexaMark size={32} />
          <span className="font-display font-semibold">NexaPay</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/payments/new")}>
          <PlusCircle className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}