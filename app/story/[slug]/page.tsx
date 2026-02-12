import Link from "next/link";
import { notFound } from "next/navigation";
import { BiasBar } from "@/components/BiasBar";
import { BiasDistributionPanel } from "@/components/BiasDistributionPanel";
import { PerspectiveTabs } from "@/components/PerspectiveTabs";
import { SimilarTopicsPanel } from "@/components/SimilarTopicsPanel";
import { SourceCoveragePanel } from "@/components/SourceCoveragePanel";
import { StoryImage } from "@/components/StoryImage";
import { prettyDate } from "@/lib/format";
import { readArchiveForUrl } from "@/lib/archive";
import { getStoryBySlug, listStories } from "@/lib/store";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string }>;
};

export const dynamic = "force-dynamic";

export default async function StoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { source } = await searchParams;

  const story = await getStoryBySlug(slug);
  if (!story) return notFound();

  const displayTotalSources = story.coverage?.totalSources ?? story.sourceCount;
  const coverageLeft = story.coverage?.leaningLeft ?? Math.round((story.bias.left / 100) * displayTotalSources);
  const coverageCenter = story.coverage?.center ?? Math.round((story.bias.center / 100) * displayTotalSources);
  const coverageRight = story.coverage?.leaningRight ?? Math.round((story.bias.right / 100) * displayTotalSources);
  const dailyBriefing = (await listStories({ view: "all", limit: 8 })).filter((item) => item.slug !== story.slug).slice(0, 6);
  const reader = source ? await readArchiveForUrl(source) : null;

  return (
    <main className="container">
      <section className="story-shell">
        <article className="panel" style={{ display: "grid", gap: "0.85rem", background: "#fff" }}>
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
            <span className="story-stat-pill">{displayTotalSources} sources</span>
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

          {(story.timelineHeaders?.length || story.podcastReferences?.length) ? (
            <section className="panel" style={{ background: "var(--bg-panel)", display: "grid", gap: "0.5rem" }}>
              <div className="section-title" style={{ paddingTop: 0 }}>
                <h2 style={{ margin: 0 }}>Context Signals</h2>
              </div>
              {story.timelineHeaders?.length ? (
                <div>
                  <div className="story-meta" style={{ marginBottom: "0.2rem" }}>Story timeline cues</div>
                  <ul className="perspective-list">
                    {story.timelineHeaders.slice(0, 5).map((heading, idx) => (
                      <li key={`${story.id}-timeline-${idx}`}>{heading}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {story.podcastReferences?.length ? (
                <div>
                  <div className="story-meta" style={{ marginBottom: "0.2rem" }}>Podcasts & opinions</div>
                  <ul className="perspective-list">
                    {story.podcastReferences.slice(0, 4).map((entry, idx) => (
                      <li key={`${story.id}-pod-${idx}`}>{entry}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="panel" style={{ background: "var(--bg-panel)" }}>
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Related Topics</h2>
            </div>
            <div className="chip-row">
              {story.tags.map((tag) => (
                <span className="chip" key={tag}>{tag}</span>
              ))}
            </div>
          </section>

          {reader && (
            <section className="reader panel" style={{ background: "#fff" }}>
              <h3>{reader.title}</h3>
              <div className="story-meta">
                Reader mode status: <strong>{reader.status}</strong> • {reader.notes}
              </div>
              {reader.archiveUrl !== "none" && (
                <a className="btn" href={reader.archiveUrl} target="_blank" rel="noreferrer">
                  Open Archived Source
                </a>
              )}
              {reader.paragraphs.map((p, idx) => (
                <p key={`${reader.originalUrl}-${idx}`}>{p}</p>
              ))}
            </section>
          )}
        </article>

        <aside className="feed-rail">
          <section className="panel" style={{ background: "#fff" }}>
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

          <section className="panel" style={{ background: "#fff" }}>
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
          <SourceCoveragePanel storySlug={story.slug} sources={story.sources} totalSourceCount={displayTotalSources} />
        </aside>
      </section>
    </main>
  );
}
