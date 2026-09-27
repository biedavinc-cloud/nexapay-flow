import { getDb } from "../../_lib/db.js";

// Public lookup by slug -- no auth (the payer isn't logged in). Never
// exposes internal ids or tenant identity beyond what checkout needs.
async function handle({ request, env }) {
  const sql = getDb(env);
  const url = new URL(request.url);
  let slug = url.searchParams.get("slug");
  if (!slug && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    slug = body.slug;
  }
  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

  const rows = await sql`select * from nexapay_payment_links where slug = ${slug} limit 1`;
  const link = rows[0];
  if (!link) return Response.json({ error: "Link not found" }, { status: 404 });
  if (link.active === false) return Response.json({ error: "Link inactive", inactive: true }, { status: 410 });

  return Response.json({
    label: link.label, amount: Number(link.amount), currency: link.currency || "EUR",
    network: link.network || "TRC20", description: link.description || "",
    slug: link.slug, tenant_id: link.tenant_id || "",
  });
}
export const onRequestGet = handle;
export const onRequestPost = handle;
