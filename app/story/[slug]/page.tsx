import { notFound } from "next/navigation";
import { BiasBar } from "@/components/BiasBar";
import { PerspectiveTabs } from "@/components/PerspectiveTabs";
import { SourceCoveragePanel } from "@/components/SourceCoveragePanel";
import { prettyDate } from "@/lib/format";
import { readArchiveForUrl } from "@/lib/archive";
import { getStoryBySlug } from "@/lib/store";

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
          <BiasBar story={story} showLabels={true} />
          <div className="story-stat-row">
            <span className="story-stat-pill">{story.sourceCount} sources</span>
            <span className="story-stat-pill">{story.bias.left}% left</span>
            <span className="story-stat-pill">{story.bias.center}% center</span>
            <span className="story-stat-pill">{story.bias.right}% right</span>
            {story.blindspot ? <span className="story-stat-pill">Blindspot candidate</span> : null}
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
                <strong>{story.sourceCount}</strong>
              </div>
            </div>
          </section>

          <PerspectiveTabs story={story} />

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

        <SourceCoveragePanel storySlug={story.slug} sources={story.sources} />
      </section>
    </main>
  );
}
