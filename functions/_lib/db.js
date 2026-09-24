// Shared Neon Postgres client for Cloudflare Pages Functions.
// Not routed (folder name starts with "_"): https://developers.cloudflare.com/pages/functions/routing/
import { neon } from "@neondatabase/serverless";

let cached = null;

// `env.DATABASE_URL` comes from Cloudflare Pages project settings (Production
// and Preview), pointing at your Neon connection string
// (postgresql://user:pass@host/db?sslmode=require).
export function getDb(env) {
  if (!env?.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured for this environment");
  }
  if (!cached) {
    cached = neon(env.DATABASE_URL);
  }
  return cached;
}
