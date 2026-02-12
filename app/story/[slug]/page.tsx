import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BiasBar } from "@/components/BiasBar";
import { BiasDistributionPanel } from "@/components/BiasDistributionPanel";
import { KeyPointsPanel } from "@/components/KeyPointsPanel";
import { PerspectiveTabs } from "@/components/PerspectiveTabs";
import { ReaderDrawer } from "@/components/ReaderDrawer";
import { ShareBar } from "@/components/ShareBar";
import { TimelinePanel } from "@/components/TimelinePanel";
import { SimilarTopicsPanel } from "@/components/SimilarTopicsPanel";
import { SourceCoveragePanel } from "@/components/SourceCoveragePanel";
import { StoryImage } from "@/components/StoryImage";
import { prettyDate, slugify, sourceCountLabel } from "@/lib/format";
import { readArchiveForUrl } from "@/lib/archive";
import { getStoryBySlug, listStories } from "@/lib/store";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return { title: "Story not found • OpenGroundNews" };

  const description = (story.dek || story.summary || "").slice(0, 240);
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
  const url = `${site.replace(/\/$/, "")}/story/${encodeURIComponent(story.slug)}`;

  return {
    title: `${story.title} • OpenGroundNews`,
    description,
    openGraph: {
      title: story.title,
      description,
      url,
      images: story.imageUrl ? [{ url: story.imageUrl }] : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description,
      images: story.imageUrl ? [story.imageUrl] : undefined,
    },
  };
}

