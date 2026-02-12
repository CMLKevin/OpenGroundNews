import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import { BiasBar } from "@/components/BiasBar";
import { StoryImage } from "@/components/StoryImage";
import { TrendingStrip } from "@/components/TrendingStrip";
import { prettyDate, sourceCountLabel } from "@/lib/format";
import { getDashboardStats, listStories } from "@/lib/store";
import { getCurrentUser } from "@/lib/authStore";

type HomeProps = {
  searchParams: Promise<{ q?: string; edition?: string; view?: string; bias?: string; tag?: string; page?: string }>;
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
  const { q, edition, view, bias, tag, page } = await searchParams;
  const pageNumber = Math.max(1, Number(page || 1) || 1);
  const PAGE_SIZE = 24;

  const [stories, stats, currentUser] = await Promise.all([
    listStories({ view: "all", limit: 500, edition: edition?.trim() || undefined }),
    getDashboardStats(),
    getCurrentUser(),
  ]);
  const isAdmin = currentUser?.role === "admin";

  const query = (q ?? "").trim().toLowerCase();
  const normalizedView = (view ?? "all").trim().toLowerCase();
  const normalizedBias = (bias ?? "all").trim().toLowerCase();
  const normalizedTag = (tag ?? "").trim().toLowerCase();
  const filtered =
    query.length === 0
      ? stories
      : stories.filter((story) => {
          const haystack = `${story.title} ${story.summary} ${story.topic} ${story.tags.join(" ")} ${story.sources
            .map((s) => s.outlet)
            .join(" ")}`.toLowerCase();
          return haystack.includes(query);
        });
  const viewFiltered = filtered.filter((story) => {
    if (normalizedView === "blindspot") return story.blindspot;
    if (normalizedView === "local") return story.local;
    if (normalizedView === "trending") return story.trending;
    return true;
  });
  const biasFiltered = viewFiltered.filter((story) => {
    if (normalizedBias === "left") return story.bias.left > story.bias.center && story.bias.left > story.bias.right;
    if (normalizedBias === "center") return story.bias.center >= story.bias.left && story.bias.center >= story.bias.right;
    if (normalizedBias === "right") return story.bias.right > story.bias.center && story.bias.right > story.bias.left;
    return true;
  });
  const tagged = normalizedTag
    ? biasFiltered.filter((story) => story.tags.some((storyTag) => storyTag.toLowerCase().includes(normalizedTag)))
    : biasFiltered;

  const leadStory = pageNumber === 1 ? (tagged[0] ?? null) : null;
  const gridStart = 1 + (pageNumber - 1) * PAGE_SIZE;
  const gridStories = tagged.slice(gridStart, gridStart + PAGE_SIZE);
  const topStories = tagged.slice(0, 6);
  const blindspotStories = tagged.filter((s) => s.blindspot).slice(0, 6);
  const trendingTags = scoreTags(tagged);

  const paramsForPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (edition?.trim()) params.set("edition", edition.trim());
    if (view?.trim()) params.set("view", view.trim());
    if (bias?.trim()) params.set("bias", bias.trim());
    if (tag?.trim()) params.set("tag", tag.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    return params.toString() ? `?${params.toString()}` : "";
  };

  const hasMore = gridStart + gridStories.length < tagged.length;

  return (
    <main className="container">
      <TrendingStrip tags={trendingTags} />

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
            {isAdmin ? (
              <Link className="btn" href="/admin">
                Admin
              </Link>
            ) : null}
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
          Showing {tagged.length} result(s) for <strong>{q}</strong>
        </p>
      ) : null}

      <section className="feed-shell">
        <aside className="feed-rail">
          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2>Daily Briefing</h2>
              <span className="story-meta">Top 6</span>
            </div>
            <ol className="rail-list rail-list-rich">
              {topStories.map((story) => (
                <li key={story.id}>
                  <Link href={`/story/${story.slug}`} className="rail-rich-link">
                    <StoryImage
                      src={story.imageUrl}
                      alt={story.title}
                      width={86}
                      height={54}
                      className="rail-thumb"
                      unoptimized
                    />
                    <span>
                      <span className="rail-link">{story.title}</span>
                      <span className="story-meta">
                        {sourceCountLabel(story)} • {story.bias.left}% L • {story.bias.center}% C • {story.bias.right}% R
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2>Explore</h2>
            </div>
            <div className="chip-row">
              <Link className="pill" href="/local">
                Local
              </Link>
              <Link className="pill" href="/my">
                For You
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

        <div className="feed-main">
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h2 style={{ margin: 0 }}>Latest Stories</h2>
            <span className="story-meta">
              {tagged.length === 0 ? "0 stories" : `Showing ${Math.min(tagged.length, gridStart + gridStories.length)} of ${tagged.length}`}
            </span>
          </div>

          {tagged.length === 0 ? (
            <section className="panel" style={{ display: "grid", gap: "0.5rem" }}>
              <h3 style={{ margin: 0 }}>No stories match your current filters.</h3>
              <p className="story-meta" style={{ margin: 0 }}>
                Try clearing a filter, changing edition, or broadening your search query.
              </p>
              <Link className="btn" href={edition ? `/?edition=${encodeURIComponent(edition)}` : "/"}>
                Reset filters
              </Link>
            </section>
          ) : null}

          {leadStory ? (
            <article className="lead-story">
              <StoryImage
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
                  <span className="pill">{sourceCountLabel(leadStory)}</span>
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

          {hasMore ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Link className="btn" href={`/${paramsForPage(pageNumber + 1)}`}>
                Load more stories
              </Link>
            </div>
          ) : null}
        </div>

        <aside className="feed-rail">
          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2>Feed Filters</h2>
              <Link href={edition ? `/?edition=${encodeURIComponent(edition)}` : "/"} className="story-meta">
                Reset
              </Link>
            </div>
            <form action="/" method="get" className="filters-grid">
              {edition ? <input type="hidden" name="edition" value={edition} /> : null}
              {q ? <input type="hidden" name="q" value={q} /> : null}
              <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
                View
                <select className="select-control" name="view" defaultValue={normalizedView}>
                  <option value="all">All</option>
                  <option value="trending">Trending</option>
                  <option value="blindspot">Blindspot</option>
                  <option value="local">Local</option>
                </select>
              </label>
              <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
                Bias
                <select className="select-control" name="bias" defaultValue={normalizedBias}>
                  <option value="all">All</option>
                  <option value="left">Left-leaning coverage</option>
                  <option value="center">Center-leaning coverage</option>
                  <option value="right">Right-leaning coverage</option>
                </select>
              </label>
              <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
                Topic
                <input className="select-control" name="tag" defaultValue={tag ?? ""} placeholder="e.g. Israel-Gaza" />
              </label>
              <button className="btn reset-btn" type="submit">
                Apply
              </button>
            </form>
          </section>

          <section className="panel">
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
        </aside>
      </section>
    </main>
  );
}
