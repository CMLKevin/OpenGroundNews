"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

type ApiResponse = { ok: boolean; error?: string };

export function ResetPasswordForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json()) as ApiResponse;
      setResult(json);
      if (json.ok) {
        window.setTimeout(() => {
          router.push("/login");
        }, 700);
      }
    } catch {
      setResult({ ok: false, error: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-shell u-grid u-grid-gap-08">
      <div className="section-title u-pt-0">
        <div className="u-grid u-grid-gap-01">
          <h1 className="u-m0 u-font-serif">Reset password</h1>
          <span className="story-meta">{token ? "Enter a new password" : "Missing token"}</span>
        </div>
      </div>

      {!token ? (
        <p className="note u-m0">
          This reset link is missing a token. Request a new reset from{" "}
          <Link href="/forgot-password">Forgot password</Link>.
        </p>
      ) : (
        <>
          <label className="story-meta u-grid u-grid-gap-02">
            New password
            <input
              className="input-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="At least 10 characters"
            />
          </label>

          {result?.ok ? (
            <p className="note u-m0">
              Password updated. Redirecting to sign in...
            </p>
          ) : result && !result.ok ? (
            <p className="note u-m0">
              {result.error || "Unable to reset password"}
            </p>
          ) : null}

          <div className="chip-row">
            <button className="btn" type="button" onClick={submit} disabled={loading}>
              {loading ? "Working..." : "Update password"}
            </button>
            <Link className="btn" href="/login">
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

