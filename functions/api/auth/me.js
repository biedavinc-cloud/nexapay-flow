import { getDb } from "../../_lib/db.js";
import { json, jsonError, readJson, withErrors } from "../../_lib/http.js";
import { findUserById, publicUser } from "../../_lib/users.js";
import { getUserIdFromRequest } from "../../_lib/session.js";

// Fields a user may self-update: profile data ONLY. `role`, `tenant_id` and
// `kyc_status` are deliberately excluded. tenant_id in particular is the
// multi-tenant isolation boundary -- if a user could write it, they could
// attach themselves to ANY merchant's tenant and read/steal its API keys,
// wallet and data. Only the server-side onboarding endpoint links a user to
// a tenant it just created for them.
const ALLOWED_FIELDS = ["full_name", "country", "city", "phone"];

export const onRequestGet = withErrors(async ({ request, env }) => {
  const userId = await getUserIdFromRequest(env, request);
  if (!userId) return jsonError("Not authenticated", 401);

  const user = await findUserById(env, userId);
  if (!user) return jsonError("Not authenticated", 401);

  return json({ user: publicUser(user) });
});

export const onRequestPatch = withErrors(async ({ request, env }) => {
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
    update nexapay_auth_users set
      full_name = coalesce(${updates.full_name ?? null}, full_name),
      country = coalesce(${updates.country ?? null}, country),
      city = coalesce(${updates.city ?? null}, city),
      phone = coalesce(${updates.phone ?? null}, phone)
    where id = ${userId}
    returning *
  `;

  return json({ user: publicUser(updated) });
});
