import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, ArrowLeftRight, Server, Percent, ScrollText, ShieldCheck, LogOut, Crown, GitPullRequest } from "lucide-react";
import { NexaMark } from "@/components/NexaPayLogo";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { SUPERADMIN_EMAILS } from "@/lib/superadminWhitelist";

const NAV = [
  { to: "/admin/superadmin", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
  { to: "/admin/superadmin/tenants", label: "Tenants & KYC", icon: Building2 },
  { to: "/admin/superadmin/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/admin/superadmin/providers", label: "Fournisseurs & Trésorerie", icon: Server },
  { to: "/admin/superadmin/rates", label: "Taux & Marges", icon: Percent },
  { to: "/admin/superadmin/roles", label: "Rôles & SuperAdmins", icon: Crown },
  { to: "/admin/superadmin/system-logs", label: "Logs & Webhooks", icon: ScrollText },
  { to: "/admin/superadmin/security", label: "Sécurité & Audit", icon: ShieldCheck },
  { to: "/admin/superadmin/github", label: "GitHub – PRs en revue", icon: GitPullRequest },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const allowed = me.role === "admin" || me.role === "SUPER_ADMIN" || SUPERADMIN_EMAILS.includes(me.email);
        if (!allowed) { navigate("/dashboard", { replace: true }); return; }
        // Auto-provision whitelisted emails so the role persists (fire-and-forget).
        if (me.role !== "SUPER_ADMIN" && SUPERADMIN_EMAILS.includes(me.email)) {
          try { await base44.functions.invoke("superadminRoles", { action: "provision" }); } catch {}
        }
        setReady(true);
      } catch {
        navigate("/login", { replace: true });
      }
    })();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-secondary/30">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
          <NexaMark size={36} />
          <div className="leading-tight">
            <p className="font-display font-semibold">NexaPay</p>
            <p className="text-[11px] text-muted-foreground">SuperAdmin</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium border ${
                  isActive
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent border-transparent"
                }`
              }
            >
              <Icon className="h-4 w-4" /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="w-full justify-start text-muted-foreground">
            <LayoutDashboard className="h-4 w-4 mr-2" /> Vue marchand
          </Button>
          <Button variant="ghost" onClick={() => base44.auth.logout("/login")} className="w-full justify-start text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-2 px-4 border-b border-border bg-sidebar">
        <NexaMark size={32} />
        <span className="font-display font-semibold text-sm">NexaPay SuperAdmin</span>
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0"><Outlet /></main>
    </div>
  );
}