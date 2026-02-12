import { StoryCard } from "@/components/StoryCard";
import { LocalFeedControls } from "@/components/LocalFeedControls";
import { listStories } from "@/lib/store";
import Link from "next/link";
import { outletSlug } from "@/lib/lookup";
import { WeatherWidget } from "@/components/WeatherWidget";

export const dynamic = "force-dynamic";

type LocalPageProps = {
  searchParams: Promise<{ location?: string; edition?: string }>;
};

export default async function LocalPage({ searchParams }: LocalPageProps) {
  const { location, edition } = await searchParams;
  const stories = await listStories({
    view: "local",
    limit: 24,
    location: location?.trim() || undefined,
    edition: edition?.trim() || undefined,
  });

  const outletStats = Array.from(
    stories
      .flatMap((story) => story.sources)
      .reduce((acc, src) => {
        const slug = outletSlug(src.outlet);
        const existing = acc.get(slug) || { slug, outlet: src.outlet, count: 0, localCount: 0 };
        existing.count += 1;
        if (src.locality === "local") existing.localCount += 1;
        acc.set(slug, existing);
        return acc;
      }, new Map<string, { slug: string; outlet: string; count: number; localCount: number }>())
      .values(),
  )
    .sort((a, b) => b.localCount - a.localCount || b.count - a.count || a.outlet.localeCompare(b.outlet))
    .slice(0, 16);

  return (
    <main className="container" style={{ paddingTop: "1rem" }}>
      <div className="section-title">
        <h2>Local Lens Feed</h2>
      </div>
      <LocalFeedControls />
      <p className="note">
        Local stories are filtered by your selected region/city and by local-marked stories from ingestion.
      </p>

      <section className="topic-shell" style={{ marginTop: "1rem", paddingBottom: "2rem" }}>
        <div style={{ display: "grid", gap: "0.85rem" }}>
          <section className="grid">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </section>
        </div>

        <aside className="feed-rail">
          <WeatherWidget />

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Local News Publishers</h2>
              <span className="story-meta">Top {outletStats.length}</span>
            </div>
            <ul className="topic-list" style={{ gap: "0.52rem" }}>
              {outletStats.map((o) => (
                <li key={o.slug} className="topic-item">
                  <span className="topic-avatar" aria-hidden="true">
                    {(o.outlet || "?").slice(0, 2).toUpperCase()}
                  </span>
                  <Link href={`/source/${o.slug}`} style={{ textDecoration: "none" }}>
                    {o.outlet}
                  </Link>
                  <span className="story-meta">{o.localCount ? `${o.localCount} local` : `${o.count} cards`}</span>
                </li>
              ))}
            </ul>
            <p className="story-meta" style={{ margin: "0.6rem 0 0" }}>
              Publishers are inferred from tracked source cards; locality metadata may be incomplete.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
