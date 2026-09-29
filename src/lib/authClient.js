import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;

if (!authUrl) {
  throw new Error(
    "VITE_NEON_AUTH_URL is missing. Add your Neon Auth URL to the environment variables."
  );
}

export const authClient = createAuthClient(authUrl, {
  adapter: BetterAuthReactAdapter(),
});

export const auth = {
  getSession() {
    return authClient.getSession();
  },

  useSession() {
    return authClient.useSession();
  },

  async me() {
    const result = await authClient.getSession();

    if (result?.error) {
      throw new Error(result.error.message || "Unable to get session");
    }

    return result?.data?.user ?? null;
  },

  async register({ email, password, name = "" }) {
    const result = await authClient.signUp.email({
      email,
      password,
      name: name || email.split("@")[0],
    });

    if (result?.error) {
      throw new Error(result.error.message || "Registration failed");
    }

    return result?.data;
  },

  async loginViaEmailPassword(email, password) {
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result?.error) {
      throw new Error(result.error.message || "Login failed");
    }

    return result?.data;
  },

  async loginWithProvider(provider = "google", callbackURL = "/dashboard") {
    if (provider !== "google") {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });

    if (result?.error) {
      throw new Error(result.error.message || "Google login failed");
    }

    return result?.data;
  },

  async logout() {
    const result = await authClient.signOut();

    if (result?.error) {
      throw new Error(result.error.message || "Logout failed");
    }

    return true;
  },

  async updateMe(fields) {
    const result = await authClient.updateUser(fields);

    if (result?.error) {
      throw new Error(result.error.message || "Unable to update profile");
    }

    return result?.data?.user ?? result?.data;
  },

  async resendVerificationEmail() {
    const result = await authClient.sendVerificationEmail({
      callbackURL: `${window.location.origin}/dashboard`,
    });

    if (result?.error) {
      throw new Error(
        result.error.message || "Unable to resend verification email"
      );
    }

    return result?.data;
  },

  async resetPasswordRequest(email) {
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (result?.error) {
      throw new Error(
        result.error.message || "Unable to request password reset"
      );
    }

    return result?.data;
  },

  async resetPassword({ token, newPassword }) {
    const result = await authClient.resetPassword({
      token,
      newPassword,
    });

    if (result?.error) {
      throw new Error(
        result.error.message || "Unable to reset password"
      );
    }

    return result?.data;
  },
};
