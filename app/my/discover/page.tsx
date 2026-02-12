import Link from "next/link";
import { db } from "@/lib/db";
import { FollowToggle } from "@/components/FollowToggle";
import { outletSlug } from "@/lib/lookup";

export const dynamic = "force-dynamic";

function initials(label: string) {
  const words = (label || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default async function MyDiscoverPage() {
  const tags = await db.storyTag
    .groupBy({
      by: ["tag"],
      _count: { tag: true },
      orderBy: [{ _count: { tag: "desc" } }],
      take: 36,
    })
    .catch(() => []);

  const outlets = await db.outlet
    .findMany({
      select: { slug: true, name: true, logoUrl: true, biasRating: true, factuality: true },
      orderBy: [{ sources: { _count: "desc" } }],
      take: 36,
    })
    .catch(() => []);

  return (
    <div className="topic-shell">
      <div className="u-grid u-grid-gap-085">
        <section className="panel">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Discover Topics</h2>
            <span className="story-meta">Trending tags</span>
          </div>
          {tags.length ? (
            <div className="chip-row">
              {tags.map((t) => (
                <Link key={t.tag} className="pill" href={`/interest/${encodeURIComponent(String(t.tag).toLowerCase().replace(/\s+/g, "-"))}`}>
                  {t.tag} ({t._count.tag})
                </Link>
              ))}
            </div>
          ) : (
            <p className="story-meta u-m0">
              No topic tags yet. Run ingestion to populate suggestions.
            </p>
          )}
        </section>

        <section className="panel">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Discover Sources</h2>
            <span className="story-meta">Most seen</span>
          </div>
          {outlets.length ? (
            <ul className="topic-list u-gap-052">
              {outlets.map((o) => (
                <li key={o.slug} className="topic-item">
                  <span className="topic-avatar" aria-hidden="true">
                    {o.logoUrl ? (
                      <img
                        src={String(o.logoUrl)}
                        alt={o.name}
                        className="u-avatar-24"
                      />
                    ) : (
                      initials(o.name)
                    )}
                  </span>
                  <Link href={`/source/${encodeURIComponent(o.slug)}`} className="u-no-underline">
                    {o.name}
                  </Link>
                  <FollowToggle kind="outlet" slug={outletSlug(o.name)} label={o.name} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="story-meta u-m0">
              No sources yet. Run ingestion to populate suggestions.
            </p>
          )}
        </section>
      </div>

      <aside className="feed-rail sticky-rail">
        <section className="panel">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Follow</h2>
            <span className="story-meta">Personalize your feed</span>
          </div>
          <p className="story-meta u-m0">
            Use follow buttons across topic and source pages. Your picks appear in My Feed and are used for alerts.
          </p>
          <div className="chip-row u-mt-065">
            <Link className="btn" href="/my">
              Go to My Feed
            </Link>
            <Link className="btn" href="/get-started">
              Onboarding wizard
            </Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
