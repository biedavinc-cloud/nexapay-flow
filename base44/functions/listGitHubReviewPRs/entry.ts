import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Admin-only: uses the SHARED GitHub connector (builder's account) to list open pull
// requests that are waiting for review (review requested) across the builder's repos.

async function gh(token, path) {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "NexaPay-Base44",
    },
  });
  if (r.status === 404) return null;
  if (!r.ok) {
    let body = "";
    try { body = JSON.stringify(await r.json()).slice(0, 200); } catch {}
    throw new Error(`GitHub ${path} → ${r.status} ${body}`);
  }
  return r.json();
}

// OAuth user token (gho_): /user/repos lists repos the builder owns or collaborates on.
async function listRepos(token) {
  const r = await gh(token, "/user/repos?affiliation=owner,collaborator&sort=updated&per_page=100");
  return Array.isArray(r) ? r : [];
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    if (!accessToken) return Response.json({ error: "GitHub not connected" }, { status: 503 });

    const repos = await listRepos(accessToken);
    if (!Array.isArray(repos) || repos.length === 0) return Response.json({ error: "Aucun dépôt accessible via GitHub" }, { status: 404 });

    const prs = [];
    let scanned = 0;
    for (const repo of repos.slice(0, 60)) {
      scanned++;
      try {
        const open = await gh(accessToken, `/repos/${repo.full_name}/pulls?state=open&per_page=100`);
        if (!Array.isArray(open)) continue;
        for (const p of open) {
          const reviewers = [
            ...(p.requested_reviewers || []).map((u) => u.login),
            ...(p.requested_teams || []).map((t) => `team:${t.name}`),
          ];
          prs.push({
            repo: repo.full_name,
            number: p.number,
            title: p.title,
            url: p.html_url,
            author: p.user?.login,
            authorAvatar: p.user?.avatar_url,
            draft: !!p.draft,
            created_at: p.created_at,
            updated_at: p.updated_at,
            reviewers,
            review_requested: reviewers.length > 0,
          });
        }
      } catch {}
    }

    prs.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return Response.json({ prs, repoCount: repos.length, scanned });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}