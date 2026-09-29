import { getDb } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/adminAuth.js";
import { decryptKeys } from "../../../_lib/pspCrypto.js";

// Admin-only viewer for KYC identity documents (decrypted on the fly, never cached).
export async function onRequestGet({ request, env, params }) {
  const sql = getDb(env);
  if (!(await requireAdmin(sql, env, request))) return new Response("Forbidden", { status: 403 });
  const rows = await sql`select mime, encrypted_data from nexapay_kyc_files where id = ${params.id} limit 1`;
  if (!rows[0]) return new Response("Not found", { status: 404 });
  const { data } = await decryptKeys(env, rows[0].encrypted_data);
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return new Response(bytes, { headers: { "Content-Type": rows[0].mime, "Cache-Control": "no-store", "Content-Disposition": "inline" } });
}
