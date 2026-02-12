"use client";

import Link from "next/link";
import { useState } from "react";

type Publisher = {
  slug: string;
  outlet: string;
  logoUrl?: string | null;
  biasRating?: string | null;
  bias?: string | null;
  count: number;
  localCount: number;
};

function initials(label: string) {
  const words = (label || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function LocalPublishersList({ publishers }: { publishers: Publisher[] }) {
  const [open, setOpen] = useState(false);

  const visible = open ? publishers : publishers.slice(0, 8);
  const remaining = Math.max(0, publishers.length - visible.length);

  return (
    <section className="panel">
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Local News Publishers</h2>
        <button className="btn" type="button" onClick={() => setOpen(!open)} disabled={publishers.length <= 8}>
          {open ? "Show less" : remaining ? `Show all (${publishers.length})` : "All"}
        </button>
      </div>
      <ul className="topic-list" style={{ gap: "0.52rem" }}>
        {visible.map((o) => (
          <li key={o.slug} className="topic-item">
            <span className="topic-avatar" aria-hidden="true">
              {o.logoUrl ? (
                <img
                  src={String(o.logoUrl)}
                  alt={o.outlet}
                  style={{ width: 24, height: 24, borderRadius: 999, objectFit: "cover" }}
                />
              ) : (
                initials(o.outlet)
              )}
            </span>
            <Link href={`/source/${encodeURIComponent(o.slug)}`} style={{ textDecoration: "none" }}>
              {o.outlet}
            </Link>
            <span className="topic-item-right">
              <span className="bias-pill">
                {String(o.biasRating || o.bias || "unknown").replace(/_/g, "-")}
              </span>
              <span className="story-meta">{o.localCount ? `${o.localCount} local` : `${o.count}`}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="story-meta" style={{ margin: "0.6rem 0 0" }}>
        Publishers are inferred from scraped source cards; locality metadata may be incomplete.
      </p>
    </section>
  );
}
