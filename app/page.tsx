import Link from "next/link";
import { DailyBriefingList } from "@/components/DailyBriefingList";
import { HeroLeadStoryCard } from "@/components/HeroLeadStoryCard";
import { MyNewsBiasWidget } from "@/components/MyNewsBiasWidget";
import { DailyLocalNewsWidget } from "@/components/DailyLocalNewsWidget";
import { sourceCountLabel } from "@/lib/format";
import { listStories } from "@/lib/store";
import { getCurrentUser } from "@/lib/authStore";
import { NewsList } from "@/components/NewsList";
import { TopNewsStories } from "@/components/TopNewsStories";
import { BlindspotWidget } from "@/components/BlindspotWidget";
import { StoryCard } from "@/components/StoryCard";
import { outletSlug, topicSlug } from "@/lib/lookup";
import { db } from "@/lib/db";
import { topicDisplayName } from "@/lib/topics";
import { FollowToggle } from "@/components/FollowToggle";
import { NewsletterSignup } from "@/components/NewsletterSignup";

type HomeProps = {
  searchParams: Promise<{ q?: string; edition?: string; view?: string; bias?: string; tag?: string; page?: string }>;
};

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: HomeProps) {
  const { q, edition, view, bias, tag, page } = await searchParams;
  const pageNumber = Math.max(1, Number(page || 1) || 1);
  const PAGE_SIZE = 24;

  const [stories, currentUser] = await Promise.all([
    listStories({ view: "all", limit: 500, edition: edition?.trim() || undefined }),
    getCurrentUser(),
  ]);
  const followedTopics = currentUser
    ? await db.follow
        .findMany({
          where: { userId: currentUser.id, kind: "topic" },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
        .catch(() => [])
    : [];
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
  const topStories = tagged.slice(0, 6);
  const blindspotStories = tagged.filter((s) => s.blindspot).slice(0, 6);
  const heroListStories = leadStory ? tagged.slice(1, 1 + 10) : tagged.slice(0, 10);
  const heroRenderedSlugs = new Set([leadStory?.slug, ...heroListStories.map((s) => s.slug)].filter(Boolean) as string[]);
  const feedPool = tagged.filter((story) => !heroRenderedSlugs.has(story.slug));
  const gridStart = (pageNumber - 1) * PAGE_SIZE;
  const gridStories = feedPool.slice(gridStart, gridStart + PAGE_SIZE);
  const cardStories = gridStories.slice(0, 4);
  const listStoriesFeed = gridStories.slice(4);

  const exploreTopics = Array.from(
    tagged
      .flatMap((story) => story.tags || [])
      .reduce((acc, tag) => {
        const key = topicSlug(tag);
        acc.set(key, { key, label: tag, count: (acc.get(key)?.count || 0) + 1 });
        return acc;
      }, new Map<string, { key: string; label: string; count: number }>())
      .values(),
  )
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6);

  const exploreOutlets = Array.from(
    tagged
      .flatMap((story) => story.sources || [])
      .reduce((acc, source) => {
        const key = source.outlet.toLowerCase();
        acc.set(key, { key, label: source.outlet, count: (acc.get(key)?.count || 0) + 1 });
        return acc;
      }, new Map<string, { key: string; label: string; count: number }>())
      .values(),
  )
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6);

  const storiesByTopic = tagged.reduce((acc, story) => {
    const primary = topicSlug(story.topic);
    if (!acc.has(primary)) acc.set(primary, { slug: primary, label: topicDisplayName(story.topic), stories: [] as typeof tagged });
    const primaryBucket = acc.get(primary)!;
    if (!primaryBucket.stories.some((s) => s.slug === story.slug)) primaryBucket.stories.push(story);

    for (const tagValue of story.tags || []) {
      const slug = topicSlug(tagValue);
      if (!slug || slug === primary) continue;
      if (!acc.has(slug)) acc.set(slug, { slug, label: topicDisplayName(tagValue), stories: [] as typeof tagged });
      const bucket = acc.get(slug)!;
      if (!bucket.stories.some((s) => s.slug === story.slug)) bucket.stories.push(story);
    }
    return acc;
  }, new Map<string, { slug: string; label: string; stories: typeof tagged }>());

  const prioritizedTopics = followedTopics.map((f) => String(f.slug || "").toLowerCase()).filter(Boolean);
  const selectedTopicSlugs = [
    ...prioritizedTopics,
    ...Array.from(storiesByTopic.values())
      .sort((a, b) => b.stories.length - a.stories.length || a.label.localeCompare(b.label))
      .map((item) => item.slug),
  ]
    .filter((slug, idx, arr) => arr.indexOf(slug) === idx)
    .slice(0, 5);
  const topicSections = selectedTopicSlugs
    .map((slug) => storiesByTopic.get(slug))
    .filter(Boolean)
    .map((item) => ({
      slug: item!.slug,
      label: item!.label,
      stories: item!.stories.slice(0, 6),
    }))
    .filter((item) => item.stories.length >= 2);

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

  const hasMore = gridStart + gridStories.length < feedPool.length;

  return (
    <main className="container">
      <section className="panel home-promo-banner u-mt-1">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">See every side of every news story</h2>
          <Link className="btn" href="/get-started">
            Get Started
          </Link>
        </div>
      </section>

      <section className="home-hero-grid">
        <div className="home-hero-left">
          <DailyBriefingList stories={topStories} />
          <div className="u-mt-1">
            <TopNewsStories stories={tagged.slice(6, 18)} />
          </div>
        </div>

        <div className="home-hero-center">
          {leadStory ? <HeroLeadStoryCard story={leadStory} /> : null}
          {heroListStories.length ? <NewsList stories={heroListStories} dense={true} /> : null}
          {!leadStory ? (
            <section className="panel">
              <div className="section-title u-pt-0">
                <h1 className="u-m0 u-font-serif">Top story</h1>
              </div>
              <p className="story-meta u-m0">
                No stories available yet. Run ingestion from admin once your Browser Use key is configured.
              </p>
              {isAdmin ? (
                <Link className="btn u-mt-07 u-inline-flex" href="/admin">
                  Open admin
                </Link>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="home-hero-right">
          <MyNewsBiasWidget />
          <DailyLocalNewsWidget />
          <BlindspotWidget stories={blindspotStories} />
          <section className="panel">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Blindspot Report</h2>
              <span className="story-meta">Weekly newsletter</span>
            </div>
            <NewsletterSignup list="blindspot" />
          </section>
          <section className="panel">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Similar News Topics</h2>
            </div>
            <ul className="topic-list">
              {exploreTopics.slice(0, 8).map((topic) => (
                <li className="topic-item" key={`side-topic-${topic.key}`}>
                  <span className="topic-avatar">{topic.label.slice(0, 1).toUpperCase()}</span>
                  <Link href={`/interest/${encodeURIComponent(topic.key)}`} className="u-no-underline">
                    {topicDisplayName(topic.label)}
                  </Link>
                  <FollowToggle kind="topic" slug={topic.key} label={topic.label} />
                </li>
              ))}
            </ul>
          </section>
          <Link className="btn btn-external" href="/blindspot">
            View Blindspot Feed
          </Link>
        </aside>
      </section>

      {topicSections.length > 0 ? (
        <section className="u-grid u-grid-gap-085 u-mb-1">
          {topicSections.map((section) => (
            <section className="panel" key={`topic-section-${section.slug}`}>
              <div className="section-title u-pt-0">
                <h2 className="u-m0">{section.label} News</h2>
                <Link className="story-meta" href={`/interest/${encodeURIComponent(section.slug)}`}>
                  See all
                </Link>
              </div>
              <div className="grid">
                {section.stories.slice(0, 4).map((story) => (
                  <StoryCard key={`topic-section-story-${story.slug}`} story={story} />
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      {query ? (
        <p className="note u-mb-1">
          Showing {tagged.length} result(s) for <strong>{q}</strong>
        </p>
      ) : null}

      <section className="feed-shell">
        <aside className="feed-rail feed-rail-left">
          <section className="panel">
            <div className="section-title u-pt-0">
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
            </div>
            {exploreTopics.length > 0 ? (
              <>
                <div className="story-meta u-mt-06">
                  Popular topics
                </div>
                <div className="chip-row">
                  {exploreTopics.map((topic) => (
                    <Link key={topic.key} className="pill" href={`/interest/${encodeURIComponent(topic.key)}`}>
                      {topic.label}
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
            {exploreOutlets.length > 0 ? (
              <>
                <div className="story-meta u-mt-06">
                  Most covered outlets
                </div>
                <div className="chip-row">
                  {exploreOutlets.map((outlet) => (
                    <Link key={outlet.key} className="pill" href={`/source/${encodeURIComponent(outletSlug(outlet.label))}`}>
                      {outlet.label}
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </aside>

        <div className="feed-main">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Latest Stories</h2>
            <span className="story-meta">
              {tagged.length === 0
                ? "0 stories"
                : `Showing ${Math.min(feedPool.length, gridStart + gridStories.length)} of ${feedPool.length}`}
            </span>
          </div>

          {tagged.length === 0 ? (
            <section className="panel u-grid u-grid-gap-05">
              <h3 className="u-m0">No stories match your current filters.</h3>
              <p className="story-meta u-m0">
                Try clearing a filter, changing edition, or broadening your search query.
              </p>
              <Link className="btn" href={edition ? `/?edition=${encodeURIComponent(edition)}` : "/"}>
                Reset filters
              </Link>
            </section>
          ) : null}

          {/* Lead story is rendered in the homepage hero for parity; keep feed focused on the grid. */}

          {cardStories.length > 0 ? (
            <section className="grid">
              {cardStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </section>
          ) : null}
          <NewsList stories={listStoriesFeed} dense={true} />

          {hasMore ? (
            <div className="u-flex u-justify-center">
              <Link className="btn" href={`/${paramsForPage(pageNumber + 1)}`}>
                Load more stories
              </Link>
            </div>
          ) : null}
        </div>

        <aside className="feed-rail feed-rail-right">
          <section className="panel">
            <div className="section-title u-pt-0">
              <h2>Feed Filters</h2>
              <Link href={edition ? `/?edition=${encodeURIComponent(edition)}` : "/"} className="story-meta">
                Reset
              </Link>
            </div>
            <form action="/" method="get" className="filters-grid">
              {edition ? <input type="hidden" name="edition" value={edition} /> : null}
              {q ? <input type="hidden" name="q" value={q} /> : null}
              <label className="story-meta u-grid u-grid-gap-02">
                View
                <select className="select-control" name="view" defaultValue={normalizedView}>
                  <option value="all">All</option>
                  <option value="trending">Trending</option>
                  <option value="blindspot">Blindspot</option>
                  <option value="local">Local</option>
                </select>
              </label>
              <label className="story-meta u-grid u-grid-gap-02">
                Bias
                <select className="select-control" name="bias" defaultValue={normalizedBias}>
                  <option value="all">All</option>
                  <option value="left">Left-leaning coverage</option>
                  <option value="center">Center-leaning coverage</option>
                  <option value="right">Right-leaning coverage</option>
                </select>
              </label>
              <label className="story-meta u-grid u-grid-gap-02">
                Topic
                <input className="select-control" name="tag" defaultValue={tag ?? ""} placeholder="e.g. Israel-Gaza" />
              </label>
              <button className="btn reset-btn" type="submit">
                Apply
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="section-title u-pt-0">
              <h2>Blindspot Watch</h2>
              <Link href="/blindspot" className="story-meta">
                open
              </Link>
            </div>
            <ul className="rail-list u-list-reset">
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
