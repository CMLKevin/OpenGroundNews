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
    <section className="panel" style={{ display: "grid", gap: "0.7rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>{mode === "signup" ? "Create Account" : "Sign In"}</h1>
        <span className="story-meta">{mode === "signup" ? "Cloud-synced follows" : "Welcome back"}</span>
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
        Your follows sync to this server only. For production, wire a proper database and secret management.
      </p>
    </section>
  );
}

