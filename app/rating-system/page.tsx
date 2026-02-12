import { BiasPlayground } from "@/components/BiasPlayground";

export default function RatingSystemPage() {
  return (
    <main className="container" style={{ padding: "1.1rem 0 2rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.75rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Rating System</h1>
          <span className="story-meta">Methodology</span>
        </div>
        <p style={{ margin: 0, maxWidth: "75ch" }}>
          OpenGroundNews organizes coverage into left/center/right buckets and presents a transparent distribution of
          sources for each story. Ratings are designed to be auditable: we store per-source metadata and compute story
          distributions from the source cards.
        </p>
        <div className="kpi-strip">
          <div className="kpi">
            <span>Bias buckets</span>
            <strong style={{ fontSize: "1rem" }}>Left / Center / Right</strong>
          </div>
          <div className="kpi">
            <span>Factuality</span>
            <strong style={{ fontSize: "1rem" }}>Very high .. very low</strong>
          </div>
          <div className="kpi">
            <span>Ownership</span>
            <strong style={{ fontSize: "1rem" }}>Publisher entity</strong>
          </div>
          <div className="kpi">
            <span>Untracked</span>
            <strong style={{ fontSize: "1rem" }}>Shown explicitly</strong>
          </div>
        </div>
        <p className="note" style={{ margin: 0 }}>
          Sources without reliable metadata are labeled <code>unknown</code>. We avoid guessing bias from domain names.
        </p>
      </section>

      <section className="panel" style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>How Bias Bars Work</h2>
        </div>
        <p className="story-meta" style={{ margin: 0 }}>
          Each story aggregates multiple source cards. The bar visualizes the percentage of tracked sources by bucket.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.35rem" }}>
          <li>
            <strong>Left / Center / Right</strong>: computed from tracked source cards
          </li>
          <li>
            <strong>Total sources</strong>: may exceed tracked cards when Ground News reports a larger coverage set
          </li>
          <li>
            <strong>Blindspot</strong>: flagged when coverage is heavily skewed to one side
          </li>
        </ul>
      </section>

      <div style={{ marginTop: "1rem" }}>
        <BiasPlayground />
      </div>
    </main>
  );
}
