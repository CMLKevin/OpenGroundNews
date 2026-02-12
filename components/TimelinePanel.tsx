import { Story } from "@/lib/types";
import { prettyDate } from "@/lib/format";

export function TimelinePanel({ story }: { story: Story }) {
  const items = Array.isArray(story.timelineHeaders) ? story.timelineHeaders.filter(Boolean).slice(0, 6) : [];
  if (items.length === 0) return null;

  return (
    <section className="panel" style={{ background: "var(--bg-panel)", display: "grid", gap: "0.55rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Timeline</h2>
        <span className="story-meta">{prettyDate(story.publishedAt)}</span>
      </div>
      <ol className="ogn-timeline">
        <li className="ogn-timeline-item">
          <div className="ogn-timeline-dot" />
          <div className="ogn-timeline-body">
            <div className="story-meta">Published</div>
            <div>{items[0]}</div>
          </div>
        </li>
        {items.slice(1).map((text, idx) => (
          <li key={`${story.id}-tl-${idx}`} className="ogn-timeline-item">
            <div className="ogn-timeline-dot" />
            <div className="ogn-timeline-body">
              <div className="story-meta">Update cue</div>
              <div>{text}</div>
            </div>
          </li>
        ))}
        <li className="ogn-timeline-item">
          <div className="ogn-timeline-dot" />
          <div className="ogn-timeline-body">
            <div className="story-meta">Last updated</div>
            <div>{prettyDate(story.updatedAt)}</div>
          </div>
        </li>
      </ol>
    </section>
  );
}

