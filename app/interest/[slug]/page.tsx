import Link from "next/link";
import type { Metadata } from "next";
import { StoryCard } from "@/components/StoryCard";
import { BiasBar } from "@/components/BiasBar";
import { FollowToggle } from "@/components/FollowToggle";
import { listStoriesByTopicSlug } from "@/lib/store";
import { prettyDate, slugify } from "@/lib/format";
import { topicSlug, outletSlug } from "@/lib/lookup";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
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
  const { edition } = await searchParams;
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

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.75rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <span className="topic-avatar" aria-hidden="true">
              {initials(displayTag)}
            </span>
            <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(1.6rem, 4vw, 2.3rem)" }}>
              {displayTag}
            </h1>
          </div>
          <FollowToggle kind="topic" slug={slugify(slug)} label={displayTag} variant="pill" />
        </div>
        <div className="story-meta">
          {stories.length} stories • Updated {prettyDate(lead.updatedAt)}
        </div>
        <p style={{ margin: 0, color: "var(--ink-soft)" }}>
          A topic hub showing coverage splits and the outlets contributing the most source cards.
        </p>
        <BiasBar story={{ ...lead, bias }} showLabels={true} />
      </section>

      <section className="topic-shell" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gap: "0.85rem" }}>
          <section className="grid">
            {stories.slice(0, 30).map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </section>
        </div>

        <aside className="feed-rail">
          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Covered Most By</h2>
              <span className="story-meta">Top {outletStats.length}</span>
            </div>
            <ul className="topic-list" style={{ gap: "0.52rem" }}>
              {outletStats.map((o) => (
                <li key={o.key} className="topic-item">
                  <span className="topic-avatar" aria-hidden="true">
                    {initials(o.outlet)}
                  </span>
                  <Link href={`/source/${o.key}`} style={{ textDecoration: "none" }}>
                    {o.outlet}
                  </Link>
                  <span className="story-meta">{o.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Media Bias Ratings</h2>
              <span className="story-meta">Source cards</span>
            </div>
            <div className="kpi-strip">
              <div className="kpi">
                <span>Left</span>
                <strong>{sourceCards.filter((s) => s.bias === "left").length}</strong>
              </div>
              <div className="kpi">
                <span>Center</span>
                <strong>{sourceCards.filter((s) => s.bias === "center").length}</strong>
              </div>
              <div className="kpi">
                <span>Right</span>
                <strong>{sourceCards.filter((s) => s.bias === "right").length}</strong>
              </div>
              <div className="kpi">
                <span>Untracked</span>
                <strong>{sourceCards.filter((s) => s.bias === "unknown").length}</strong>
              </div>
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
        </aside>
      </section>
    </main>
  );
}
