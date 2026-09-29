import { POLICY } from "./dataPolicy.js";

export function strip(row, pol, isAdmin) {
  if (isAdmin || !pol.hideForMerchant) return row;
  const out = { ...row };
  for (const c of pol.hideForMerchant) delete out[c];
  return out;
}

export function policyFor(entity) {
  return Object.prototype.hasOwnProperty.call(POLICY, entity) ? POLICY[entity] : null;
}

// Returns null if the caller may perform `op`, else a Response to send back.
export function deny(auth, pol, op) {
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rule = pol[op];
  if (rule === "none") return Response.json({ error: "Not allowed" }, { status: 405 });
  if (rule === "admin" && !auth.isAdmin) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
