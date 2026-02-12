import Link from "next/link";
import type { SourceArticle } from "@/lib/types";
import { prettyDate } from "@/lib/format";
import { outletSlug } from "@/lib/lookup";

function pickInitials(outlet: string) {
  const words = (outlet || "")
    .replace(/\.[a-z]{2,}$/i, "")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

export function BrokeTheNewsPanel({ sources }: { sources: SourceArticle[] }) {
  const withTime = sources
    .filter((s) => s.publishedAt && Number.isFinite(Date.parse(String(s.publishedAt))))
    .slice()
    .sort((a, b) => +new Date(String(a.publishedAt)) - +new Date(String(b.publishedAt)));

  const earliest = withTime[0];
  const top = withTime.slice(0, 5);

  if (!earliest) {
    return (
      <section className="panel">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Broke the news</h2>
          <span className="story-meta">Unavailable</span>
        </div>
        <p className="story-meta u-m0">
          We don’t have publish timestamps for the scraped coverage sample yet.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Broke the news</h2>
        <span className="story-meta">{prettyDate(String(earliest.publishedAt))}</span>
      </div>
      <ul className="topic-list u-gap-052">
        {top.map((src) => (
          <li key={src.id} className="topic-item">
            <span className="topic-avatar" aria-hidden="true">
              {src.logoUrl ? (
                <img
                  src={src.logoUrl}
                  alt={src.outlet}
                  className="u-avatar-24"
                />
              ) : (
                pickInitials(src.outlet)
              )}
            </span>
            <Link href={`/source/${encodeURIComponent(outletSlug(src.outlet))}`} className="u-no-underline">
              {src.outlet}
            </Link>
            <span className="story-meta">{src.publishedAt ? prettyDate(String(src.publishedAt)) : "—"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
