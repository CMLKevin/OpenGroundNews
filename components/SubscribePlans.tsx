"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = { id: string; email: string; role: "user" | "admin" };

export function SubscribePlans({ stripeEnabled }: { stripeEnabled: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState<null | "monthly" | "yearly">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await res.json()) as { user: User | null };
        if (!alive) return;
        setUser(data.user || null);
      } catch {
        if (!alive) return;
        setUser(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function checkout(plan: "monthly" | "yearly") {
    setError(null);
    setBusy(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) {
        setError(data.error || "Unable to start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Unable to start checkout");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel" style={{ display: "grid", gap: "0.7rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Plans</h2>
        <span className="story-meta">{stripeEnabled ? "Stripe Checkout" : "Stripe not configured"}</span>
      </div>

      {!stripeEnabled ? (
        <p className="note" style={{ margin: 0 }}>
          To enable payments, set <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>,{" "}
          <code>STRIPE_PRICE_MONTHLY</code>, and <code>STRIPE_PRICE_YEARLY</code>.
        </p>
      ) : null}

      {!user ? (
        <p className="story-meta" style={{ margin: 0 }}>
          You need an account to subscribe.{" "}
          <Link href="/login?next=/subscribe" style={{ fontWeight: 700 }}>
            Sign in
          </Link>
          .
        </p>
      ) : (
        <p className="story-meta" style={{ margin: 0 }}>
          Signed in as <strong>{user.email}</strong>
        </p>
      )}

      {error ? (
        <p className="note" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}

      <div className="kpi-strip">
        <div className="kpi">
          <span>Monthly</span>
          <strong>$5</strong>
        </div>
        <div className="kpi">
          <span>Yearly</span>
          <strong>$50</strong>
        </div>
        <div className="kpi">
          <span>Includes</span>
          <strong style={{ fontSize: "1rem" }}>Cloud-synced follows</strong>
        </div>
        <div className="kpi">
          <span>Supports</span>
          <strong style={{ fontSize: "1rem" }}>Open infra</strong>
        </div>
      </div>

      <div className="chip-row">
        <button className="btn" type="button" disabled={!stripeEnabled || !user || busy != null} onClick={() => checkout("monthly")}>
          {busy === "monthly" ? "Redirecting..." : "Subscribe monthly"}
        </button>
        <button className="btn" type="button" disabled={!stripeEnabled || !user || busy != null} onClick={() => checkout("yearly")}>
          {busy === "yearly" ? "Redirecting..." : "Subscribe yearly"}
        </button>
      </div>
    </section>
  );
}

