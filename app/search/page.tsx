import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import { SearchBox } from "@/components/SearchBox";
import { searchStories } from "@/lib/search";
import { SearchFilters } from "@/components/SearchFilters";
import { db } from "@/lib/db";
import { topicDisplayName } from "@/lib/topics";
import { topicSlug } from "@/lib/lookup";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; edition?: string; tab?: string; bias?: string; time?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q, edition, tab, bias, time } = await searchParams;
  const query = (q || "").trim();
  const activeTab = tab === "topics" || tab === "sources" || tab === "stories" ? tab : "stories";
  const biasFilter = bias === "left" || bias === "center" || bias === "right" || bias === "all" ? bias : "all";
  const timeFilter = time === "24h" || time === "7d" || time === "30d" || time === "all" ? time : "all";

  const result = await searchStories({
    q: query,
    edition: edition?.trim() || undefined,
    limit: 80,
    bias: biasFilter as any,
    time: timeFilter as any,
  });
  const shownArticleCount = result.stories.reduce((acc, s) => acc + (s.coverage?.totalSources ?? s.sourceCount ?? 0), 0);
  const discoveryStories = query
    ? []
    : await db.story
        .findMany({
          orderBy: { updatedAt: "desc" },
          include: { tags: true, sources: { include: { outlet: true } } },
          take: 6,
        })
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            topic: row.topic,
          })),
        )
        .catch(() => []);
  const discoveryTopics = query
    ? []
    : await db.storyTag
        .groupBy({
          by: ["tag"],
          _count: { tag: true },
          orderBy: { _count: { tag: "desc" } },
          take: 12,
        })
        .then((rows) => {
          const byTag = new Map<string, { tag: string; count: number }>();
          for (const row of rows) {
            const label = topicDisplayName(row.tag);
            const slug = topicSlug(label);
            const existing = byTag.get(slug);
            if (existing) {
              existing.count += row._count.tag;
            } else {
              byTag.set(slug, { tag: label, count: row._count.tag });
            }
          }
          return Array.from(byTag.values());
        })
        .catch(() => []);
  const outletProfiles =
    activeTab === "sources" && result.facets.outlets.length > 0
      ? await db.outlet
          .findMany({
            where: { slug: { in: result.facets.outlets.map((o) => o.slug) } },
            select: { slug: true, name: true, biasRating: true, bias: true, factuality: true, description: true },
          })
          .catch(() => [])
      : [];
  const outletBySlug = new Map(outletProfiles.map((outlet) => [outlet.slug, outlet]));

  function buildHref(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (edition) sp.set("edition", edition);
    if (biasFilter && biasFilter !== "all") sp.set("bias", biasFilter);
    if (timeFilter && timeFilter !== "all") sp.set("time", timeFilter);
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const s = sp.toString();
    return `/search${s ? `?${s}` : ""}`;
  }

  return (
    <main className="container u-page-pad">
      <SearchBox initialQuery={query} edition={edition?.trim() || undefined} bias={biasFilter} time={timeFilter} tab={activeTab} />

      <section className="panel u-mt-1 u-grid u-grid-gap-065">
          <div className="chip-row u-flex u-justify-between u-items-center">
          <div className="chip-row">
            <Link className={`pill ${activeTab === "stories" ? "perspective-btn is-active" : ""}`} href={buildHref({ tab: "stories" })}>
              Stories
            </Link>
            <Link className={`pill ${activeTab === "topics" ? "perspective-btn is-active" : ""}`} href={buildHref({ tab: "topics" })}>
              Topics
            </Link>
            <Link className={`pill ${activeTab === "sources" ? "perspective-btn is-active" : ""}`} href={buildHref({ tab: "sources" })}>
              Sources
            </Link>
          </div>
          <span className="story-meta">
            {query ? `${result.count} stories, ${shownArticleCount} articles` : "Discover trending stories and topics"}
          </span>
        </div>

        <SearchFilters
          query={query}
          edition={edition}
          activeTab={activeTab}
          timeFilter={timeFilter as "all" | "24h" | "7d" | "30d"}
          biasFilter={biasFilter as "all" | "left" | "center" | "right"}
        />
      </section>

      {query ? (
        <>
          {activeTab === "stories" ? (
            <>
              <section className="panel u-mt-1">
                <div className="section-title u-pt-0">
                  <h2 className="u-m0">Quick filters</h2>
                  <span className="story-meta">From results</span>
                </div>
                <div className="chip-row">
                  {result.facets.topics.map((t) => (
                    <Link key={t.slug} className="pill" href={`/interest/${t.slug}`}>
                      {t.label} ({t.count})
                    </Link>
                  ))}
                  {result.facets.outlets.map((o) => (
                    <Link key={o.slug} className="pill" href={`/source/${o.slug}`}>
                      {o.label} ({o.count})
                    </Link>
                  ))}
                </div>
              </section>
              <section className="grid u-mt-1">
                {result.stories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </section>
            </>
          ) : null}

          {activeTab === "topics" ? (
            <section className="panel u-mt-1">
              <div className="section-title u-pt-0">
                <h2 className="u-m0">Topics</h2>
                <span className="story-meta">Top matches</span>
              </div>
              {result.facets.topics.length ? (
                <div className="u-grid u-grid-gap-07">
                  {result.facets.topics.map((t) => {
                    const previewStories = result.stories.filter((story) => story.topic === t.label || story.tags.includes(t.label)).slice(0, 3);
                    return (
                      <article key={t.slug} className="panel u-p-075 u-grid u-grid-gap-05">
                        <div className="section-title u-pt-0">
                          <Link className="pill perspective-btn is-active" href={`/interest/${t.slug}`}>
                            {topicDisplayName(t.label)} ({t.count})
                          </Link>
                        </div>
                        <ul className="rail-list u-list-reset u-m0">
                          {previewStories.length > 0 ? (
                            previewStories.map((story) => (
                              <li key={story.id}>
                                <Link className="rail-link" href={`/story/${story.slug}`}>
                                  {story.title}
                                </Link>
                              </li>
                            ))
                          ) : (
                            <li className="story-meta">No story previews in current filters.</li>
                          )}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <span className="story-meta">No topic matches.</span>
              )}
            </section>
          ) : null}

          {activeTab === "sources" ? (
            <section className="panel u-mt-1">
              <div className="section-title u-pt-0">
                <h2 className="u-m0">Sources</h2>
                <span className="story-meta">Top matches</span>
              </div>
              {result.facets.outlets.length ? (
                <div className="u-grid u-grid-gap-07">
                  {result.facets.outlets.map((o) => {
                    const profile = outletBySlug.get(o.slug);
                    const bias = String(profile?.biasRating || profile?.bias || "unknown").replace(/_/g, "-");
                    const factuality = String(profile?.factuality || "unknown").replace(/_/g, "-");
                    return (
                      <article key={o.slug} className="panel u-p-075 u-grid u-grid-gap-035">
                        <div className="section-title u-pt-0">
                          <Link className="rail-link" href={`/source/${o.slug}`}>
                            {o.label}
                          </Link>
                          <span className="story-meta">{o.count} matches</span>
                        </div>
                        <div className="chip-row">
                          <span className="chip">Bias: {bias}</span>
                          <span className="chip">Factuality: {factuality}</span>
                        </div>
                        <p className="story-meta u-m0">
                          {profile?.description || "Outlet profile available on source page."}
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <span className="story-meta">No source matches.</span>
              )}
            </section>
          ) : null}
        </>
      ) : (
        <section className="panel u-mt-1 u-grid u-grid-gap-075">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Discover</h2>
            <span className="story-meta">Trending topics and recent stories</span>
          </div>
          <div className="chip-row">
            {discoveryTopics.map((topic) => (
              <Link key={topic.tag} className="pill" href={`/interest/${encodeURIComponent(topicSlug(topic.tag))}`}>
                {topic.tag} ({topic.count})
              </Link>
            ))}
          </div>
          <ul className="rail-list u-list-reset">
            {discoveryStories.map((story) => (
              <li key={story.id}>
                <Link className="rail-link" href={`/story/${story.slug}`}>
                  {story.title}
                </Link>
                <div className="story-meta">{topicDisplayName(story.topic)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
