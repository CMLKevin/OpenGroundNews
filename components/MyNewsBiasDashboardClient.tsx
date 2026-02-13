"use client";

import { useEffect, useMemo, useState } from "react";

type Bias = { left: number; center: number; right: number };

type Data = {
  ok: boolean;
  reads?: number;
  overall?: Bias;
  timeline?: Array<{ date: string; left: number; center: number; right: number }>;
  topOutlets?: Array<{ outlet: string; reads: number; bias: Bias }>;
  blindspot?: { likelyMissing: string; recommendation: string };
};

function scoreLabel(bias: Bias) {
  if (bias.left === 0 && bias.center === 0 && bias.right === 0) return "No data";
  if (bias.center >= bias.left && bias.center >= bias.right) return "Center-balanced";
  if (bias.left > bias.right) return "Left-heavy";
  return "Right-heavy";
}

export function MyNewsBiasDashboardClient() {
  const [days, setDays] = useState(90);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/me/news-bias?days=${encodeURIComponent(String(days))}`, { cache: "no-store" });
        const json = (await res.json()) as Data;
        if (alive) setData(json);
      } catch {
        if (alive) setData({ ok: false });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [days]);

  const overall = useMemo(() => data?.overall || { left: 0, center: 0, right: 0 }, [data]);

  return (
    <div className="u-grid u-grid-gap-1">
      <section className="panel u-grid u-grid-gap-06">
        <div className="section-title u-pt-0">
          <h1 className="u-m0">My News Bias</h1>
          <span className="story-meta">{loading ? "Loading..." : `${data?.reads || 0} reads analyzed`}</span>
        </div>

        <div className="chip-row">
          {[30, 90, 180, 365].map((value) => (
            <button
              key={value}
              className={`btn ${days === value ? "perspective-btn is-active" : ""}`}
              type="button"
              onClick={() => setDays(value)}
            >
              {value} days
            </button>
          ))}
        </div>

        <div className="bias-mini">
          <div className="bias-mini-bar" aria-label="Overall reading bias distribution">
            <div className="seg seg-left" style={{ width: `${overall.left}%` }} />
            <div className="seg seg-center" style={{ width: `${overall.center}%` }} />
            <div className="seg seg-right" style={{ width: `${overall.right}%` }} />
          </div>
          <div className="bias-mini-meta">
            <span className="bias-meta-left">{overall.left}% left</span>
            <span className="bias-meta-center">{overall.center}% center</span>
            <span className="bias-meta-right">{overall.right}% right</span>
          </div>
        </div>

        <div className="kpi-strip">
          <div className="kpi">
            <span>Overall profile</span>
            <strong>{scoreLabel(overall)}</strong>
          </div>
          <div className="kpi">
            <span>Blindspot risk</span>
            <strong>{data?.blindspot?.likelyMissing || "Unknown"}</strong>
          </div>
          <div className="kpi">
            <span>Recommendation</span>
            <strong className="u-text-095">{data?.blindspot?.recommendation || "Read more diverse outlets."}</strong>
          </div>
        </div>
      </section>

      <section className="panel u-grid u-grid-gap-06">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Bias Over Time</h2>
          <span className="story-meta">Daily trend</span>
        </div>

        <div className="u-grid u-grid-gap-04">
          {(data?.timeline || []).slice(-30).map((row) => (
            <div key={row.date} className="u-grid u-grid-gap-02">
              <div className="story-meta">{row.date}</div>
              <div className="bias-mini-bar">
                <span className="seg seg-left" style={{ width: `${row.left}%` }} />
                <span className="seg seg-center" style={{ width: `${row.center}%` }} />
                <span className="seg seg-right" style={{ width: `${row.right}%` }} />
              </div>
            </div>
          ))}
          {!(data?.timeline || []).length ? <p className="story-meta u-m0">No timeline data yet.</p> : null}
        </div>
      </section>

      <section className="panel u-grid u-grid-gap-06">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Most Read Outlets</h2>
          <span className="story-meta">Top 15</span>
        </div>

        <div className="source-list">
          {(data?.topOutlets || []).map((outlet) => (
            <article key={outlet.outlet} className="source-item">
              <div className="source-head">
                <strong>{outlet.outlet}</strong>
                <span className="story-meta">{outlet.reads} reads</span>
              </div>
              <div className="bias-mini-bar">
                <span className="seg seg-left" style={{ width: `${outlet.bias.left}%` }} />
                <span className="seg seg-center" style={{ width: `${outlet.bias.center}%` }} />
                <span className="seg seg-right" style={{ width: `${outlet.bias.right}%` }} />
              </div>
            </article>
          ))}
          {!(data?.topOutlets || []).length ? <p className="story-meta u-m0">No outlet reads captured yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
