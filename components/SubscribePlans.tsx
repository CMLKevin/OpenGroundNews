"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = { id: string; email: string; role: "user" | "admin" };

export function SubscribePlans() {
  const [user, setUser] = useState<User | null>(null);

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

  return (
    <section className="panel" style={{ display: "grid", gap: "0.85rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Plans</h2>
        <span className="story-meta">Subscriptions are not enabled</span>
      </div>

      <p className="note" style={{ margin: 0 }}>
        OpenGroundNews is currently in parity build-out mode. Pricing cards are here to match the Ground News UX, but
        checkout is intentionally disabled.
      </p>

      {!user ? (
        <p className="story-meta" style={{ margin: 0 }}>
          Create an account to save your preferences across devices.{" "}
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

      <div className="plans-grid">
        <article className="plan-card plan-card-1">
          <div className="plan-head">
            <div>
              <div className="plan-badge">Essential</div>
              <h3 className="plan-title">Vantage</h3>
            </div>
            <div className="plan-price">
              <strong>$0</strong>
              <span>for now</span>
            </div>
          </div>
          <ul className="plan-list">
            <li>Daily Briefing + Bias distribution</li>
            <li>Blindspot feed + Local feed</li>
            <li>Reader mode with archive fallback</li>
          </ul>
          <div className="plan-actions">
            <Link className="btn" href="/get-started">
              Get started
            </Link>
          </div>
        </article>

        <article className="plan-card plan-card-2">
          <div className="plan-head">
            <div>
              <div className="plan-badge plan-badge-gold">Most popular</div>
              <h3 className="plan-title">Premium</h3>
            </div>
            <div className="plan-price">
              <strong>$0</strong>
              <span>parity build</span>
            </div>
          </div>
          <ul className="plan-list">
            <li>My News Bias dashboard</li>
            <li>Reading history + personalized feed</li>
            <li>Richer search + suggestions</li>
          </ul>
          <div className="plan-actions">
            <a className="btn" href="https://github.com" target="_blank" rel="noreferrer">
              Support on GitHub
            </a>
          </div>
        </article>

        <article className="plan-card plan-card-3">
          <div className="plan-head">
            <div>
              <div className="plan-badge">For teams</div>
              <h3 className="plan-title">Pro</h3>
            </div>
            <div className="plan-price">
              <strong>$0</strong>
              <span>planned</span>
            </div>
          </div>
          <ul className="plan-list">
            <li>Advanced outlet metadata panels</li>
            <li>Exports + editorial tooling</li>
            <li>Deployment + ops guides</li>
          </ul>
          <div className="plan-actions">
            <a className="btn" href="mailto:hello@opengroundnews.local">
              Contact
            </a>
          </div>
        </article>
      </div>

      <p className="story-meta" style={{ margin: 0 }}>
        Want updates? Join the waitlist from the Blindspot page newsletter CTA.
      </p>
    </section>
  );
}
