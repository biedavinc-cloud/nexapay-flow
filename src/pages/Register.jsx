import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/authClient";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (!form.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await auth.register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name.trim(),
      });

      setSuccess(true);
    } catch (err) {
      setError(err?.message || "Unable to create your account.");
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
        `${window.location.origin}/dashboard`
      );
    } catch (err) {
      setError(err?.message || "Google authentication failed.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">
            Check your email
          </h1>

          <p className="text-muted-foreground mb-6">
            We sent a verification email to{" "}
            <strong>{form.email}</strong>.
          </p>

          <p className="text-sm text-muted-foreground mb-6">
            Open the email and click the verification link to activate
            your NexaPay account.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full rounded-xl bg-primary px-4 py-3 text-primary-foreground"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border p-8">
          <h1 className="text-3xl font-bold mb-2">
            Create your NexaPay account
          </h1>

          <p className="text-muted-foreground mb-8">
            Create an account to continue.
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
                Name
              </label>

              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Your name"
                autoComplete="name"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email
              </label>

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Password
              </label>

              <input
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm password
              </label>

              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={updateField}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-medium underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
