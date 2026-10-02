import { getDb } from "../../../_lib/db.js";
import { requireMerchant } from "../../../_lib/merchantAuth.js";
import { coerce } from "../../../_lib/dataPolicy.js";
import { strip, policyFor, deny } from "../../../_lib/dataApi.js";
import { validateWallet } from "../../../_lib/wallet.js";

async function loadRow(sql, pol, auth, id) {
  const args = [id];
  let q = `select * from ${pol.table} where id = $1`;
  if (pol.scope && !auth.isAdmin) {
    if (!auth.tenantId) return null;
    args.push(auth.tenantId);
    q += ` and ${pol.scope} = $2`;
  }
  const rows = await sql(q, args);
  return rows[0] || null;
}

export async function onRequestGet({ request, env, params }) {
  const sql = getDb(env);
  const pol = policyFor(params.entity);
  if (!pol) return Response.json({ error: "Unknown entity" }, { status: 404 });
  const auth = await requireMerchant(sql, env, request);
  const d = deny(auth, pol, "get");
  if (d) return d;
  const row = await loadRow(sql, pol, auth, params.id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(strip(row, pol, auth.isAdmin));
}

export async function onRequestPatch({ request, env, params }) {
  const sql = getDb(env);
  const pol = policyFor(params.entity);
  if (!pol) return Response.json({ error: "Unknown entity" }, { status: 404 });
  const auth = await requireMerchant(sql, env, request);
  const d = deny(auth, pol, "update");
  if (d) return d;
  const row = await loadRow(sql, pol, auth, params.id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (params.entity === "Tenant" && "receiving_wallet" in body) {
    const chain = body.blockchain || row.blockchain || "POLYGON";
    const err = validateWallet(chain, body.receiving_wallet);
    if (err) return Response.json({ error: err }, { status: 400 });
  }
  const names = Object.keys(pol.cols).filter((c) => c in body);
  if (names.length === 0) return Response.json({ error: "No valid fields" }, { status: 400 });
  const values = names.map((c) => coerce(pol.cols[c], body[c]));
  const sets = names.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const [updated] = await sql(`update ${pol.table} set ${sets}, updated_date = now() where id = $${names.length + 1} returning *`, [...values, params.id]);
  return Response.json(strip(updated, pol, auth.isAdmin));
}

export async function onRequestDelete({ request, env, params }) {
  const sql = getDb(env);
  const pol = policyFor(params.entity);
  if (!pol) return Response.json({ error: "Unknown entity" }, { status: 404 });
  const auth = await requireMerchant(sql, env, request);
  const d = deny(auth, pol, "delete");
  if (d) return d;
  const row = await loadRow(sql, pol, auth, params.id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  await sql(`delete from ${pol.table} where id = $1`, [params.id]);
  return Response.json({ ok: true });
}
