"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

type CompareData = {
  ok: boolean;
  error?: string;
  compared?: { a: string; b: string };
  coverage?: {
    commonStories: number;
    sourceAOnly: number;
    sourceBOnly: number;
    overlapScore: number;
    biasA: { left: number; center: number; right: number };
    biasB: { left: number; center: number; right: number };
    topTopics?: Array<{ topic: string; sharedCount: number }>;
    sharedStories?: Array<{ slug: string; title: string; topic: string; publishedAt: string }>;
  };
};

const PRESET_PAIRS = [
  { a: "Reuters", b: "Associated Press" },
  { a: "CNN", b: "Fox News" },
  { a: "The New York Times", b: "Wall Street Journal" },
  { a: "BBC", b: "Al Jazeera" },
];

export function CompareClient() {
  const [a, setA] = useState("CNN");
  const [b, setB] = useState("Fox News");
  const [data, setData] = useState<CompareData | null>(null);
  const [outletSuggestions, setOutletSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/stories?limit=700", { cache: "no-store" });
        const json = (await res.json()) as { stories?: Array<{ sources?: Array<{ outlet: string }> }> };
        const outletCounts = new Map<string, number>();
        for (const story of json.stories || []) {
          for (const source of story.sources || []) {
            const outlet = String(source.outlet || "").trim();
            if (!outlet) continue;
            outletCounts.set(outlet, (outletCounts.get(outlet) || 0) + 1);
          }
        }
        const sorted = Array.from(outletCounts.entries())
          .sort((x, y) => y[1] - x[1])
          .slice(0, 200)
          .map(([name]) => name);
        if (alive) setOutletSuggestions(sorted);
      } catch {
        if (alive) setOutletSuggestions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function runCompare() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as CompareData;
      if (!res.ok || !json.ok) {
        setError(json.error || "Comparison failed");
      }
      setData(json);
    } catch {
      setError("Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  const overlapColor = useMemo(() => {
    const score = data?.coverage?.overlapScore || 0;
    if (score >= 65) return "var(--bias-center)";
    if (score >= 35) return "var(--bias-lean-right)";
    return "var(--bias-far-right)";
  }, [data?.coverage?.overlapScore]);

  return (
    <section className="panel u-grid u-grid-gap-06">
      <div className="section-title u-pt-0">
        <h1 className="u-m0">Compare Sources</h1>
        <span className="story-meta">Coverage overlap + bias profile</span>
      </div>

      <div className="filters-grid">
        <label className="story-meta u-grid u-grid-gap-02">
          Source A
          <input
            className="input-control"
            list="compare-outlet-suggestions"
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="e.g. CNN"
          />
        </label>
        <label className="story-meta u-grid u-grid-gap-02">
          Source B
          <input
            className="input-control"
            list="compare-outlet-suggestions"
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="e.g. Fox News"
          />
        </label>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setA(b);
            setB(a);
          }}
          disabled={loading}
        >
          Swap
        </button>
        <button className="btn" type="button" onClick={runCompare} disabled={loading || !a.trim() || !b.trim()}>
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>
      <datalist id="compare-outlet-suggestions">
        {outletSuggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="chip-row">
        {PRESET_PAIRS.map((pair) => (
          <button
            key={`${pair.a}-${pair.b}`}
            type="button"
            className="btn"
            onClick={() => {
              setA(pair.a);
              setB(pair.b);
              setData(null);
            }}
          >
            {pair.a} vs {pair.b}
          </button>
        ))}
      </div>

      {error ? <p className="note u-m0">{error}</p> : null}

      {data?.ok && data.coverage ? (
        <div className="kpi-strip">
          <div className="kpi">
            <span>Common stories</span>
            <strong>{data.coverage.commonStories}</strong>
          </div>
          <div className="kpi">
            <span>{data.compared?.a} only</span>
            <strong>{data.coverage.sourceAOnly}</strong>
          </div>
          <div className="kpi">
            <span>{data.compared?.b} only</span>
            <strong>{data.coverage.sourceBOnly}</strong>
          </div>
          <div className="kpi">
            <span>Overlap score</span>
            <strong>{data.coverage.overlapScore}%</strong>
          </div>
        </div>
      ) : null}

      {data?.ok && data.coverage ? (
        <section className="panel u-grid u-grid-gap-03">
          <div className="story-meta">Coverage overlap confidence</div>
          <div className="bias-mini-bar" aria-label="Overlap score">
            <span className="seg" style={{ width: `${Math.max(0, Math.min(100, data.coverage.overlapScore))}%`, background: overlapColor }} />
            <span className="seg" style={{ width: `${Math.max(0, 100 - Math.min(100, data.coverage.overlapScore))}%`, background: "var(--line-muted)" }} />
          </div>
          <div className="story-meta">
            Based on shared story incidence across the most recent sampled coverage.
          </div>
        </section>
      ) : null}

      {data?.ok && data.coverage ? (
        <div className="grid">
          <section className="panel u-grid u-grid-gap-035">
            <h2 className="u-m0">{data.compared?.a}</h2>
            <div className="bias-mini-bar">
              <span className="seg seg-left" style={{ width: `${data.coverage.biasA.left}%` }} />
              <span className="seg seg-center" style={{ width: `${data.coverage.biasA.center}%` }} />
              <span className="seg seg-right" style={{ width: `${data.coverage.biasA.right}%` }} />
            </div>
          </section>
          <section className="panel u-grid u-grid-gap-035">
            <h2 className="u-m0">{data.compared?.b}</h2>
            <div className="bias-mini-bar">
              <span className="seg seg-left" style={{ width: `${data.coverage.biasB.left}%` }} />
              <span className="seg seg-center" style={{ width: `${data.coverage.biasB.center}%` }} />
              <span className="seg seg-right" style={{ width: `${data.coverage.biasB.right}%` }} />
            </div>
          </section>
        </div>
      ) : null}

      {data?.ok && data.coverage?.topTopics?.length ? (
        <section className="panel u-grid u-grid-gap-04">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Shared Topic Concentration</h2>
            <span className="story-meta">Most commonly co-covered topics</span>
          </div>
          <div className="chip-row">
            {data.coverage.topTopics.map((topic) => (
              <span key={topic.topic} className="chip">
                {topic.topic} ({topic.sharedCount})
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {data?.ok && data.coverage?.sharedStories?.length ? (
        <section className="panel u-grid u-grid-gap-04">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Shared Story Sample</h2>
            <span className="story-meta">Recent overlaps</span>
          </div>
          <ul className="rail-list u-list-reset">
            {data.coverage.sharedStories.slice(0, 8).map((story) => (
              <li key={story.slug}>
                <Link className="rail-link" href={`/story/${encodeURIComponent(story.slug)}`}>
                  {story.title}
                </Link>
                <div className="story-meta">{story.topic}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
