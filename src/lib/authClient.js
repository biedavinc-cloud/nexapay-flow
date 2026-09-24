// Replaces the Base44 SDK's `base44.auth.*` surface. Sessions are httpOnly
// cookies set by /functions/api/auth/*, so there is no token to store client
// side -- every call just needs `credentials: "include"`.

async function request(path, options = {}) {
  const res = await fetch(`/api/auth${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    // no body (e.g. some 204/redirects)
  }
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const auth = {
  async me() {
    const { user } = await request("/me");
    return user;
  },

  async updateMe(fields) {
    const { user } = await request("/me", { method: "PATCH", body: JSON.stringify(fields) });
    return user;
  },

  async loginViaEmailPassword(email, password) {
    return request("/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },

  loginWithProvider(provider, returnTo = "/dashboard") {
    if (provider !== "google") throw new Error(`Unsupported provider: ${provider}`);
    window.location.href = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
  },

  async register({ email, password }) {
    return request("/register", { method: "POST", body: JSON.stringify({ email, password }) });
  },

  async verifyOtp({ email, otpCode }) {
    return request("/verify-otp", { method: "POST", body: JSON.stringify({ email, otpCode }) });
  },

  async resendOtp(email) {
    return request("/resend-otp", { method: "POST", body: JSON.stringify({ email }) });
  },

  async resetPasswordRequest(email) {
    return request("/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  },

  async resetPassword({ resetToken, newPassword }) {
    return request("/reset-password", { method: "POST", body: JSON.stringify({ resetToken, newPassword }) });
  },

  async logout(redirectTo) {
    try {
      await request("/logout", { method: "POST" });
    } finally {
      if (redirectTo) window.location.href = redirectTo;
    }
  },

  redirectToLogin(returnUrl) {
    const path = new URL(returnUrl, window.location.origin).pathname + window.location.search;
    window.location.href = `/login?returnTo=${encodeURIComponent(path)}`;
  },
};
