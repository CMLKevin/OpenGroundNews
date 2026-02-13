import type { SourceArticle } from "@/lib/types";

function initials(label: string) {
  const words = (label || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

export function OwnershipPanel({ sources }: { sources: SourceArticle[] }) {
  const counts = Array.from(
    (sources || [])
      .reduce((acc, source) => {
        const key = String(source.ownership || "").trim() || "Unlabeled";
        const current = acc.get(key) || { label: key, count: 0, outlets: new Set<string>() };
        current.count += 1;
        current.outlets.add(source.outlet);
        acc.set(key, current);
        return acc;
      }, new Map<string, { label: string; count: number; outlets: Set<string> }>())
      .values(),
  )
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 8);

  if (counts.length === 0) {
    return (
      <section className="panel">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Ownership</h2>
          <span className="story-meta">Unavailable</span>
        </div>
        <p className="story-meta u-m0">Ownership metadata is not available for this story yet.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Ownership</h2>
        <span className="story-meta">Top groups</span>
      </div>
      <ul className="topic-list">
        {counts.map((item) => (
          <li key={item.label} className="topic-item">
            <span className="topic-avatar" aria-hidden="true">{initials(item.label)}</span>
            <span>{item.label}</span>
            <span className="story-meta">{item.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
