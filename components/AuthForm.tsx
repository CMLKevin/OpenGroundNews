"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { OAuthButtons } from "@/components/OAuthButtons";
import { safeAppPath } from "@/lib/navigation";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = useMemo(() => safeAppPath(searchParams.get("next"), "/my"), [searchParams]);

  async function submit() {
    setError(null);
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error || "Authentication failed");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-shell u-grid u-grid-gap-08">
      <div className="section-title u-pt-0">
        <div className="u-grid u-grid-gap-01">
          <h1 className="u-m0 u-font-serif">{mode === "signup" ? "Create account" : "Sign in"}</h1>
          <span className="story-meta">{mode === "signup" ? "Sync follows and reading history" : "Welcome back"}</span>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="u-grid u-grid-gap-08"
      >
        <label className="story-meta u-grid u-grid-gap-02">
          Email
          <input
            className="input-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="story-meta u-grid u-grid-gap-02">
          Password
          <input
            className="input-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "At least 10 characters" : ""}
            required
            minLength={10}
          />
        </label>
        {mode === "signup" ? (
          <label className="story-meta u-grid u-grid-gap-02">
            Confirm password
            <input
              className="input-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
            />
          </label>
        ) : null}
        {mode === "login" ? (
          <Link className="story-meta u-w-fit" href="/forgot-password">
            Forgot password?
          </Link>
        ) : null}
        {error ? (
          <p className="note u-m0">
            {error}
          </p>
        ) : null}
        <div className="chip-row">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          {mode === "signup" ? (
            <Link className="btn btn-secondary" href={`/login${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}>
              I already have an account
            </Link>
          ) : (
            <Link className="btn btn-secondary" href={`/signup${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}>
              Create account
            </Link>
          )}
        </div>
      </form>
      <div className="u-grid u-grid-gap-035">
        <span className="story-meta">Or continue with</span>
        <OAuthButtons next={redirectTo} />
      </div>
      <p className="story-meta u-m0">
        By continuing, you agree to the Terms and acknowledge the Privacy Policy. Passwords are stored using scrypt hashing.
        {" "}
        <Link href="/terms">Terms</Link> • <Link href="/privacy">Privacy</Link>
      </p>
    </section>
  );
}
