import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import { SearchBox } from "@/components/SearchBox";
import { searchStories } from "@/lib/search";

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
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <SearchBox initialQuery={query} edition={edition?.trim() || undefined} bias={biasFilter} time={timeFilter} tab={activeTab} />

      <section className="panel" style={{ marginTop: "1rem", display: "grid", gap: "0.65rem" }}>
        <div className="chip-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
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
          <span className="story-meta">{query ? `${result.count} matches` : "Type to search"}</span>
        </div>

        <form action="/search" method="get" className="filters-grid">
          <input type="hidden" name="q" value={query} />
          {edition ? <input type="hidden" name="edition" value={edition} /> : null}
          <input type="hidden" name="tab" value={activeTab} />
          <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
            Time
            <select className="select-control" name="time" defaultValue={timeFilter}>
              <option value="all">All time</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </label>
          <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
            Bias (dominant)
            <select className="select-control" name="bias" defaultValue={biasFilter}>
              <option value="all">All</option>
              <option value="left">Leaning Left</option>
              <option value="center">Center</option>
              <option value="right">Leaning Right</option>
            </select>
          </label>
          <button className="btn" type="submit" style={{ alignSelf: "end" }}>
            Apply
          </button>
        </form>
      </section>

      {query ? (
        <>
          {activeTab === "stories" ? (
            <>
              <section className="panel" style={{ marginTop: "1rem" }}>
                <div className="section-title" style={{ paddingTop: 0 }}>
                  <h2 style={{ margin: 0 }}>Quick filters</h2>
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
              <section className="grid" style={{ marginTop: "1rem" }}>
                {result.stories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </section>
            </>
          ) : null}

          {activeTab === "topics" ? (
            <section className="panel" style={{ marginTop: "1rem" }}>
              <div className="section-title" style={{ paddingTop: 0 }}>
                <h2 style={{ margin: 0 }}>Topics</h2>
                <span className="story-meta">Top matches</span>
              </div>
              <div className="chip-row">
                {result.facets.topics.length ? (
                  result.facets.topics.map((t) => (
                    <Link key={t.slug} className="pill" href={`/interest/${t.slug}`}>
                      {t.label} ({t.count})
                    </Link>
                  ))
                ) : (
                  <span className="story-meta">No topic matches.</span>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "sources" ? (
            <section className="panel" style={{ marginTop: "1rem" }}>
              <div className="section-title" style={{ paddingTop: 0 }}>
                <h2 style={{ margin: 0 }}>Sources</h2>
                <span className="story-meta">Top matches</span>
              </div>
              <div className="chip-row">
                {result.facets.outlets.length ? (
                  result.facets.outlets.map((o) => (
                    <Link key={o.slug} className="pill" href={`/source/${o.slug}`}>
                      {o.label} ({o.count})
                    </Link>
                  ))
                ) : (
                  <span className="story-meta">No source matches.</span>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
