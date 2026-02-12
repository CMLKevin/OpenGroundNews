import Link from "next/link";
import { Story } from "@/lib/types";
import { biasLabel, prettyDate, sourceCountLabel } from "@/lib/format";
import { BiasBar } from "@/components/BiasBar";
import { StoryImage } from "@/components/StoryImage";

export function StoryCard({ story }: { story: Story }) {
  const chips = [
    story.blindspot ? "Blindspot" : null,
    story.local ? "Local" : null,
    story.trending ? "Trending" : null,
  ].filter(Boolean) as string[];

  return (
    <article className="story-card">
      <StoryImage
        className="story-cover"
        src={story.imageUrl}
        alt={story.title}
        width={640}
        height={360}
        unoptimized
      />
      <div className="story-content">
        <div className="story-meta">
          {story.topic} • {story.location} • Updated {prettyDate(story.updatedAt)}
        </div>
        {chips.length > 0 ? (
          <div className="chip-row">
            {chips.map((chip) => (
              <span className="chip" key={`${story.id}-${chip}`}>
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        <h3 className="story-title">
          <Link href={`/story/${story.slug}`}>{story.title}</Link>
        </h3>
        <BiasBar story={story} showLabels={false} />
        <p className="story-summary">{story.summary}</p>
        <div className="story-card-footer">
          <span className="pill">{biasLabel(story)} coverage</span>
          <span className="pill">{sourceCountLabel(story)}</span>
        </div>
      </div>
    </article>
  );
}
