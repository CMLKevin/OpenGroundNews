"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { compactHost } from "@/lib/format";
import { SourceArticle } from "@/lib/types";

type Props = {
  storySlug: string;
  sources: SourceArticle[];
};

type SortMode = "latest" | "alphabetical" | "bias" | "factuality";

const factualityWeight: Record<string, number> = {
  "very-high": 5,
  high: 4,
  mixed: 3,
  low: 2,
  "very-low": 1,
  unknown: 0,
};

const biasWeight: Record<string, number> = {
  center: 3,
  left: 2,
  right: 1,
  unknown: 0,
};

export function SourceCoveragePanel({ storySlug, sources }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [biasFilter, setBiasFilter] = useState<string>("all");
  const [factFilter, setFactFilter] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");
  const [paywallFilter, setPaywallFilter] = useState<string>("all");

  const ownershipOptions = useMemo(
    () => Array.from(new Set(sources.map((s) => s.ownership || "Unlabeled"))).sort((a, b) => a.localeCompare(b)),
    [sources],
  );

  const filtered = useMemo(() => {
    const base = sources.filter((s) => {
      if (biasFilter !== "all" && s.bias !== biasFilter) return false;
      if (factFilter !== "all" && s.factuality !== factFilter) return false;
      if (ownershipFilter !== "all" && s.ownership !== ownershipFilter) return false;
      if (paywallFilter !== "all" && (s.paywall ?? "unknown") !== paywallFilter) return false;
      return true;
    });

    return base.sort((a, b) => {
      if (sortMode === "alphabetical") return a.outlet.localeCompare(b.outlet);
      if (sortMode === "bias") return (biasWeight[b.bias] ?? 0) - (biasWeight[a.bias] ?? 0);
      if (sortMode === "factuality") {
        return (factualityWeight[b.factuality] ?? 0) - (factualityWeight[a.factuality] ?? 0);
      }
      const timeA = a.publishedAt ? +new Date(a.publishedAt) : Number.NEGATIVE_INFINITY;
      const timeB = b.publishedAt ? +new Date(b.publishedAt) : Number.NEGATIVE_INFINITY;
      if (timeA === timeB) return a.outlet.localeCompare(b.outlet);
      return timeB - timeA;
    });
  }, [sources, sortMode, biasFilter, factFilter, ownershipFilter, paywallFilter]);

  return (
    <section className="panel" style={{ display: "grid", gap: "0.8rem", background: "#fff" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Full Coverage Sources</h2>
        <span className="story-meta">{filtered.length} shown / {sources.length} total</span>
      </div>

      <div className="filters-grid">
        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Sort
          <select className="select-control" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
            <option value="latest">Latest</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="bias">Bias</option>
            <option value="factuality">Factuality</option>
          </select>
        </label>

        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Bias
          <select className="select-control" value={biasFilter} onChange={(e) => setBiasFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Factuality
          <select className="select-control" value={factFilter} onChange={(e) => setFactFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="very-high">Very High</option>
            <option value="high">High</option>
            <option value="mixed">Mixed</option>
            <option value="low">Low</option>
            <option value="very-low">Very Low</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Ownership
          <select className="select-control" value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)}>
            <option value="all">All</option>
            {ownershipOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Paywall
          <select className="select-control" value={paywallFilter} onChange={(e) => setPaywallFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="none">No Paywall</option>
            <option value="soft">Soft Paywall</option>
            <option value="hard">Hard Paywall</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <button
          className="btn reset-btn"
          onClick={() => {
            setSortMode("latest");
            setBiasFilter("all");
            setFactFilter("all");
            setOwnershipFilter("all");
            setPaywallFilter("all");
          }}
        >
          Reset
        </button>
      </div>

      <div className="source-list">
        {filtered.map((src) => {
          const href = `/story/${storySlug}?source=${encodeURIComponent(src.url)}`;
          return (
            <article key={src.id} className="source-item">
              <div className="source-head">
                <strong>{src.outlet}</strong>
                <div className="chip-row">
                  <span className="chip">{src.bias}</span>
                  <span className="chip">{src.factuality}</span>
                </div>
              </div>
              <p className="story-summary">{src.excerpt}</p>
              <div className="story-meta">
                Ownership: {src.ownership || "Unlabeled"} • Paywall: {src.paywall ?? "unknown"}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link className="btn" href={href}>
                  Read in OpenGroundNews Reader
                </Link>
                <a className="btn" href={src.url} target="_blank" rel="noreferrer">
                  Open Original ({compactHost(src.url)})
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
