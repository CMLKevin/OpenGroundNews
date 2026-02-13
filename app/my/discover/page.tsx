import Link from "next/link";
import { db } from "@/lib/db";
import { FollowToggle } from "@/components/FollowToggle";
import { outletSlug, topicSlug } from "@/lib/lookup";
import { topicDisplayName } from "@/lib/topics";
import { getCurrentUser } from "@/lib/authStore";
import { OutletAvatar } from "@/components/OutletAvatar";

export const dynamic = "force-dynamic";

type DiscoverProps = {
  searchParams: Promise<{ q?: string }>;
};

function initials(label: string) {
  const words = (label || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words[0][0]?.toUpperCase() || "?";
}

export default async function MyDiscoverPage({ searchParams }: DiscoverProps) {
  const { q } = await searchParams;
  const query = (q || "").trim().toLowerCase();
  const user = await getCurrentUser();

  const [tags, outlets, follows] = await Promise.all([
    db.storyTag
      .groupBy({
        by: ["tag"],
        _count: { tag: true },
        orderBy: [{ _count: { tag: "desc" } }],
        take: 120,
      })
      .catch(() => []),
    db.outlet
      .findMany({
        select: { slug: true, name: true, logoUrl: true, websiteUrl: true, biasRating: true, factuality: true },
        orderBy: [{ sources: { _count: "desc" } }],
        take: 80,
      })
      .catch(() => []),
    user
      ? db.follow
          .findMany({
            where: { userId: user.id },
            select: { kind: true, slug: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const followedTopicSet = new Set(
    follows
      .filter((follow) => follow.kind === "topic")
      .map((follow) => String(follow.slug || "").toLowerCase()),
  );

  const topicCards = tags
    .map((tag) => ({
      slug: topicSlug(tag.tag),
      label: topicDisplayName(tag.tag),
      count: tag._count.tag,
      followed: followedTopicSet.has(topicSlug(tag.tag).toLowerCase()),
    }))
    .filter((topic) => !query || `${topic.label} ${topic.slug}`.toLowerCase().includes(query));

  const followedTopics = topicCards.filter((topic) => topic.followed).slice(0, 30);
  const favoriteTopics = topicCards.slice(0, 24);
  const allTopics = topicCards.slice(0, 72);

  const filteredOutlets = outlets
    .map((outlet) => ({
      ...outlet,
      slug: outlet.slug || outletSlug(outlet.name),
    }))
    .filter((outlet) => !query || `${outlet.name} ${outlet.slug}`.toLowerCase().includes(query))
    .slice(0, 30);

  return (
    <div className="topic-shell">
      <div className="u-grid u-grid-gap-085">
        <section className="panel u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Discover Interests</h2>
            <span className="story-meta">Search all interests</span>
          </div>
          <form action="/my/discover" method="get" className="searchwrap">
            <input
              className="input-control"
              type="search"
              name="q"
              defaultValue={q || ""}
              placeholder="Search all Interests"
              aria-label="Search all interests"
            />
            <button className="btn" type="submit">
              Search
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Topics You Follow</h2>
            <span className="story-meta">{followedTopics.length} topics</span>
          </div>
          {followedTopics.length > 0 ? (
            <div className="discover-topic-grid">
              {followedTopics.map((topic) => (
                <article key={`followed-${topic.slug}`} className="discover-topic-card">
                  <span className="discover-topic-icon">{initials(topic.label)}</span>
                  <div className="u-grid u-grid-gap-01">
                    <Link href={`/interest/${encodeURIComponent(topic.slug)}`} className="u-no-underline">
                      <strong>{topic.label}</strong>
                    </Link>
                    <span className="story-meta">{topic.count.toLocaleString()} stories</span>
                  </div>
                  <FollowToggle kind="topic" slug={topic.slug} label={topic.label} />
                </article>
              ))}
            </div>
          ) : (
            <p className="story-meta u-m0">Follow topics to personalize your feed. Use the + buttons below.</p>
          )}
        </section>

        <section className="panel">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Favorites</h2>
            <span className="story-meta">Most covered topics</span>
          </div>
          <div className="discover-topic-grid">
            {favoriteTopics.map((topic) => (
              <article key={`fav-${topic.slug}`} className="discover-topic-card">
                <span className="discover-topic-icon">{initials(topic.label)}</span>
                <div className="u-grid u-grid-gap-01">
                  <Link href={`/interest/${encodeURIComponent(topic.slug)}`} className="u-no-underline">
                    <strong>{topic.label}</strong>
                  </Link>
                  <span className="story-meta">{topic.count.toLocaleString()} stories</span>
                </div>
                <FollowToggle kind="topic" slug={topic.slug} label={topic.label} />
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">All Topics</h2>
            <span className="story-meta">{allTopics.length} shown</span>
          </div>
          <div className="discover-topic-grid">
            {allTopics.map((topic) => (
              <article key={`all-${topic.slug}`} className="discover-topic-card">
                <span className="discover-topic-icon">{initials(topic.label)}</span>
                <div className="u-grid u-grid-gap-01">
                  <Link href={`/interest/${encodeURIComponent(topic.slug)}`} className="u-no-underline">
                    <strong>{topic.label}</strong>
                  </Link>
                  <span className="story-meta">{topic.count.toLocaleString()} stories</span>
                </div>
                <FollowToggle kind="topic" slug={topic.slug} label={topic.label} />
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="feed-rail sticky-rail">
        <section className="panel">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Top Sources</h2>
            <span className="story-meta">Follow outlets</span>
          </div>
          <ul className="topic-list">
            {filteredOutlets.map((outlet) => (
              <li key={outlet.slug} className="topic-item">
                <span className="topic-avatar" aria-hidden="true">
                  <OutletAvatar
                    outlet={outlet.name}
                    logoUrl={String(outlet.logoUrl || "")}
                    websiteUrl={String(outlet.websiteUrl || "")}
                    className="u-avatar-24"
                  />
                </span>
                <Link href={`/source/${encodeURIComponent(outlet.slug)}`} className="u-no-underline">
                  {outlet.name}
                </Link>
                <FollowToggle kind="outlet" slug={outlet.slug} label={outlet.name} />
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Next</h2>
            <span className="story-meta">Personalize feed</span>
          </div>
          <div className="chip-row">
            <Link className="btn" href="/my">
              Open My Feed
            </Link>
            <Link className="btn" href="/my/manage">
              Manage Follows
            </Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
