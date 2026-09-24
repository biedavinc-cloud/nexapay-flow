// Signed, httpOnly-cookie session using JWT (HS256 via jose, edge-compatible).
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "nexapay_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(env) {
  if (!env?.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET is not configured (must be a random string >= 32 chars)");
  }
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function createSessionToken(env, userId) {
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret(env));
}

export async function verifySessionToken(env, token) {
  try {
    const { payload } = await jwtVerify(token, getSecret(env));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookieHeader(token) {
  const secure = "Secure; "; // Cloudflare Pages always serves https in prod/preview.
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function getUserIdFromRequest(env, request) {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return null;
  return await verifySessionToken(env, token);
}

export { COOKIE_NAME };
