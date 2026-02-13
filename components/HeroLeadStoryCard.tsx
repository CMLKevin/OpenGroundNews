import Link from "next/link";
import type { Story } from "@/lib/types";
import { StoryImage } from "@/components/StoryImage";
import { BiasBar } from "@/components/BiasBar";

function hostLabel(raw?: string) {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function HeroLeadStoryCard({ story }: { story: Story }) {
  const attributionTarget = String(story.canonicalUrl || story.imageUrl || "").trim();
  const attributionHost = hostLabel(story.imageUrl) || hostLabel(story.canonicalUrl) || "publisher source";

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
          <h2 className="hero-lead-title">{story.title}</h2>
          <div className="hero-lead-bias">
            <BiasBar story={story} showLabels={true} />
          </div>
        </div>
      </Link>
      {attributionTarget ? (
        <a
          className="hero-image-attribution"
          href={attributionTarget}
          target="_blank"
          rel="noreferrer"
          aria-label={`Image attribution: ${attributionHost}`}
          title={`Image source: ${attributionHost}`}
        >
          i
        </a>
      ) : null}
    </article>
  );
}
