import Link from "next/link";
import type { SourceArticle } from "@/lib/types";
import { prettyDate } from "@/lib/format";
import { outletSlug } from "@/lib/lookup";
import { OutletAvatar } from "@/components/OutletAvatar";

export function BrokeTheNewsPanel({ sources }: { sources: SourceArticle[] }) {
  const withTime = sources
    .filter((s) => s.publishedAt && Number.isFinite(Date.parse(String(s.publishedAt))))
    .slice()
    .sort((a, b) => +new Date(String(a.publishedAt)) - +new Date(String(b.publishedAt)));

  const earliest = withTime[0];
  const top = withTime.slice(0, 5);
  const localityCounts = (sources || []).reduce(
    (acc, source) => {
      const key = source.locality || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const dominantLocality = Object.entries(localityCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const localityNarrative =
    dominantLocality && dominantLocality !== "unknown"
      ? `Sources are mostly ${dominantLocality === "international" ? "international" : `out of ${dominantLocality}`}.`
      : "Source locality metadata is still being enriched.";

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
              <OutletAvatar
                outlet={src.outlet}
                logoUrl={src.logoUrl}
                sourceUrl={src.url}
                websiteUrl={src.websiteUrl || ""}
                className="u-avatar-24"
              />
            </span>
            <Link href={`/source/${encodeURIComponent(outletSlug(src.outlet))}`} className="u-no-underline">
              {src.outlet}
            </Link>
            <span className="story-meta">{src.publishedAt ? prettyDate(String(src.publishedAt)) : "—"}</span>
          </li>
        ))}
      </ul>
      <p className="story-meta u-m0">{localityNarrative}</p>
    </section>
  );
}
