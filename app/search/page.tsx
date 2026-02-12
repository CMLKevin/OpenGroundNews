import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import { searchStories } from "@/lib/search";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; edition?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q, edition } = await searchParams;
  const query = (q || "").trim();

  const result = await searchStories({ q: query, edition: edition?.trim() || undefined, limit: 80 });

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.6rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Search</h1>
          <span className="story-meta">{query ? `${result.count} matches` : "Type to search"}</span>
        </div>
        <form action="/search" method="get" className="searchbar">
          {edition ? <input type="hidden" name="edition" value={edition} /> : null}
          <input
            name="q"
            defaultValue={query}
            placeholder="Search stories, topics, outlets"
            className="input-control"
            type="search"
            aria-label="Search stories, topics, outlets"
          />
          <button className="btn" type="submit">
            Search
          </button>
        </form>
        {query ? (
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
        ) : (
          <p className="note" style={{ margin: 0 }}>
            Try searching for a person, topic, or outlet, for example: <code>tariffs</code>, <code>ukraine</code>,{" "}
            <code>fox</code>.
          </p>
        )}
      </section>

      {query ? (
        <section className="grid" style={{ marginTop: "1rem" }}>
          {result.stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </section>
      ) : null}
    </main>
  );
}

