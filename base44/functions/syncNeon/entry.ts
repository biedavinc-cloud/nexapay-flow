import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { syncAllToNeon, neonPing } from "../../shared/neon.ts";

// Admin-only: mirrors every Base44 entity into the connected Neon Postgres
// database (full snapshot). Re-run after config changes to keep Neon complete.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const version = await neonPing();
    const counts = await syncAllToNeon(base44);
    return Response.json({ ok: true, version, counts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}