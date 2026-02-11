import Image from "next/image";
import Link from "next/link";
import { Story } from "@/lib/types";
import { biasLabel, prettyDate } from "@/lib/format";
import { BiasBar } from "@/components/BiasBar";

export function StoryCard({ story }: { story: Story }) {
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
        <div className="chip-row">
          {story.blindspot ? <span className="chip">Blindspot</span> : null}
          {story.local ? <span className="chip">Local</span> : null}
          {story.trending ? <span className="chip">Trending</span> : null}
        </div>
        <h3 className="story-title">
          <Link href={`/story/${story.slug}`}>{story.title}</Link>
        </h3>
        <BiasBar story={story} />
        <p className="story-summary">{story.summary}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="pill">{biasLabel(story)} coverage</span>
          <span className="pill">{story.sourceCount} sources</span>
        </div>
      </div>
    </article>
  );
}
