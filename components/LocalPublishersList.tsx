"use client";

import Link from "next/link";
import { useState } from "react";
import { OutletAvatar } from "@/components/OutletAvatar";

type Publisher = {
  slug: string;
  outlet: string;
  logoUrl?: string | null;
  biasRating?: string | null;
  bias?: string | null;
  count: number;
  localCount: number;
};

export function LocalPublishersList({ publishers }: { publishers: Publisher[] }) {
  const [open, setOpen] = useState(false);

  const visible = open ? publishers : publishers.slice(0, 8);
  const remaining = Math.max(0, publishers.length - visible.length);

  return (
    <section className="panel">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Local News Publishers</h2>
        <button className="btn" type="button" onClick={() => setOpen(!open)} disabled={publishers.length <= 8}>
          {open ? "Show less" : remaining ? `Show all (${publishers.length})` : "All"}
        </button>
      </div>
      <ul className="topic-list u-gap-052">
        {visible.map((o) => (
          <li key={o.slug} className="topic-item">
            <span className="topic-avatar" aria-hidden="true">
              <OutletAvatar
                outlet={o.outlet}
                logoUrl={o.logoUrl || ""}
                className="u-avatar-24"
              />
            </span>
            <Link href={`/source/${encodeURIComponent(o.slug)}`} className="u-no-underline">
              {o.outlet}
            </Link>
            <span className="topic-item-right">
              <span className={`bias-pill ${String(o.biasRating || o.bias || "unknown").includes("left") ? "bias-tone-left" : String(o.biasRating || o.bias || "unknown").includes("right") ? "bias-tone-right" : String(o.biasRating || o.bias || "unknown").includes("center") ? "bias-tone-center" : "bias-tone-unknown"}`}>
                {String(o.biasRating || o.bias || "unknown").replace(/_/g, "-") === "unknown"
                  ? "Untracked bias"
                  : String(o.biasRating || o.bias || "unknown").replace(/_/g, "-")}
              </span>
              <span className="story-meta">{o.localCount ? `${o.localCount} local` : `${o.count}`}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="story-meta u-mt-06">
        Publishers are inferred from scraped source cards; locality metadata may be incomplete.
      </p>
    </section>
  );
}
