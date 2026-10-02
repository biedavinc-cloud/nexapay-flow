import { getDb } from "../../_lib/db.js";
import { requireMerchant } from "../../_lib/merchantAuth.js";
import { coerce } from "../../_lib/dataPolicy.js";
import { strip, policyFor, deny } from "../../_lib/dataApi.js";
import { validateWallet } from "../../_lib/wallet.js";

// GET /api/data/:entity?sort=-created_date&limit=100&filter={"status":"COMPLETED"}
export async function onRequestGet({ request, env, params }) {
  const sql = getDb(env);
  const pol = policyFor(params.entity);
  if (!pol) return Response.json({ error: "Unknown entity" }, { status: 404 });
  const auth = await requireMerchant(sql, env, request);
  const d = deny(auth, pol, "list");
  if (d) return d;

  const url = new URL(request.url);
  const where = [], args = [];
  if (pol.scope && !auth.isAdmin) {
    if (!auth.tenantId) return Response.json([]);
    args.push(auth.tenantId); where.push(`${pol.scope} = $${args.length}`);
  }
  let filter = {};
  try { filter = JSON.parse(url.searchParams.get("filter") || "{}"); } catch { /* ignore */ }
  for (const [k, v] of Object.entries(filter)) {
    if (!(pol.filterable || []).includes(k)) return Response.json({ error: `Cannot filter on ${k}` }, { status: 400 });
    args.push(v); where.push(`${k} = $${args.length}`);
  }
  const sortRaw = url.searchParams.get("sort") || "-created_date";
  const desc = sortRaw.startsWith("-");
  const sortCol = sortRaw.replace(/^-/, "");
  const orderCol = [...(pol.filterable || []), "created_date", "updated_date"].includes(sortCol) ? sortCol : "created_date";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 1), 500);

  const rows = await sql(
    `select * from ${pol.table} ${where.length ? "where " + where.join(" and ") : ""} order by ${orderCol} ${desc ? "desc" : "asc"} limit ${limit}`,
    args,
  );
  return Response.json(rows.map((r) => strip(r, pol, auth.isAdmin)));
}

export async function onRequestPost({ request, env, params }) {
  const sql = getDb(env);
  const pol = policyFor(params.entity);
  if (!pol) return Response.json({ error: "Unknown entity" }, { status: 404 });
  const auth = await requireMerchant(sql, env, request);
  const d = deny(auth, pol, "create");
  if (d) return d;

  const body = await request.json().catch(() => ({}));
  if (params.entity === "Tenant" && body.receiving_wallet) {
    const err = validateWallet(body.blockchain || "POLYGON", body.receiving_wallet);
    if (err) return Response.json({ error: err }, { status: 400 });
  }
  const names = Object.keys(pol.cols).filter((c) => c in body);
  const values = names.map((c) => coerce(pol.cols[c], body[c]));
  const cols = ["id", ...names, "created_date", "updated_date"];
  const ph = ["gen_random_uuid()::text", ...names.map((_, i) => `$${i + 1}`), "now()", "now()"];
  const [row] = await sql(`insert into ${pol.table} (${cols.join(", ")}) values (${ph.join(", ")}) returning *`, values);
  return Response.json(row);
}
