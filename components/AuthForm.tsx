"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = useMemo(() => searchParams.get("next") || "/my", [searchParams]);

  async function submit() {
    setError(null);
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
    <section className="panel auth-shell" style={{ display: "grid", gap: "0.8rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gap: "0.1rem" }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>{mode === "signup" ? "Create account" : "Sign in"}</h1>
          <span className="story-meta">{mode === "signup" ? "Sync follows and reading history" : "Welcome back"}</span>
        </div>
      </div>

      <div className="auth-oauth-row">
        <button className="btn" type="button" disabled aria-disabled="true">
          Continue with Google (coming soon)
        </button>
        <button className="btn" type="button" disabled aria-disabled="true">
          Continue with Apple (coming soon)
        </button>
      </div>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
        Email
        <input className="input-control" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
      </label>
      <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
        Password
        <input
          className="input-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "At least 10 characters" : ""}
        />
      </label>
      {error ? (
        <p className="note" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
      <div className="chip-row">
        <button className="btn" type="button" onClick={submit} disabled={loading}>
          {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
        </button>
        {mode === "signup" ? (
          <Link className="btn" href={`/login${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}>
            I already have an account
          </Link>
        ) : (
          <Link className="btn" href={`/signup${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}>
            Create account
          </Link>
        )}
      </div>
      <p className="story-meta" style={{ margin: 0 }}>
        Your account enables cloud-synced follows and bias tracking. Passwords are stored using scrypt hashing.
      </p>
    </section>
  );
}
