// Minimal transactional email sender using the Resend HTTPS API (no SDK
// needed -- keeps the Workers bundle small and avoids Node-only deps).
// Credentials come from the superadmin dashboard (nexapay_psp_configs,
// provider "RESEND", same AES-256-GCM store as the PSP keys -- configurable
// live, no redeploy) with env vars (RESEND_API_KEY / EMAIL_FROM) as a
// fallback for local/first-boot use. Swap providers by rewriting this one
// function if you prefer Postmark/SES/etc.
import { resolvePspCredentials } from "./pspCrypto.js";
import { getDb } from "./db.js";

export async function sendEmail(env, { to, subject, html }) {
  let apiKey = env?.RESEND_API_KEY, from = env?.EMAIL_FROM;
  try {
    const cred = await resolvePspCredentials(getDb(env), env, "RESEND");
    if (cred?.keys?.api_key) apiKey = cred.keys.api_key;
    if (cred?.keys?.from) from = cred.keys.from;
  } catch { /* fall back to env vars below */ }

  if (!apiKey || !from) {
    // Fail loudly in logs but don't throw: an OTP/reset email that can't send
    // shouldn't be silently swallowed, but a misconfigured mail provider
    // shouldn't crash registration either. Surface it to the caller instead.
    console.error("Email not sent: no Resend key configured (superadmin > Passerelles > Email, or RESEND_API_KEY/EMAIL_FROM)", { to, subject });
    return { sent: false, reason: "email_not_configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Resend send failed", res.status, body);
    return { sent: false, reason: "provider_error" };
  }
  return { sent: true };
}

export function otpEmailHtml(code) {
  return `<p>Your NexaPay verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes.</p>`;
}

export function resetPasswordEmailHtml(resetUrl) {
  return `<p>You requested a password reset for your NexaPay account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`;
}