export default async function StoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { source } = await searchParams;

  const story = await getStoryBySlug(slug);
  if (!story) return notFound();

  const displayTotalSources = story.coverage?.totalSources ?? story.sourceCount;
  let coverageLeft = story.coverage?.leaningLeft;
  let coverageCenter = story.coverage?.center;
  let coverageRight = story.coverage?.leaningRight;
  if (
    (coverageLeft == null || coverageCenter == null || coverageRight == null) &&
    Number.isFinite(displayTotalSources) &&
    displayTotalSources > 0
  ) {
    const rawLeft = Math.round((story.bias.left / 100) * displayTotalSources);
    const rawCenter = Math.round((story.bias.center / 100) * displayTotalSources);
    const rawRight = Math.round((story.bias.right / 100) * displayTotalSources);
    const sum = rawLeft + rawCenter + rawRight;
    const diff = Math.round(displayTotalSources - sum);
    const buckets: Array<{ key: "left" | "center" | "right"; pct: number; value: number }> = [
      { key: "left" as const, pct: story.bias.left, value: rawLeft },
      { key: "center" as const, pct: story.bias.center, value: rawCenter },
      { key: "right" as const, pct: story.bias.right, value: rawRight },
    ];
    buckets.sort((a, b) => b.pct - a.pct);

    const adjustKey: "left" | "center" | "right" = buckets[0]?.key ?? "center";
    const adjusted: Record<"left" | "center" | "right", number> = { left: rawLeft, center: rawCenter, right: rawRight };
    adjusted[adjustKey] = Math.max(0, adjusted[adjustKey] + diff);
    coverageLeft = adjusted.left;
    coverageCenter = adjusted.center;
    coverageRight = adjusted.right;
  } else {
    coverageLeft = coverageLeft ?? 0;
    coverageCenter = coverageCenter ?? 0;
    coverageRight = coverageRight ?? 0;
  }
  const dailyBriefing = (await listStories({ view: "all", limit: 8 })).filter((item) => item.slug !== story.slug).slice(0, 6);
  const reader = source ? await readArchiveForUrl(source) : null;
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
  const shareUrl = `${site.replace(/\/$/, "")}/story/${encodeURIComponent(story.slug)}`;

  return (
    <main className="container">
      <section className="story-shell">
        <article className="panel" style={{ display: "grid", gap: "0.85rem" }}>
          <div className="story-meta">
            {story.topic} • {story.location} • Published {prettyDate(story.publishedAt)} • Updated {prettyDate(story.updatedAt)}
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(1.7rem, 4vw, 2.5rem)", lineHeight: 1.08 }}>
            {story.title}
          </h1>
          {story.dek ? <p className="story-summary" style={{ fontSize: "1.02rem", fontWeight: 600 }}>{story.dek}</p> : null}
          {story.author ? <div className="story-meta">By {story.author}</div> : null}
          <StoryImage
            src={story.imageUrl}
            alt={story.title}
            width={1200}
            height={640}
            className="lead-image"
            unoptimized
          />
          <BiasBar story={story} showLabels={true} />
          <div className="story-stat-row">
            <span className="story-stat-pill">{sourceCountLabel(story)}</span>
            <span className="story-stat-pill">{story.bias.left}% left</span>
            <span className="story-stat-pill">{story.bias.center}% center</span>
            <span className="story-stat-pill">{story.bias.right}% right</span>
            {story.blindspot ? <span className="story-stat-pill">Blindspot candidate</span> : null}
            {story.trending ? <span className="story-stat-pill">Trending</span> : null}
            {story.local ? <span className="story-stat-pill">Local perspective</span> : null}
            {story.canonicalUrl ? (
              <a className="story-stat-pill" href={story.canonicalUrl} target="_blank" rel="noreferrer">
                View on Ground News
              </a>
            ) : null}
          </div>
          <p className="story-summary" style={{ fontSize: "0.98rem" }}>
            {story.summary}
          </p>

          <KeyPointsPanel story={story} />

          <ShareBar title={story.title} url={shareUrl} />

          <section className="panel" style={{ background: "var(--bg-panel)", display: "grid", gap: "0.45rem" }}>
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Coverage Snapshot</h2>
            </div>
            <div className="kpi-strip">
              <div className="kpi">
                <span>Left share</span>
                <strong>{story.bias.left}%</strong>
              </div>
              <div className="kpi">
                <span>Center share</span>
                <strong>{story.bias.center}%</strong>
              </div>
              <div className="kpi">
                <span>Right share</span>
                <strong>{story.bias.right}%</strong>
              </div>
              <div className="kpi">
                <span>Total sources</span>
                <strong>{displayTotalSources}</strong>
              </div>
            </div>
          </section>

          <BiasDistributionPanel story={story} />

          <PerspectiveTabs story={story} />

          <TimelinePanel story={story} />

          {story.podcastReferences?.length ? (
            <section className="panel" style={{ background: "var(--bg-panel)", display: "grid", gap: "0.5rem" }}>
              <div className="section-title" style={{ paddingTop: 0 }}>
                <h2 style={{ margin: 0 }}>Podcasts & Opinions</h2>
              </div>
              <ul className="perspective-list">
                {story.podcastReferences.slice(0, 6).map((entry, idx) => {
                  const match = String(entry || "").match(/https?:\/\/[^\s)]+/i);
                  const url = match?.[0] ?? "";
                  const label = String(entry || "").replace(url, "").trim() || entry;
                  return (
                    <li key={`${story.id}-pod-${idx}`}>
                      {label}{" "}
                      {url ? (
                        <a className="btn" href={url} target="_blank" rel="noreferrer" style={{ marginLeft: "0.4rem" }}>
                          Open link
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="panel" style={{ background: "var(--bg-panel)" }}>
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Related Topics</h2>
            </div>
            <div className="chip-row">
              {story.tags.map((tag) => (
                <Link className="chip" key={tag} href={`/interest/${slugify(tag)}`}>
                  {tag}
                </Link>
              ))}
            </div>
          </section>

          <SourceCoveragePanel storySlug={story.slug} sources={story.sources} totalSourceCount={displayTotalSources} />

          {reader ? <ReaderDrawer entry={reader} /> : null}
        </article>

        <aside className="feed-rail">
          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Coverage Details</h2>
            </div>
            <div className="kpi-strip">
              <div className="kpi">
                <span>Total News Sources</span>
                <strong>{displayTotalSources}</strong>
              </div>
              <div className="kpi">
                <span>Leaning Left</span>
                <strong>{coverageLeft}</strong>
              </div>
              <div className="kpi">
                <span>Center</span>
                <strong>{coverageCenter}</strong>
              </div>
              <div className="kpi">
                <span>Leaning Right</span>
                <strong>{coverageRight}</strong>
              </div>
              <div className="kpi">
                <span>Last Updated</span>
                <strong style={{ fontSize: "0.96rem" }}>{prettyDate(story.updatedAt)}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2>Daily Briefing</h2>
              <span className="story-meta">Top 6</span>
            </div>
            <ol className="rail-list">
              {dailyBriefing.map((item) => (
                <li key={item.id}>
                  <Link href={`/story/${item.slug}`} className="rail-link">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
          <SimilarTopicsPanel story={story} />
        </aside>
      </section>
    </main>
  );
}
