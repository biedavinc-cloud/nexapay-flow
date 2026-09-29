import { db } from "@/lib/db";
import { auth } from "@/lib/authClient";

export async function logAudit(action, target_tenant_id, details) {
  try {
    const me = await auth.me();
    await db.SuperadminAuditLog.create({
      action,
      target_tenant_id: target_tenant_id || "",
      details: typeof details === "string" ? details : JSON.stringify(details),
      admin_id: me.id,
      admin_email: me.email,
    });
  } catch {}
}