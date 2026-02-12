"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type User = { id: string; email: string; role: "user" | "admin" };

export function SubscribePlans() {
  const [user, setUser] = useState<User | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

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

  const plans = useMemo(() => {
    const price = (monthly: number, annual: number) => (billing === "monthly" ? monthly : annual);
    const suffix = billing === "monthly" ? "/mo" : "/yr";
    return [
      {
        key: "vantage",
        badge: "Essential",
        title: "Vantage",
        sub: "Understand coverage bias, fast",
        price: `$${price(9.99, 99.0).toFixed(2)}`,
        suffix,
        cta: { href: "/get-started", label: "Start free" },
        className: "plan-card plan-card-1",
        features: ["Daily Briefing + Bias distribution", "Blindspot + Local feed", "Reader mode with archive fallback"],
      },
      {
        key: "premium",
        badge: "Most popular",
        title: "Premium",
        sub: "Personalization and deeper tooling",
        price: `$${price(14.99, 149.0).toFixed(2)}`,
        suffix,
        cta: { href: "/get-started", label: "Try Premium" },
        className: "plan-card plan-card-2",
        features: ["My News Bias dashboard", "Custom feeds + Saved stories", "Richer search + citations views"],
      },
      {
        key: "pro",
        badge: "For teams",
        title: "Pro",
        sub: "Advanced workflows for newsrooms",
        price: `$${price(29.99, 299.0).toFixed(2)}`,
        suffix,
        cta: { href: "mailto:hello@opengroundnews.local", label: "Contact" },
        className: "plan-card plan-card-3",
        features: ["Outlet metadata + exports", "Alerts + admin diagnostics", "Deployment + ops guides"],
      },
    ];
  }, [billing]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.85rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>Plans</h2>
          <span className="story-meta">Checkout disabled (parity build)</span>
        </div>

        <p className="note" style={{ margin: 0 }}>
          OpenGroundNews is currently in Ground News parity build-out mode. The subscribe UX is implemented 1:1, but
          payments are intentionally disabled for now.
        </p>

        {!user ? (
          <p className="story-meta" style={{ margin: 0 }}>
            Create an account to sync preferences across devices.{" "}
            <Link href="/login?next=/subscribe" style={{ fontWeight: 800 }}>
              Sign in
            </Link>
            .
          </p>
        ) : (
          <p className="story-meta" style={{ margin: 0 }}>
            Signed in as <strong>{user.email}</strong>
          </p>
        )}

        <div className="pricing-toggle" role="tablist" aria-label="Billing period">
          <button
            type="button"
            className={`pricing-toggle-btn ${billing === "monthly" ? "is-active" : ""}`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`pricing-toggle-btn ${billing === "annual" ? "is-active" : ""}`}
            onClick={() => setBilling("annual")}
          >
            Annual
          </button>
        </div>

        <div className="plans-grid">
          {plans.map((p) => (
            <article key={p.key} className={p.className}>
              <div className="plan-illus" aria-hidden="true">
                <svg width="120" height="56" viewBox="0 0 120 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 36c18-24 40-28 62-14 14 9 26 10 38 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
                  <path d="M18 44c12-16 28-22 47-17 14 4 26 2 37-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="22" cy="20" r="7" fill="currentColor" opacity="0.18" />
                  <circle cx="56" cy="14" r="9" fill="currentColor" opacity="0.12" />
                  <circle cx="92" cy="22" r="8" fill="currentColor" opacity="0.16" />
                </svg>
              </div>
              <div className="plan-head">
                <div>
                  <div className={`plan-badge ${p.badge === "Most popular" ? "plan-badge-gold" : ""}`}>{p.badge}</div>
                  <h3 className="plan-title">{p.title}</h3>
                  <div className="story-meta">{p.sub}</div>
                </div>
                <div className="plan-price">
                  <strong>{p.price}</strong>
                  <span>{p.suffix}</span>
                </div>
              </div>
              <ul className="plan-list">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="plan-actions">
                {p.cta.href.startsWith("mailto:") ? (
                  <a className="btn" href={p.cta.href}>
                    {p.cta.label}
                  </a>
                ) : (
                  <Link className="btn" href={p.cta.href}>
                    {p.cta.label}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>As featured on</h2>
          <span className="story-meta">Placeholder strip</span>
        </div>
        <div className="featured-strip" aria-label="Featured on">
          {["BBC", "NPR", "The Guardian", "WSJ", "NYT", "Reuters", "AP"].map((name) => (
            <div key={name} className="featured-logo">
              {name}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>What members say</h2>
          <span className="story-meta">Testimonials</span>
        </div>
        <div className="testimonials">
          {[
            { quote: "The bias distribution alone changed how I read headlines.", name: "A. Reader" },
            { quote: "Blindspots are a daily reality check. I love the compact side-by-side view.", name: "M. Analyst" },
            { quote: "Finally, a feed that pushes me out of my comfort zone.", name: "S. Subscriber" },
          ].map((t) => (
            <figure key={t.name} className="testimonial">
              <blockquote>{t.quote}</blockquote>
              <figcaption> {t.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>Compare features</h2>
          <span className="story-meta">Vantage vs Premium vs Pro</span>
        </div>
        <div className="compare-table" role="table" aria-label="Feature comparison">
          <div className="compare-row compare-head" role="row">
            <div role="columnheader">Feature</div>
            <div role="columnheader">Vantage</div>
            <div role="columnheader">Premium</div>
            <div role="columnheader">Pro</div>
          </div>
          {[
            ["Bias distribution", true, true, true],
            ["Blindspot feed", true, true, true],
            ["Local + Weather", true, true, true],
            ["Saved stories", false, true, true],
            ["Custom feeds", false, true, true],
            ["Citations view", false, true, true],
            ["Outlet exports", false, false, true],
          ].map((row) => (
            <div key={row[0] as string} className="compare-row" role="row">
              <div role="cell">{row[0] as string}</div>
              {[row[1], row[2], row[3]].map((v, idx) => (
                <div key={idx} role="cell" className="compare-cell">
                  {v ? "✓" : "—"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
