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

  return (
    <article className="story-card blindspot-card">
      <div className="blindspot-badge" aria-label={`Blindspot severity: ${badge}`}>
        <strong>{badge}</strong>
        {info.column ? <span className="blindspot-badge-sub">{info.label}</span> : null}
      </div>
      <StoryImage className="story-cover" src={story.imageUrl} alt={story.title} width={640} height={360} unoptimized />
      <div className="story-content">
        <div className="story-meta">
          {story.topic} • {story.location} • Updated {prettyDate(story.updatedAt)}
        </div>
        <h3 className="story-title">
          <Link href={`/story/${story.slug}`}>{story.title}</Link>
        </h3>
        <p className="story-summary">{story.summary}</p>
        <div className="story-card-footer">
          <span className="pill">{sourceCountLabel(story)}</span>
          <span className="pill">{info.column ? info.label : "Blindspot candidate"}</span>
        </div>
      </div>
    </article>
  );
}

