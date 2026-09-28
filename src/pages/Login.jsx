import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "@/lib/authClient";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo =
    new URLSearchParams(location.search).get("returnTo") ||
    "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    try {
      setLoading(true);

      await auth.loginViaEmailPassword(
        email.trim().toLowerCase(),
        password
      );

      navigate(returnTo);
    } catch (err) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      setError("");
      setLoading(true);

      await auth.loginWithProvider(
        "google",
        `${window.location.origin}${returnTo}`
      );
    } catch (err) {
      setError(err?.message || "Google authentication failed.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back
        </h1>

        <p className="text-muted-foreground mb-8">
          Sign in to your NexaPay account.
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full rounded-xl border px-4 py-3 mb-6"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted-foreground">
            OR
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-xl border px-4 py-3"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="underline"
          >
            Create account
          </button>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="underline"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}
