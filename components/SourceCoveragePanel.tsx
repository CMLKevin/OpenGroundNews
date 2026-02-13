"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { compactHost, prettyDate, prettyRelativeDate } from "@/lib/format";
import { SourceArticle } from "@/lib/types";
import { outletSlug } from "@/lib/lookup";
import { FollowToggle } from "@/components/FollowToggle";
import { OutletAvatar } from "@/components/OutletAvatar";

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

function biasToneClass(value?: string) {
  const clean = String(value || "").toLowerCase();
  if (clean.includes("far-left")) return "bias-tone-far-left";
  if (clean.includes("lean-left")) return "bias-tone-lean-left";
  if (clean === "left") return "bias-tone-left";
  if (clean === "center") return "bias-tone-center";
  if (clean.includes("lean-right")) return "bias-tone-lean-right";
  if (clean === "right") return "bias-tone-right";
  if (clean.includes("far-right")) return "bias-tone-far-right";
  return "bias-tone-unknown";
}

export function SourceCoveragePanel({ storySlug, sources, totalSourceCount }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [query, setQuery] = useState<string>("");
  const [biasFilter, setBiasFilter] = useState<string>("all");
  const [factFilter, setFactFilter] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");
  const [paywallFilter, setPaywallFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(20);

  useEffect(() => {
    // Reset pagination when filters/sort change so users don't land mid-list.
    setVisibleCount(20);
  }, [sortMode, biasFilter, factFilter, ownershipFilter, paywallFilter, query, sources]);

  const ownershipOptions = useMemo(
    () => Array.from(new Set(sources.map((s) => normalizeOwnership(s.ownership)))).sort((a, b) => a.localeCompare(b)),
    [sources],
  );

  const filtered = useMemo(() => {
    const base = sources.filter((s) => {
      const q = query.trim().toLowerCase();
      if (q) {
        const text = `${s.outlet} ${s.excerpt} ${s.url} ${s.locality || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
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
  }, [sources, sortMode, biasFilter, factFilter, ownershipFilter, paywallFilter, query]);

  const biasCounts = useMemo(() => {
    const left = sources.filter((s) => s.bias === "left").length;
    const center = sources.filter((s) => s.bias === "center").length;
    const right = sources.filter((s) => s.bias === "right").length;
    return { all: sources.length, left, center, right };
  }, [sources]);

  const paged = useMemo(() => filtered.slice(0, Math.max(1, visibleCount)), [filtered, visibleCount]);
  const totalArticles = Math.max(totalSourceCount ?? sources.length, sources.length);

  return (
    <section className="panel u-grid u-grid-gap-08">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">{totalArticles} Articles</h2>
        <span className="story-meta">
          {paged.length} shown / {filtered.length} filtered
        </span>
      </div>

      <div className="chip-row u-flex-gap-035">
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
        <label className="story-meta u-grid u-grid-gap-02">
          Search
          <input
            className="input-control"
            placeholder="Search source cards, outlets, or URL..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
          />
        </label>

        <label className="story-meta u-grid u-grid-gap-02">
          Sort
          <select className="select-control" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
            <option value="latest">Latest</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="bias">Bias</option>
            <option value="factuality">Factuality</option>
          </select>
        </label>

        <label className="story-meta u-grid u-grid-gap-02">
          Bias
          <select className="select-control" value={biasFilter} onChange={(e) => setBiasFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <label className="story-meta u-grid u-grid-gap-02">
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

        <label className="story-meta u-grid u-grid-gap-02">
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

        <label className="story-meta u-grid u-grid-gap-02">
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
            setQuery("");
          }}
        >
          Reset
        </button>
      </div>

      {(totalSourceCount ?? sources.length) > sources.length ? (
        <p className="note u-m0">
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
                  <OutletAvatar
                    outlet={src.outlet}
                    logoUrl={src.logoUrl}
                    sourceUrl={src.url}
                    websiteUrl={src.websiteUrl || ""}
                    className="source-logo"
                    fallbackClassName="source-logo source-logo-fallback"
                  />
                  <div className="u-grid u-grid-gap-008">
                    <strong>
                      <Link href={`/source/${outletSlug(src.outlet)}`} className="u-no-underline">
                        {src.outlet}
                      </Link>
                    </strong>
                    <span className="story-meta">
                      {src.publishedAt ? `${prettyRelativeDate(src.publishedAt)} (${prettyDate(src.publishedAt)}) • ` : ""}
                      {src.locality ?? "Locality unavailable"}
                    </span>
                  </div>
                </div>
                <div className="chip-row source-chip-row u-items-center">
                  <span className={`chip ${biasToneClass(src.biasRating || src.bias)}`}>
                    {src.bias === "unknown" ? "Unclassified" : String(src.biasRating || src.bias).replace(/-/g, " ")}
                  </span>
                  <span className="chip">{src.factuality === "unknown" ? "Not rated" : String(src.factuality).replace(/-/g, " ")}</span>
                  <FollowToggle kind="outlet" slug={outletSlug(src.outlet)} label={src.outlet} />
                </div>
              </div>
              <h3 className="u-m0 u-text-102">
                {src.headline || src.excerpt.split(/[.?!]/)[0] || "Coverage excerpt"}
              </h3>
              <p className="story-summary source-excerpt">{src.excerpt}</p>
              <div className="story-meta">
                Ownership: {normalizeOwnership(src.ownership)} • Paywall: {src.paywall ?? "unknown"}
                {typeof src.repostedBy === "number" && src.repostedBy > 0 ? ` • Reposted by ${src.repostedBy} other sources` : ""}
              </div>
              <div className="u-flex u-flex-gap-05 u-wrap">
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
