import Image from "next/image";
import Link from "next/link";
import { Story } from "@/lib/types";
import { biasLabel, prettyDate } from "@/lib/format";
import { BiasBar } from "@/components/BiasBar";

export function StoryCard({ story }: { story: Story }) {
  const chips = [
    story.blindspot ? "Blindspot" : null,
    story.local ? "Local" : null,
    story.trending ? "Trending" : null,
  ].filter(Boolean) as string[];

  return (
    <article className="story-card">
      <Image
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
          <span className="pill">{story.sourceCount} sources</span>
        </div>
      </div>
    </article>
  );
}
