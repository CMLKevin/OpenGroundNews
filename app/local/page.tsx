import { StoryCard } from "@/components/StoryCard";
import { LocalFeedControls } from "@/components/LocalFeedControls";
import { listStories } from "@/lib/store";
import Link from "next/link";
import { outletSlug } from "@/lib/lookup";
import { WeatherWidget } from "@/components/WeatherWidget";
import { StoryListItem } from "@/components/StoryListItem";
import { LocalPublishersList } from "@/components/LocalPublishersList";

export const dynamic = "force-dynamic";

type LocalPageProps = {
  searchParams: Promise<{ location?: string; edition?: string; lat?: string; lon?: string }>;
};

export default async function LocalPage({ searchParams }: LocalPageProps) {
  const { location, edition } = await searchParams;
  const locationLabel = (location?.trim() || "United States").slice(0, 120);
  const stories = await listStories({
    view: "local",
    limit: 120,
    location: location?.trim() || undefined,
    edition: edition?.trim() || undefined,
  });

  const outletStats = Array.from(
    stories
      .flatMap((story) => story.sources)
      .reduce((acc, src) => {
        const slug = outletSlug(src.outlet);
        const existing = acc.get(slug) || { slug, outlet: src.outlet, count: 0, localCount: 0, logoUrl: src.logoUrl, biasRating: src.biasRating, bias: src.bias };
        existing.count += 1;
        if (src.locality === "local") existing.localCount += 1;
        existing.logoUrl = existing.logoUrl || src.logoUrl;
        existing.biasRating = existing.biasRating || src.biasRating;
        existing.bias = existing.bias || src.bias;
        acc.set(slug, existing);
        return acc;
      }, new Map<string, { slug: string; outlet: string; count: number; localCount: number; logoUrl?: string; biasRating?: string; bias?: string }>())
      .values(),
  )
    .sort((a, b) => b.localCount - a.localCount || b.count - a.count || a.outlet.localeCompare(b.outlet))
    .slice(0, 28);

  const featured = stories.slice(0, 3);
  const rest = stories.slice(3, 45);

  return (
    <main className="container" style={{ paddingTop: "1rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.7rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <span className="topic-avatar" aria-hidden="true">
              {(locationLabel || "Local").slice(0, 2).toUpperCase()}
            </span>
            <div style={{ display: "grid", gap: "0.15rem" }}>
              <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Top {locationLabel} News</h1>
              <span className="story-meta">
                {stories.length} stories • {outletStats.length} publishers
              </span>
            </div>
          </div>
          <Link className="btn" href="/my/manage">
            Change location
          </Link>
        </div>
        <p className="story-meta" style={{ margin: 0 }}>
          Local stories are filtered by your selected region/city and by local-marked stories from ingestion.
        </p>
      </section>

      <section className="topic-shell" style={{ marginTop: "1rem", paddingBottom: "2rem" }}>
        <div style={{ display: "grid", gap: "0.85rem" }}>
          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Top {locationLabel} News</h2>
              <span className="story-meta">Featured</span>
            </div>
            <div className="featured-grid">
              {featured.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Latest</h2>
              <span className="story-meta">{rest.length} shown</span>
            </div>
            <div className="news-list">
              {rest.map((story) => (
                <StoryListItem key={story.id} story={story} dense={true} showSummary={true} />
              ))}
            </div>
          </section>
        </div>

        <aside className="feed-rail sticky-rail">
          <WeatherWidget />

          <LocalPublishersList publishers={outletStats} />

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Discover stories in your city</h2>
              <span className="story-meta">Set location</span>
            </div>
            <p className="story-meta" style={{ margin: 0 }}>
              Pick a suggested location to enable the 7-day forecast and tune the Local feed.
            </p>
            <div style={{ marginTop: "0.65rem" }}>
              <LocalFeedControls />
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
