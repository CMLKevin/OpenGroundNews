import Link from "next/link";
import { Story } from "@/lib/types";
import { prettyDate, sourceCountLabel } from "@/lib/format";
import { StoryImage } from "@/components/StoryImage";
import { computeBlindspotInfo } from "@/lib/blindspot";

export function BlindspotStoryCard({ story }: { story: Story }) {
  const info = computeBlindspotInfo(story);
  const badge =
    info.isBlindspotCandidate && info.dominantSide
      ? `${info.dominantPct}% ${info.dominantSide === "left" ? "Left" : "Right"}`
      : "Blindspot";
  const frameClass = info.column === "for-left" ? "is-for-left" : info.column === "for-right" ? "is-for-right" : "";

  return (
    <div className={`blindspot-frame ${frameClass}`}>
      <article className="story-card blindspot-card">
        <div className="blindspot-badge-row" aria-label={`Blindspot severity: ${badge}`}>
          <div className="blindspot-eye" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 5-5 5 5 0 0 1-5 5zm0-8a3 3 0 1 0 3 3 3 3 0 0 0-3-3z"
              />
            </svg>
          </div>
          <div className="blindspot-badge">
            <strong>{badge}</strong>
          </div>
          <div className="blindspot-badge-meta">
            <span className="blindspot-sources">{String(sourceCountLabel(story)).toUpperCase()}</span>
            {info.column ? <span className="blindspot-badge-sub">{info.label}</span> : null}
          </div>
        </div>

        <StoryImage className="story-cover" src={story.imageUrl} alt={story.title} width={640} height={360} unoptimized />
        <div className="story-content">
          <div className="story-meta">
            {story.topic} • {story.location} • Updated {prettyDate(story.updatedAt)}
          </div>
          <h3 className="story-title">
            <Link href={`/story/${story.slug}`}>{story.title}</Link>
          </h3>

          <div className="blindspot-breakdown-rows" aria-label="Coverage breakdown">
            <div className="blindspot-row">
              <span className="blindspot-row-label">Left</span>
              <span className="blindspot-row-bar">
                <span className="seg seg-left" style={{ width: `${story.bias.left}%` }} />
              </span>
              <span className="blindspot-row-pct">{story.bias.left}%</span>
            </div>
            <div className="blindspot-row">
              <span className="blindspot-row-label">Center</span>
              <span className="blindspot-row-bar">
                <span className="seg seg-center" style={{ width: `${story.bias.center}%` }} />
              </span>
              <span className="blindspot-row-pct">{story.bias.center}%</span>
            </div>
            <div className="blindspot-row">
              <span className="blindspot-row-label">Right</span>
              <span className="blindspot-row-bar">
                <span className="seg seg-right" style={{ width: `${story.bias.right}%` }} />
              </span>
              <span className="blindspot-row-pct">{story.bias.right}%</span>
            </div>
          </div>

          <p className="story-summary">{story.summary}</p>
        </div>
      </article>
    </div>
  );
}
