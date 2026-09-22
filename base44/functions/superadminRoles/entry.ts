import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

const WHITELIST = [
  "vincentnogue@yahoo.com",
  "vincentnogue2@gmail.com",
  "webdxb1@gmail.com",
];

// SuperAdmin role provisioning & management.
// - provision: auto-promote the caller if their email is whitelisted.
// - list: return all users + active superadmin count (SUPER_ADMIN only).
// - setRole: promote/revoke SUPER_ADMIN, enforcing the 2-superadmin minimum guard.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = body.action || "provision";
    const sr = base44.asServiceRole.entities;

    const canManage = me.role === "SUPER_ADMIN" || WHITELIST.includes(me.email);

    if (action === "provision") {
      if (!WHITELIST.includes(me.email)) return Response.json({ promoted: false, role: me.role || "user" });
      if (me.role === "SUPER_ADMIN") return Response.json({ promoted: false, role: "SUPER_ADMIN" });
      await sr.User.update(me.id, { role: "SUPER_ADMIN" });
      try {
        await sr.SuperadminAuditLog.create({
          action: "auto_provision_superadmin",
          admin_id: me.id,
          admin_email: me.email,
          details: "email whitelist",
        });
      } catch {}
      return Response.json({ promoted: true, role: "SUPER_ADMIN" });
    }

    if (action === "list") {
      if (!canManage) return Response.json({ error: "Forbidden" }, { status: 403 });
      const users = await sr.User.list("-created_date", 200);
      const superadminCount = users.filter((u) => u.role === "SUPER_ADMIN").length;
      return Response.json({
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          created_date: u.created_date,
        })),
        superadminCount,
      });
    }

    if (action === "setRole") {
      if (!canManage) return Response.json({ error: "Forbidden" }, { status: 403 });
      const targetId = body.user_id;
      const newRole = body.role;
      if (!targetId || !newRole) return Response.json({ error: "user_id and role required" }, { status: 400 });
      const users = await sr.User.list("-created_date", 200);
      const target = users.find((u) => u.id === targetId);
      if (!target) return Response.json({ error: "User not found" }, { status: 404 });

      // 2-superadmin minimum guard (server-side)
      const superadminCount = users.filter((u) => u.role === "SUPER_ADMIN").length;
      const isRevoke = target.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN";
      if (isRevoke && superadminCount <= 2) {
        return Response.json(
          { error: "Action bloquée : La plateforme doit conserver au moins 2 SuperAdmins actifs en permanence." },
          { status: 409 }
        );
      }

      await sr.User.update(targetId, { role: newRole });
      try {
        await sr.SuperadminAuditLog.create({
          action: `set_role:${newRole}`,
          admin_id: me.id,
          admin_email: me.email,
          target_tenant_id: targetId,
          details: `${target.email} -> ${newRole}`,
        });
      } catch {}
      return Response.json({ ok: true });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}