import { getDb } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/adminAuth.js";
import { ADMIN_ENTITIES, coerce } from "../../_lib/adminEntities.js";

function entityOf(request) {
  const name = new URL(request.url).searchParams.get("entity");
  return name && Object.prototype.hasOwnProperty.call(ADMIN_ENTITIES, name) ? ADMIN_ENTITIES[name] : null;
}

export async function onRequestGet({ request, env }) {
  const sql = getDb(env);
  if (!(await requireAdmin(sql, env, request))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const ent = entityOf(request);
  if (!ent) return Response.json({ error: "Unknown entity" }, { status: 400 });
  const rows = await sql(`select * from ${ent.table} order by created_date desc limit 200`);
  return Response.json(rows);
}

export async function onRequestPost({ request, env }) {
  const sql = getDb(env);
  if (!(await requireAdmin(sql, env, request))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const ent = entityOf(request);
  if (!ent) return Response.json({ error: "Unknown entity" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const names = Object.keys(ent.cols).filter((c) => c in body);
  const values = names.map((c) => coerce(ent.cols[c], body[c]));

  // Only one default per group (e.g. per chain for wallets).
  if (ent.defaultGroup && body.is_default && body[ent.defaultGroup]) {
    await sql(`update ${ent.table} set is_default = false where ${ent.defaultGroup} = $1`, [body[ent.defaultGroup]]);
  }

  const cols = ["id", ...names, "created_date", "updated_date"];
  const placeholders = ["gen_random_uuid()::text", ...names.map((_, i) => `$${i + 1}`), "now()", "now()"];
  const [row] = await sql(`insert into ${ent.table} (${cols.join(", ")}) values (${placeholders.join(", ")}) returning *`, values);
  return Response.json(row);
}
