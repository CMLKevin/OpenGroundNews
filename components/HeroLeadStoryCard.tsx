import Link from "next/link";
import type { Story } from "@/lib/types";
import { StoryImage } from "@/components/StoryImage";
import { BiasBar } from "@/components/BiasBar";
import { prettyDate, sourceCountLabel } from "@/lib/format";

export function HeroLeadStoryCard({ story }: { story: Story }) {
  return (
    <article className="hero-lead">
      <Link className="hero-lead-link" href={`/story/${story.slug}`} aria-label={story.title}>
        <StoryImage
          src={story.imageUrl}
          alt={story.title}
          width={1280}
          height={720}
          className="hero-lead-img"
          unoptimized
        />
        <div className="hero-lead-overlay" aria-hidden="true" />
        <div className="hero-lead-content">
          <div className="hero-lead-meta">
            {story.topic} • {story.location} • Updated {prettyDate(story.updatedAt)} • {sourceCountLabel(story)}
          </div>
          <h2 className="hero-lead-title">{story.title}</h2>
          <div className="hero-lead-bias">
            <BiasBar story={story} showLabels={true} />
          </div>
        </div>
      </Link>
    </article>
  );
}

