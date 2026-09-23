import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Public lookup of a payment link by its slug — no auth required (the client opening the link
// is not logged in). Returns only the fields the checkout needs; never exposes internal ids.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let slug = null;
    try {
      const body = await req.json();
      slug = body?.slug;
    } catch {}
    if (!slug) slug = new URL(req.url).searchParams.get("slug");
    if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

    const matches = await base44.asServiceRole.entities.PaymentLink.filter({ slug });
    const link = (matches && matches[0]) || null;
    if (!link) return Response.json({ error: "Link not found" }, { status: 404 });
    if (link.active === false) return Response.json({ error: "Link inactive", inactive: true }, { status: 410 });

    return Response.json({
      label: link.label,
      amount: Number(link.amount),
      currency: link.currency || "EUR",
      network: link.network || "TRC20",
      description: link.description || "",
      slug: link.slug,
      tenant_id: link.tenant_id || "",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}