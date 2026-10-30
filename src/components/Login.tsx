import { useState } from "react";
import type { FormEvent } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { ArrowLeft, MailCheck } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError("Invalid login credentials for Studio Index.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSuccess(`Password reset link sent to ${email.trim()}. Check your inbox.`);
    } catch {
      setError("Unable to send reset email. Ensure the email address is correct.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-main p-8 shadow-xl">
        {!resetMode ? (
          <div>
            <div className="mb-8 text-center">
              <img
                src="/bg_icon.svg"
                alt="Bluegum"
                className="mx-auto mb-4 size-12 object-contain"
              />
              <h1 className="text-2xl font-bold tracking-tight text-accent-heading">
                Artroom Studio
              </h1>
              <p className="mt-1 text-sm text-text-light">Sign in to access the artroom dashboard</p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-stage-danger-border bg-stage-danger-bg p-3 text-center text-xs font-semibold text-accent-alert">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="form-label mb-1 text-text-dark">User</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field text-text-dark placeholder:text-text-light"
                  placeholder="Your login"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="form-label text-text-dark">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setResetSuccess(null);
                      setResetMode(true);
                    }}
                    className="text-xs font-bold text-accent-action transition hover:opacity-80 focus:outline-none focus:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field text-text-dark placeholder:text-text-light"
                  placeholder="Studio password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl bg-accent-action text-sm font-bold text-white shadow-xs transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Enter Studio"}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setResetSuccess(null);
                setResetMode(false);
              }}
              className="mb-6 flex items-center gap-1.5 text-xs font-bold text-text-light transition hover:text-text-dark"
            >
              <ArrowLeft className="size-4" />
              Back to sign in
            </button>

            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent-action/10 text-accent-action">
                <MailCheck className="size-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-accent-heading">
                Reset Studio Password
              </h2>
              <p className="mt-1 text-sm text-text-light">
                Enter your account email to receive a password reset link.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-stage-danger-border bg-stage-danger-bg p-3 text-center text-xs font-semibold text-accent-alert">
                {error}
              </div>
            )}

            {resetSuccess && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs font-semibold text-emerald-700">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="form-label mb-1 text-text-dark">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field text-text-dark placeholder:text-text-light"
                  placeholder="User Email"
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl bg-accent-action text-sm font-bold text-white shadow-xs transition hover:opacity-90 disabled:opacity-50"
              >
                {resetLoading ? "Sending email..." : "Send Reset Link"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}