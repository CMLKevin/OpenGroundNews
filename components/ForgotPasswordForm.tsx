"use client";

import Link from "next/link";
import { useState } from "react";

type ApiResponse = { ok: boolean; error?: string; devResetUrl?: string };

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as ApiResponse;
      setResult(json);
    } catch {
      setResult({ ok: false, error: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-shell" style={{ display: "grid", gap: "0.8rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gap: "0.1rem" }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Forgot password</h1>
          <span className="story-meta">Reset your account password</span>
        </div>
      </div>

      <p className="story-meta" style={{ margin: 0 }}>
        Enter the email address associated with your account. If it exists, we’ll generate a reset link.
      </p>

      <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
        Email
        <input className="input-control" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
      </label>

      {result?.ok ? (
        <p className="note" style={{ margin: 0 }}>
          If an account exists for that email, a reset link has been generated.
          {result.devResetUrl ? (
            <>
              {" "}
              Dev link:{" "}
              <a className="rail-link" href={result.devResetUrl}>
                Reset password
              </a>
              .
            </>
          ) : null}
        </p>
      ) : result && !result.ok ? (
        <p className="note" style={{ margin: 0 }}>
          {result.error || "Unable to generate reset link"}
        </p>
      ) : null}

      <div className="chip-row">
        <button className="btn" type="button" onClick={submit} disabled={loading}>
          {loading ? "Working..." : "Generate reset link"}
        </button>
        <Link className="btn" href="/login">
          Back to sign in
        </Link>
      </div>
    </section>
  );
}

