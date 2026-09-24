// Minimal transactional email sender using the Resend HTTPS API (no SDK
// needed -- keeps the Workers bundle small and avoids Node-only deps).
// Requires env.RESEND_API_KEY and env.EMAIL_FROM (e.g. "NexaPay <auth@yourdomain.com>").
// Swap providers by rewriting this one function if you prefer Postmark/SES/etc.
export async function sendEmail(env, { to, subject, html }) {
  if (!env?.RESEND_API_KEY || !env?.EMAIL_FROM) {
    // Fail loudly in logs but don't throw: an OTP/reset email that can't send
    // shouldn't be silently swallowed, but a misconfigured mail provider
    // shouldn't crash registration either. Surface it to the caller instead.
    console.error("Email not sent: RESEND_API_KEY / EMAIL_FROM not configured", { to, subject });
    return { sent: false, reason: "email_not_configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html }),
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
