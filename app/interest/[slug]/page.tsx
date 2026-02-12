import Link from "next/link";
import type { Metadata } from "next";
import { StoryCard } from "@/components/StoryCard";
import { BiasBar } from "@/components/BiasBar";
import { FollowToggle } from "@/components/FollowToggle";
import { BlindspotStoryCard } from "@/components/BlindspotStoryCard";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { StoryListItem } from "@/components/StoryListItem";
import { listStoriesByTopicSlug } from "@/lib/store";
import { prettyDate, slugify } from "@/lib/format";
import { topicSlug, outletSlug } from "@/lib/lookup";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string; page?: string }>;
};

function initials(label: string) {
  const words = (label || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function weightedBias(stories: Awaited<ReturnType<typeof listStoriesByTopicSlug>>) {
  let weight = 0;
  let left = 0;
  let center = 0;
  let right = 0;

  for (const story of stories) {
    const w = story.coverage?.totalSources ?? story.sourceCount ?? 0;
    if (!Number.isFinite(w) || w <= 0) continue;
    weight += w;
    left += (story.bias.left / 100) * w;
    center += (story.bias.center / 100) * w;
    right += (story.bias.right / 100) * w;
  }

  if (weight <= 0) return { left: 0, center: 0, right: 0 };

  const raw = {
    left: Math.round((left / weight) * 100),
    center: Math.round((center / weight) * 100),
    right: Math.round((right / weight) * 100),
  };
  const sum = raw.left + raw.center + raw.right;
  if (sum === 100) return raw;
  return {
    left: Math.max(0, Math.min(100, raw.left)),
    center: Math.max(0, Math.min(100, raw.center)),
    right: Math.max(0, Math.min(100, 100 - raw.left - raw.center)),
  };
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} • OpenGroundNews`,
    description: `Coverage and stories for topic: ${slug}.`,
  };
}

export default async function InterestPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { edition, page } = await searchParams;
  const pageNumber = Math.max(1, Number(page || 1) || 1);
  const PAGE_SIZE = 22;
  const stories = await listStoriesByTopicSlug(slug, { edition: edition?.trim() || undefined });

  if (stories.length === 0) {
    return (
      <main className="container" style={{ padding: "1rem 0 2rem" }}>
        <section className="panel" style={{ display: "grid", gap: "0.6rem" }}>
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>News about {slug}</h1>
            <span className="story-meta">No stories yet</span>
          </div>
          <p className="story-meta" style={{ margin: 0 }}>
            This topic hub is not populated yet for your current edition. Try switching editions or run ingestion again.
          </p>
          <div className="chip-row">
            <Link className="btn" href="/get-started">
              Get started
            </Link>
            <Link className="btn" href="/search">
              Search
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const displayTag =
    stories
      .flatMap((s) => s.tags)
      .find((tag) => topicSlug(tag).toLowerCase() === slug.toLowerCase()) || slug;

  const lead = stories[0];
  const bias = weightedBias(stories);
  const featured = stories.slice(0, 3);
  const blindspots = stories.filter((s) => s.blindspot).slice(0, 6);
  const listStart = 3;
  const offset = listStart + (pageNumber - 1) * PAGE_SIZE;
  const listStories = stories.slice(offset, offset + PAGE_SIZE);
  const hasMore = offset + listStories.length < stories.length;

  const outletStats = Array.from(
    stories
      .flatMap((story) => story.sources.map((src) => src.outlet))
      .reduce((acc, outlet) => {
        const key = outletSlug(outlet);
        const existing = acc.get(key) || { outlet, key, count: 0 };
        existing.count += 1;
        // Preserve the first (usually clean) display label.
        existing.outlet = existing.outlet || outlet;
        acc.set(key, existing);
        return acc;
      }, new Map<string, { outlet: string; key: string; count: number }>())
      .values(),
  )
    .sort((a, b) => b.count - a.count || a.outlet.localeCompare(b.outlet))
    .slice(0, 18);

  const outletMeta = outletStats.length
    ? await db.outlet
        .findMany({
          where: { slug: { in: outletStats.map((o) => o.key) } },
          select: { slug: true, name: true, logoUrl: true, bias: true, biasRating: true, factuality: true, ownership: true },
        })
        .catch(() => [])
    : [];
  const outletMetaBySlug = new Map(outletMeta.map((o) => [o.slug, o]));

  const sourceCards = stories.flatMap((s) => s.sources || []);
  const factualityCounts = {
    "very-high": sourceCards.filter((s) => s.factuality === "very-high").length,
    high: sourceCards.filter((s) => s.factuality === "high").length,
    mixed: sourceCards.filter((s) => s.factuality === "mixed").length,
    low: sourceCards.filter((s) => s.factuality === "low").length,
    "very-low": sourceCards.filter((s) => s.factuality === "very-low").length,
    unknown: sourceCards.filter((s) => s.factuality === "unknown").length,
  };

  const ownerCounts = Array.from(
    sourceCards
      .map((s) => (s.ownership || "Unlabeled").trim() || "Unlabeled")
      .reduce((acc, owner) => {
        acc.set(owner, (acc.get(owner) ?? 0) + 1);
        return acc;
      }, new Map<string, number>())
      .entries(),
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10);

  const relatedTopics = Array.from(
    stories
      .flatMap((s) => s.tags)
      .map((t) => t.trim())
      .filter(Boolean)
      .reduce((acc, tag) => {
        const key = topicSlug(tag).toLowerCase();
        if (key === slug.toLowerCase()) return acc;
        acc.set(tag, (acc.get(tag) ?? 0) + 1);
        return acc;
      }, new Map<string, number>())
      .entries(),
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12);

  const hrefFor = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (edition?.trim()) params.set("edition", edition.trim());
    if (pageNumber > 1) params.set("page", String(pageNumber));
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const s = params.toString();
    return `/interest/${encodeURIComponent(slug)}${s ? `?${s}` : ""}`;
  };

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.75rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <span className="topic-avatar" aria-hidden="true">
              {initials(displayTag)}
            </span>
            <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(1.6rem, 4vw, 2.3rem)" }}>
              News about {displayTag}
            </h1>
          </div>
          <FollowToggle kind="topic" slug={slugify(slug)} label={displayTag} variant="pill" />
        </div>
        <div className="story-meta">
          {stories.length} stories • Updated {prettyDate(lead.updatedAt)}
        </div>
        <p style={{ margin: 0, color: "var(--ink-soft)" }}>A topic hub showing coverage splits and the outlets contributing the most source cards.</p>
        <BiasBar story={{ ...lead, bias }} showLabels={true} />
      </section>

      <section className="topic-shell" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gap: "0.85rem" }}>
          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Top {displayTag} News</h2>
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
              <h2 style={{ margin: 0 }}>Blindspots</h2>
              <span className="story-meta">{blindspots.length ? "From this topic" : "No candidates"}</span>
            </div>
            {blindspots.length ? (
              <div className="blindspot-topic-grid">
                {blindspots.slice(0, 4).map((story) => (
                  <BlindspotStoryCard key={story.id} story={story} />
                ))}
              </div>
            ) : (
              <p className="story-meta" style={{ margin: 0 }}>
                No blindspot candidates in this topic sample yet.
              </p>
            )}
            <div style={{ marginTop: "0.75rem" }}>
              <div className="story-meta" style={{ marginBottom: "0.4rem" }}>
                Get the Blindspot Report
              </div>
              <NewsletterSignup list="blindspot" />
            </div>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Latest</h2>
              <span className="story-meta">
                Showing {offset + listStories.length} of {stories.length}
              </span>
            </div>
            <div className="news-list">
              {listStories.map((story) => (
                <StoryListItem key={story.id} story={story} dense={true} />
              ))}
            </div>
            {hasMore ? (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "0.85rem" }}>
                <Link className="btn" href={hrefFor({ page: String(pageNumber + 1) })}>
                  More stories
                </Link>
              </div>
            ) : null}
          </section>

          {relatedTopics.length ? (
            <section className="panel">
              <div className="section-title" style={{ paddingTop: 0 }}>
                <h2 style={{ margin: 0 }}>Breaking News Topics Related to {displayTag}</h2>
                <span className="story-meta">Explore</span>
              </div>
              <div className="related-topics-grid">
                {relatedTopics.map(([tag, count]) => (
                  <Link key={tag} className="related-topic" href={`/interest/${encodeURIComponent(slugify(tag))}`}>
                    <span className="related-topic-label">{tag}</span>
                    <span className="story-meta">{count}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="feed-rail sticky-rail">
          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Covered Most By</h2>
              <span className="story-meta">Top {outletStats.length}</span>
            </div>
            <ul className="topic-list" style={{ gap: "0.52rem" }}>
              {outletStats.map((o) => (
                <li key={o.key} className="topic-item">
                  <span className="topic-avatar" aria-hidden="true">
                    {outletMetaBySlug.get(o.key)?.logoUrl ? (
                      <img
                        src={String(outletMetaBySlug.get(o.key)?.logoUrl)}
                        alt={o.outlet}
                        style={{ width: 24, height: 24, borderRadius: 999, objectFit: "cover" }}
                      />
                    ) : (
                      initials(o.outlet)
                    )}
                  </span>
                  <Link href={`/source/${o.key}`} style={{ textDecoration: "none" }}>
                    {o.outlet}
                  </Link>
                  <span className="topic-item-right">
                    <span className="bias-pill">
                      {String(outletMetaBySlug.get(o.key)?.biasRating || outletMetaBySlug.get(o.key)?.bias || "unknown")
                        .replace(/_/g, "-")}
                    </span>
                    <span className="story-meta">{o.count}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Media Bias Breakdown</h2>
              <span className="story-meta">{sourceCards.length} source cards</span>
            </div>
            <div className="bias-breakdown" aria-label="Media bias breakdown">
              <div className="bias-breakdown-bar">
                <span className="seg seg-left" style={{ width: `${bias.left}%` }} />
                <span className="seg seg-center" style={{ width: `${bias.center}%` }} />
                <span className="seg seg-right" style={{ width: `${bias.right}%` }} />
              </div>
              <div className="bias-breakdown-meta">
                <span className="bias-meta-left">{bias.left}% Left</span>
                <span className="bias-meta-center">{bias.center}% Center</span>
                <span className="bias-meta-right">{bias.right}% Right</span>
              </div>
              <p className="story-meta" style={{ margin: 0 }}>
                Based on a weighted aggregation of coverage source counts for this topic sample.
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Factuality</h2>
              <span className="story-meta">Distribution</span>
            </div>
            <div className="kpi-strip">
              <div className="kpi">
                <span>Very high</span>
                <strong>{factualityCounts["very-high"]}</strong>
              </div>
              <div className="kpi">
                <span>High</span>
                <strong>{factualityCounts.high}</strong>
              </div>
              <div className="kpi">
                <span>Mixed</span>
                <strong>{factualityCounts.mixed}</strong>
              </div>
              <div className="kpi">
                <span>Low</span>
                <strong>{factualityCounts.low}</strong>
              </div>
              <div className="kpi">
                <span>Very low</span>
                <strong>{factualityCounts["very-low"]}</strong>
              </div>
              <div className="kpi">
                <span>Unknown</span>
                <strong>{factualityCounts.unknown}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Ownership</h2>
              <span className="story-meta">Top</span>
            </div>
            {ownerCounts.length > 0 ? (
              <ul className="topic-list">
                {ownerCounts.map(([owner, count]) => (
                  <li key={owner} className="topic-item">
                    <span className="topic-avatar" aria-hidden="true">
                      {initials(owner)}
                    </span>
                    <span style={{ textDecoration: "none" }}>{owner}</span>
                    <span className="story-meta">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="story-meta" style={{ margin: 0 }}>
                Ownership metadata unavailable for this topic sample.
              </p>
            )}
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Explore</h2>
            </div>
            <div className="chip-row">
              <Link className="pill" href="/">
                Back to Home
              </Link>
              <Link className="pill" href={`/search?q=${encodeURIComponent(displayTag)}`}>
                Search this topic
              </Link>
            </div>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Suggest a source</h2>
              <span className="story-meta">Help improve coverage</span>
            </div>
            <p className="story-meta" style={{ margin: 0 }}>
              Missing an outlet in this topic? Send us the site and why it matters.
            </p>
            <a className="btn" href="mailto:hello@opengroundnews.local?subject=Suggest%20a%20source">
              Email suggestion
            </a>
          </section>
        </aside>
      </section>
    </main>
  );
}
