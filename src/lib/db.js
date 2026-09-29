// Data client for the Cloudflare/Neon backend. Same call shape the pages
// already used (db.Transaction.list("-created_date", 100), .filter(), .get(),
// .create(), .update(), .delete()), but every call goes through
// /api/data/:entity, where access (tenant isolation, admin-only entities,
// writable columns) is enforced SERVER-SIDE -- see functions/_lib/dataPolicy.js.
async function call(path, options = {}) {
  const res = await fetch(`/api/data/${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function entity(name) {
  const e = encodeURIComponent(name);
  const qs = (sort, limit, filter) => {
    const p = new URLSearchParams();
    if (sort) p.set("sort", sort);
    if (limit) p.set("limit", String(limit));
    if (filter && Object.keys(filter).length) p.set("filter", JSON.stringify(filter));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  return {
    list: (sort, limit) => call(`${e}${qs(sort, limit)}`),
    filter: (query, sort, limit) => call(`${e}${qs(sort, limit, query)}`),
    get: (id) => call(`${e}/${encodeURIComponent(id)}`),
    create: (data) => call(e, { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => call(`${e}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => call(`${e}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}

export const db = new Proxy({}, { get: (_, name) => (typeof name === "string" ? entity(name) : undefined) });
