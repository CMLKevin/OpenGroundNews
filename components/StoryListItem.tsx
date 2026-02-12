import Link from "next/link";
import type { Story } from "@/lib/types";
import { prettyDate, sourceCountLabel } from "@/lib/format";
import { StoryImage } from "@/components/StoryImage";

export function StoryListItem({
  story,
  dense = false,
  showSummary = false,
}: {
  story: Story;
  dense?: boolean;
  showSummary?: boolean;
}) {
  return (
    <article className={`story-list-item ${dense ? "is-dense" : ""}`}>
      <div className="story-list-item-main">
        <div className="story-meta">
          {story.topic} • {story.location} • Updated {prettyDate(story.updatedAt)} • {sourceCountLabel(story)}
        </div>
        <h3 className="story-list-item-title">
          <Link href={`/story/${encodeURIComponent(story.slug)}`} className="story-list-item-link">
            {story.title}
          </Link>
        </h3>
        {showSummary ? <p className="story-list-item-summary">{story.summary}</p> : null}
        <div className="story-list-item-bias" aria-label="Bias coverage">
          <div className="bias-mini-bar">
            <span className="seg seg-left" style={{ width: `${story.bias.left}%` }} />
            <span className="seg seg-center" style={{ width: `${story.bias.center}%` }} />
            <span className="seg seg-right" style={{ width: `${story.bias.right}%` }} />
          </div>
          <div className="bias-mini-meta">
            <span className="bias-meta-left">{story.bias.left}%</span>
            <span className="bias-meta-center">{story.bias.center}%</span>
            <span className="bias-meta-right">{story.bias.right}%</span>
          </div>
        </div>
      </div>

      <StoryImage
        className="story-list-item-thumb"
        src={story.imageUrl}
        alt={story.title}
        width={160}
        height={100}
        unoptimized
      />
    </article>
  );
}
