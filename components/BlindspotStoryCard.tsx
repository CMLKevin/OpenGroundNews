import Link from "next/link";
import { Story } from "@/lib/types";
import { StoryImage } from "@/components/StoryImage";
import { computeBlindspotInfo } from "@/lib/blindspot";

export function BlindspotStoryCard({ story }: { story: Story }) {
  const info = computeBlindspotInfo(story);
  const missingSide = info.underreportedSide;
  const missingPct = missingSide === "left" ? story.bias.left : missingSide === "right" ? story.bias.right : 0;
  const badgeTone = missingSide === "left" ? "is-left" : missingSide === "right" ? "is-right" : "is-right";
  const badgeLabel =
    info.isBlindspotCandidate && missingSide
      ? `Only ${missingPct}% ${missingSide === "left" ? "Left" : "Right"}`
      : "Blindspot";
  const cardHref = `/story/${story.slug}`;

  return (
    <Link href={cardHref} className="blindspot-card-link">
      <article className="story-card blindspot-card">
        <StoryImage className="story-cover" src={story.imageUrl} alt={story.title} width={608} height={440} unoptimized />
        <div className="story-content">
          <div className="blindspot-badge-row" aria-label={`Blindspot: ${badgeLabel}`}>
            <div className="blindspot-badge-left">
              <div className="blindspot-eye" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 5-5 5 5 0 0 1-5 5zm0-8a3 3 0 1 0 3 3 3 3 0 0 0-3-3z"
                  />
                </svg>
              </div>
              <span className="blindspot-label">Blindspot:</span>
              <span className={`blindspot-pill ${badgeTone}`}>{badgeLabel}</span>
            </div>
          </div>

          <h3 className="story-title blindspot-title">
            {story.title}
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
        </div>
      </article>
    </Link>
  );
}
