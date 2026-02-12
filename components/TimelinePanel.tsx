import { Story } from "@/lib/types";
import { prettyDate } from "@/lib/format";

function timelineLabel(text: string, fallback: string) {
  const clean = String(text || "").trim();
  if (!clean) return fallback;
  const directDate = Date.parse(clean);
  if (Number.isFinite(directDate)) return prettyDate(new Date(directDate).toISOString());
  const datePrefix = clean.match(/^([A-Z][a-z]{2,8}\s+\d{1,2}(?:,\s*\d{4})?)/);
  if (datePrefix && Number.isFinite(Date.parse(datePrefix[1]))) {
    return prettyDate(new Date(Date.parse(datePrefix[1])).toISOString());
  }
  return fallback;
}

export function TimelinePanel({ story }: { story: Story }) {
  const items = Array.isArray(story.timelineHeaders) ? story.timelineHeaders.filter(Boolean).slice(0, 6) : [];
  if (items.length === 0) return null;

  return (
    <section className="panel u-grid u-grid-gap-055">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Timeline</h2>
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
              <div className="story-meta">{timelineLabel(text, `Update ${idx + 1}`)}</div>
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
