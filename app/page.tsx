import Image from "next/image";
import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import { BiasBar } from "@/components/BiasBar";
import { prettyDate } from "@/lib/format";
import { getDashboardStats, listStories } from "@/lib/store";

type HomeProps = {
  searchParams: Promise<{ q?: string; edition?: string }>;
};

export const dynamic = "force-dynamic";

function scoreTags(stories: Awaited<ReturnType<typeof listStories>>) {
  const counts = new Map<string, number>();
  for (const story of stories) {
    for (const tag of story.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag]) => tag);
}

export default async function HomePage({ searchParams }: HomeProps) {
  const { q, edition } = await searchParams;
  const [stories, stats] = await Promise.all([
    listStories({ view: "all", limit: 48, edition: edition?.trim() || undefined }),
    getDashboardStats(),
  ]);

  const query = (q ?? "").trim().toLowerCase();
  const filtered =
    query.length === 0
      ? stories
      : stories.filter((story) => {
          const haystack = `${story.title} ${story.summary} ${story.topic} ${story.tags.join(" ")} ${story.sources
            .map((s) => s.outlet)
            .join(" ")}`.toLowerCase();
          return haystack.includes(query);
        });

  const leadStory = filtered[0] ?? null;
  const gridStories = filtered.slice(1, 25);
  const topStories = filtered.slice(0, 6);
  const blindspotStories = filtered.filter((s) => s.blindspot).slice(0, 6);
  const trendingTags = scoreTags(filtered);

  return (
    <main className="container">
      <section className="trending-strip" aria-label="Trending topics">
        {trendingTags.map((tag) => (
          <span className="trending-item" key={tag}>
            {tag}
          </span>
        ))}
      </section>

      <section className="hero">
        <div className="hero-panel">
          <h1>Compare framing. Track bias. Read deeper.</h1>
          <p>
            OpenGroundNews is an open-source, perspective-aware news platform. It aggregates source coverage, computes
            left/center/right distributions, and provides archive-first reader mode with resilient fallback extraction.
          </p>
          <div className="chip-row" style={{ marginTop: "0.7rem" }}>
            <span className="chip">Remote CDP ingestion</span>
            <span className="chip">Blindspot tracking</span>
            <span className="chip">Source-level filters</span>
            <span className="chip">Archive-first reader</span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h2>Pipeline Snapshot</h2>
            <Link className="btn" href="/admin">
              Admin
            </Link>
          </div>
          <div className="kpi-strip">
            <div className="kpi">
              <span>Stories</span>
              <strong>{stats.storyCount}</strong>
            </div>
            <div className="kpi">
              <span>Source articles</span>
              <strong>{stats.sourceArticleCount}</strong>
            </div>
            <div className="kpi">
              <span>Unique outlets</span>
              <strong>{stats.uniqueOutletCount}</strong>
            </div>
            <div className="kpi">
              <span>Archive cache</span>
              <strong>{stats.archiveCacheCount}</strong>
            </div>
            <div className="kpi">
              <span>Last sync</span>
              <strong style={{ fontSize: "0.96rem" }}>{stats.ingestion.lastRunAt ? "Active" : "Pending"}</strong>
            </div>
          </div>
          <p className="note" style={{ marginTop: "0.7rem" }}>
            Sync with <code>npm run ingest:groundnews</code> every 5-10 minutes for freshness.
          </p>
        </div>
      </section>

      {query ? (
        <p className="note" style={{ marginBottom: "1rem" }}>
          Showing {filtered.length} result(s) for <strong>{q}</strong>
        </p>
      ) : null}

      <section className="feed-shell">
        <div className="feed-main">
          {leadStory ? (
            <article className="lead-story">
              <Image
                src={leadStory.imageUrl}
                alt={leadStory.title}
                width={1280}
                height={640}
                className="lead-image"
                unoptimized
              />
              <div className="lead-content">
                <div className="story-meta">
                  {leadStory.topic} • {leadStory.location} • Updated {prettyDate(leadStory.updatedAt)}
                </div>
                <h2 className="lead-title">
                  <Link href={`/story/${leadStory.slug}`}>{leadStory.title}</Link>
                </h2>
                <BiasBar story={leadStory} showLabels={true} />
                <p className="story-summary">{leadStory.summary}</p>
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  <span className="pill">{leadStory.sourceCount} sources</span>
                  {leadStory.blindspot ? <span className="pill">Blindspot candidate</span> : null}
                  {leadStory.trending ? <span className="pill">Trending</span> : null}
                </div>
              </div>
            </article>
          ) : null}

          <div className="grid">
            {gridStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>

        <aside className="feed-rail">
          <section className="panel" style={{ background: "#fff" }}>
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2>Daily Briefing</h2>
              <span className="story-meta">Top 6</span>
            </div>
            <ol className="rail-list">
              {topStories.map((story) => (
                <li key={story.id}>
                  <Link href={`/story/${story.slug}`} className="rail-link">
                    {story.title}
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="panel" style={{ background: "#fff" }}>
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2>Blindspot Watch</h2>
              <Link href="/blindspot" className="story-meta">
                open
              </Link>
            </div>
            <ul className="rail-list" style={{ listStyle: "none", paddingLeft: 0 }}>
              {blindspotStories.map((story) => (
                <li key={story.id}>
                  <Link href={`/story/${story.slug}`} className="rail-link">
                    {story.title}
                  </Link>
                  <div className="story-meta">{story.bias.left}% L • {story.bias.center}% C • {story.bias.right}% R</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2>Explore</h2>
            </div>
            <div className="chip-row">
              <Link className="pill" href="/local">
                Local
              </Link>
              <Link className="pill" href="/blindspot">
                Blindspot
              </Link>
              <Link className="pill" href="/rating-system">
                Rating system
              </Link>
              <Link className="pill" href="/subscribe">
                Support
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
