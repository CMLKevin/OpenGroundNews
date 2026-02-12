"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { compactHost, prettyDate } from "@/lib/format";
import { SourceArticle } from "@/lib/types";
import { outletSlug } from "@/lib/lookup";
import { FollowToggle } from "@/components/FollowToggle";

type Props = {
  storySlug: string;
  sources: SourceArticle[];
  totalSourceCount?: number;
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

function normalizeOwnership(value?: string) {
  const clean = (value || "").trim();
  return clean || "Unlabeled";
}

export function SourceCoveragePanel({ storySlug, sources, totalSourceCount }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [biasFilter, setBiasFilter] = useState<string>("all");
  const [factFilter, setFactFilter] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");
  const [paywallFilter, setPaywallFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(20);

  useEffect(() => {
    // Reset pagination when filters/sort change so users don't land mid-list.
    setVisibleCount(20);
  }, [sortMode, biasFilter, factFilter, ownershipFilter, paywallFilter, sources]);

  const ownershipOptions = useMemo(
    () => Array.from(new Set(sources.map((s) => normalizeOwnership(s.ownership)))).sort((a, b) => a.localeCompare(b)),
    [sources],
  );

  const filtered = useMemo(() => {
    const base = sources.filter((s) => {
      if (biasFilter !== "all" && s.bias !== biasFilter) return false;
      if (factFilter !== "all" && s.factuality !== factFilter) return false;
      if (ownershipFilter !== "all" && normalizeOwnership(s.ownership) !== ownershipFilter) return false;
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

  const biasCounts = useMemo(() => {
    const left = sources.filter((s) => s.bias === "left").length;
    const center = sources.filter((s) => s.bias === "center").length;
    const right = sources.filter((s) => s.bias === "right").length;
    return { all: sources.length, left, center, right };
  }, [sources]);

  const paged = useMemo(() => filtered.slice(0, Math.max(1, visibleCount)), [filtered, visibleCount]);

  return (
    <section className="panel" style={{ display: "grid", gap: "0.8rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Full Coverage Sources</h2>
        <span className="story-meta">
          {paged.length} shown / {filtered.length} filtered / {Math.max(totalSourceCount ?? sources.length, sources.length)} total
        </span>
      </div>

      <div className="chip-row" style={{ gap: "0.35rem" }}>
        <button className={`btn ${biasFilter === "all" ? "perspective-btn is-active" : ""}`} onClick={() => setBiasFilter("all")}>
          All {biasCounts.all}
        </button>
        <button className={`btn ${biasFilter === "left" ? "perspective-btn is-active" : ""}`} onClick={() => setBiasFilter("left")}>
          Left {biasCounts.left}
        </button>
        <button className={`btn ${biasFilter === "center" ? "perspective-btn is-active" : ""}`} onClick={() => setBiasFilter("center")}>
          Center {biasCounts.center}
        </button>
        <button className={`btn ${biasFilter === "right" ? "perspective-btn is-active" : ""}`} onClick={() => setBiasFilter("right")}>
          Right {biasCounts.right}
        </button>
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

      {(totalSourceCount ?? sources.length) > sources.length ? (
        <p className="note" style={{ margin: 0 }}>
          Showing a scraped sample of {sources.length} source cards out of {(totalSourceCount ?? sources.length)} total
          coverage sources.
        </p>
      ) : null}

      <div className="source-list">
        {paged.map((src) => {
          const href = `/story/${storySlug}?source=${encodeURIComponent(src.url)}`;
          return (
            <article key={src.id} className="source-item">
              <div className="source-head">
                <div className="source-outlet">
                  {src.logoUrl ? <img src={src.logoUrl} alt={src.outlet} className="source-logo" /> : <span className="source-logo source-logo-fallback">{src.outlet.slice(0, 2).toUpperCase()}</span>}
                  <div style={{ display: "grid", gap: "0.08rem" }}>
                    <strong>
                      <Link href={`/source/${outletSlug(src.outlet)}`} style={{ textDecoration: "none" }}>
                        {src.outlet}
                      </Link>
                    </strong>
                    <span className="story-meta">
                      {src.publishedAt ? `${prettyDate(src.publishedAt)} • ` : ""}
                      {src.locality ?? "Locality unavailable"}
                    </span>
                  </div>
                </div>
                <div className="chip-row source-chip-row" style={{ alignItems: "center" }}>
                  <span className="chip">{src.bias === "unknown" ? "Unclassified" : src.bias}</span>
                  <span className="chip">{src.factuality === "unknown" ? "Not rated" : src.factuality}</span>
                  <FollowToggle kind="outlet" slug={outletSlug(src.outlet)} label={src.outlet} />
                </div>
              </div>
              <p className="story-summary source-excerpt">{src.excerpt}</p>
              <div className="story-meta">
                Ownership: {normalizeOwnership(src.ownership)} • Paywall: {src.paywall ?? "unknown"}
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

      {paged.length < filtered.length ? (
        <button className="btn" onClick={() => setVisibleCount((n) => Math.min(filtered.length, n + 20))}>
          Show more ({Math.max(0, filtered.length - paged.length)} remaining)
        </button>
      ) : null}
    </section>
  );
}
