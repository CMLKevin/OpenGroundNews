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
  const locationLabel = (location?.trim() || "").slice(0, 120);
  const hasSpecificLocation = Boolean(locationLabel);
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
    <main className="container u-pt-1">
      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <div className="u-flex u-flex-gap-06 u-items-center">
            <span className="topic-avatar" aria-hidden="true">
              {(locationLabel || "Local").slice(0, 2).toUpperCase()}
            </span>
            <div className="u-grid u-grid-gap-015">
              <h1 className="u-m0 u-font-serif">
                {hasSpecificLocation ? `Top ${locationLabel} News` : "Set Your Local Feed"}
              </h1>
              <span className="story-meta">
                {stories.length} stories • {outletStats.length} publishers
              </span>
            </div>
          </div>
          <Link className="btn" href="/my/manage">
            {hasSpecificLocation ? "Change location" : "Set location"}
          </Link>
        </div>
        <p className="story-meta u-m0">
          {hasSpecificLocation
            ? "Local stories are filtered by your selected region/city and by local-marked stories from ingestion."
            : "Choose your city first for truly local headlines and a weather forecast tailored to your area."}
        </p>
      </section>

      <section className="topic-shell u-mt-1 u-pb-2">
        <div className="u-grid u-grid-gap-085">
          <section className="panel">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">{hasSpecificLocation ? `Top ${locationLabel} News` : "Top Local News"}</h2>
              <span className="story-meta">Featured</span>
            </div>
            <div className="featured-grid">
              {featured.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Latest</h2>
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
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Discover stories in your city</h2>
              <span className="story-meta">Set location</span>
            </div>
            <p className="story-meta u-m0">
              Pick a suggested location to enable the 7-day forecast and tune the Local feed.
            </p>
            <div className="u-mt-065">
              <LocalFeedControls />
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
