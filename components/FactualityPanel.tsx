import type { SourceArticle } from "@/lib/types";

type Bucket = "very-high" | "high" | "mixed" | "low" | "very-low" | "unknown";

const LABELS: Record<Bucket, string> = {
  "very-high": "Very High",
  high: "High",
  mixed: "Mixed",
  low: "Low",
  "very-low": "Very Low",
  unknown: "Unknown",
};

const CLASS_BY_BUCKET: Record<Bucket, string> = {
  "very-high": "fact-swatch fact-swatch-very-high",
  high: "fact-swatch fact-swatch-high",
  mixed: "fact-swatch fact-swatch-mixed",
  low: "fact-swatch fact-swatch-low",
  "very-low": "fact-swatch fact-swatch-very-low",
  unknown: "fact-swatch fact-swatch-unknown",
};

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.round((value / total) * 100));
}

export function FactualityPanel({ sources }: { sources: SourceArticle[] }) {
  const counts: Record<Bucket, number> = {
    "very-high": 0,
    high: 0,
    mixed: 0,
    low: 0,
    "very-low": 0,
    unknown: 0,
  };

  for (const src of sources || []) {
    const value = (src.factuality || "unknown") as Bucket;
    counts[value] = (counts[value] || 0) + 1;
  }

  const total = Object.values(counts).reduce((acc, value) => acc + value, 0);

  if (total === 0) {
    return (
      <section className="panel">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Factuality</h2>
          <span className="story-meta">Unavailable</span>
        </div>
        <p className="story-meta u-m0">Factuality ratings are not available for this story yet.</p>
      </section>
    );
  }

  const ordered: Bucket[] = ["very-high", "high", "mixed", "low", "very-low", "unknown"];

  return (
    <section className="panel">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Factuality</h2>
        <span className="story-meta">{total} sources</span>
      </div>

      <div className="fact-progress" aria-label="Factuality distribution">
        {ordered.map((bucket) => (
          <span
            key={bucket}
            className={CLASS_BY_BUCKET[bucket]}
            style={{ width: `${percent(counts[bucket], total)}%` }}
            title={`${LABELS[bucket]} ${percent(counts[bucket], total)}%`}
          />
        ))}
      </div>

      <ul className="topic-list">
        {ordered.map((bucket) => (
          <li key={bucket} className="topic-item">
            <span className={CLASS_BY_BUCKET[bucket]} aria-hidden="true" />
            <span>{LABELS[bucket]}</span>
            <span className="story-meta">{counts[bucket]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
