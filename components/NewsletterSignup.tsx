"use client";

import { useState } from "react";

export function NewsletterSignup({ list = "blindspot" }: { list?: string }) {
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function submit() {
    const clean = email.trim();
    if (!clean) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: clean,
          list,
          frequency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      });
      const json = (await res.json()) as any;
      if (!json.ok) {
        setStatus("error");
        return;
      }
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="newsletter">
      <label className="story-meta u-grid u-grid-gap-02">
        Email
        <input
          className="input-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
        />
      </label>
      <label className="story-meta u-grid u-grid-gap-02">
        Frequency
        <select className="select-control" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
        </select>
      </label>
      <button className="btn" type="button" onClick={submit} disabled={status === "loading"}>
        {status === "loading" ? "Signing up..." : "Sign up"}
      </button>
      {status === "ok" ? <span className="story-meta">You're on the list.</span> : null}
      {status === "error" ? <span className="story-meta">Signup failed. Try again.</span> : null}
    </div>
  );
}
