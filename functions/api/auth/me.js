import { getDb } from "../../_lib/db.js";
import { json, jsonError, readJson } from "../../_lib/http.js";
import { findUserById, publicUser } from "../../_lib/users.js";
import { getUserIdFromRequest } from "../../_lib/session.js";

// Fields a user is allowed to self-update. `role` is deliberately excluded --
// it must only ever be changed by an admin-only endpoint (phase 2).
const ALLOWED_FIELDS = ["full_name", "country", "city", "phone", "tenant_id", "kyc_status"];

export async function onRequestGet({ request, env }) {
  const userId = await getUserIdFromRequest(env, request);
  if (!userId) return jsonError("Not authenticated", 401);

  const user = await findUserById(env, userId);
  if (!user) return jsonError("Not authenticated", 401);

  return json({ user: publicUser(user) });
}

export async function onRequestPatch({ request, env }) {
  const userId = await getUserIdFromRequest(env, request);
  if (!userId) return jsonError("Not authenticated", 401);

  const body = await readJson(request);
  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  const sql = getDb(env);
  const [updated] = await sql`
    update users set
      full_name = coalesce(${updates.full_name ?? null}, full_name),
      country = coalesce(${updates.country ?? null}, country),
      city = coalesce(${updates.city ?? null}, city),
      phone = coalesce(${updates.phone ?? null}, phone),
      tenant_id = coalesce(${updates.tenant_id ?? null}, tenant_id),
      kyc_status = coalesce(${updates.kyc_status ?? null}, kyc_status)
    where id = ${userId}
    returning *
  `;

  return json({ user: publicUser(updated) });
}
