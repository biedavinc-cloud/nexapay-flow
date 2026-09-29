import { getDb } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/adminAuth.js";
import { ADMIN_ENTITIES, coerce } from "../../../_lib/adminEntities.js";

function entityOf(request) {
  const name = new URL(request.url).searchParams.get("entity");
  return name && Object.prototype.hasOwnProperty.call(ADMIN_ENTITIES, name) ? ADMIN_ENTITIES[name] : null;
}

export async function onRequestPatch({ request, env, params }) {
  const sql = getDb(env);
  if (!(await requireAdmin(sql, env, request))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const ent = entityOf(request);
  if (!ent) return Response.json({ error: "Unknown entity" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const names = Object.keys(ent.cols).filter((c) => c in body);
  if (names.length === 0) return Response.json({ error: "No valid fields" }, { status: 400 });
  const values = names.map((c) => coerce(ent.cols[c], body[c]));

  if (ent.defaultGroup && body.is_default === true) {
    const cur = await sql(`select ${ent.defaultGroup} as g from ${ent.table} where id = $1`, [params.id]);
    if (cur[0]) await sql(`update ${ent.table} set is_default = false where ${ent.defaultGroup} = $1`, [cur[0].g]);
  }

  const sets = names.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const rows = await sql(`update ${ent.table} set ${sets}, updated_date = now() where id = $${names.length + 1} returning *`, [...values, params.id]);
  if (!rows[0]) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(rows[0]);
}

export async function onRequestDelete({ request, env, params }) {
  const sql = getDb(env);
  if (!(await requireAdmin(sql, env, request))) return Response.json({ error: "Forbidden" }, { status: 403 });
  const ent = entityOf(request);
  if (!ent) return Response.json({ error: "Unknown entity" }, { status: 400 });
  await sql(`delete from ${ent.table} where id = $1`, [params.id]);
  return Response.json({ ok: true });
}
