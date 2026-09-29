import { getDb } from "../../_lib/db.js";
import { requireUser } from "../../_lib/merchantAuth.js";
import { encryptKeys } from "../../_lib/pspCrypto.js";
import { TIERS } from "../../_lib/tiers.js";
import { validateWallet } from "../../_lib/wallet.js";

const MAX_IMG = 2_500_000; // chars of base64 per image
const IMG_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

async function storeKyc(sql, env, tenantId, kind, dataUri) {
  if (!dataUri) return "";
  if (dataUri.length > MAX_IMG || !IMG_RE.test(dataUri)) throw new Error(`Invalid ${kind} image (jpeg/png/webp, max ~1.8MB).`);
  const mime = dataUri.slice(5, dataUri.indexOf(";"));
  // Identity documents are encrypted at rest (AES-256-GCM) -- never stored as plain data.
  const encrypted = await encryptKeys(env, { data: dataUri.slice(dataUri.indexOf(",") + 1) });
  const [row] = await sql`insert into nexapay_kyc_files (id, tenant_id, kind, mime, encrypted_data, created_date) values (gen_random_uuid()::text, ${tenantId}, ${kind}, ${mime}, ${encrypted}, now()) returning id`;
  return `/api/admin/kyc-file/${row.id}`;
}

// Creates the merchant's tenant and links it to the logged-in user. This is
// the ONLY code path that assigns tenant_id to a user, and every business
// field that matters (commission, limits, paid access) is decided here from
// server-side facts, never from the request body.
export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  try {
    const user = await requireUser(sql, env, request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.tenantId) return Response.json({ error: "Onboarding already completed." }, { status: 409 });

    const b = await request.json().catch(() => ({}));
    const t = TIERS[b.tier];
    if (!t) return Response.json({ error: "Unknown tier." }, { status: 400 });
    for (const f of ["company_name", "country", "id_name", "id_number", "phone"]) {
      if (!String(b[f] || "").trim()) return Response.json({ error: `${f} is required.` }, { status: 400 });
    }
    const blockchain = b.blockchain === "TRC20" ? "TRC20" : "POLYGON";
    const walletErr = validateWallet(blockchain, b.receiving_wallet);
    if (walletErr) return Response.json({ error: walletErr }, { status: 400 });

    // Has THIS user really paid (server-recorded, PSP-confirmed) at least the tier's fee?
    const paid = await sql`
      select id, amount_fiat from nexapay_transactions
      where payer_user_id = ${user.userId} and purpose = 'onboarding' and status in ('COMPLETED','FIAT_APPROVED','PROCESSING_CRYPTO','CRYPTO_FAILED')
      order by created_date desc limit 1`;
    const hasPaid = !!paid[0] && Number(paid[0].amount_fiat) >= t.price;

    const tenantId = crypto.randomUUID();
    const kycDoc = await storeKyc(sql, env, tenantId, "id_document", b.kyc_doc);
    const selfie = await storeKyc(sql, env, tenantId, "selfie", b.selfie);
    const color = /^#[0-9a-fA-F]{6}$/.test(b.checkout_primary_color || "") ? b.checkout_primary_color : "#6366F1";
    const logo = typeof b.logo_url === "string" && b.logo_url.length < 450_000 && (b.logo_url === "" || /^data:image\/(jpeg|png|webp);base64,/.test(b.logo_url)) ? b.logo_url : "";

    await sql`
      insert into nexapay_tenants (id, company_name, country, city, business_activity, tier, has_paid_access, daily_limit, commission_rate,
        checkout_primary_color, logo_url, account_status, kyc_status, kyc_doc_url, selfie_url, id_name, id_number, phone,
        receiving_wallet, blockchain, onboarding_complete, created_date, updated_date)
      values (${tenantId}, ${String(b.company_name).trim()}, ${b.country}, ${b.city || ""}, ${b.business_activity || ""}, ${t.id}, ${hasPaid}, ${t.daily_limit}, ${t.commission},
        ${color}, ${logo}, 'AWAITING_APPROVAL', ${hasPaid ? "PENDING_KYC" : "PENDING_PAYMENT"}, ${kycDoc}, ${selfie}, ${String(b.id_name).trim()}, ${String(b.id_number).trim()}, ${String(b.phone).trim()},
        ${String(b.receiving_wallet).trim()}, ${blockchain}, true, now(), now())`;
    if (hasPaid) await sql`update nexapay_transactions set purpose = 'onboarding_used' where id = ${paid[0].id}`;
    await sql`update nexapay_auth_users set tenant_id = ${tenantId}, kyc_status = 'PENDING_KYC' where id = ${user.userId}`;

    return Response.json({ ok: true, tenant_id: tenantId, has_paid_access: hasPaid });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
