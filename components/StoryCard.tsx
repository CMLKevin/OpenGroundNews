import Link from "next/link";
import { Story } from "@/lib/types";
import { biasLabel, prettyDate, sourceCountLabel, storyReadTimeMinutes } from "@/lib/format";
import { BiasBar } from "@/components/BiasBar";
import { StoryImage } from "@/components/StoryImage";

export function StoryCard({ story }: { story: Story }) {
  const stale = Date.now() - +new Date(story.updatedAt) >= 7 * 86400000;
  const isSingleSource = Math.max(story.coverage?.totalSources ?? 0, story.sourceCount ?? 0, story.sources?.length ?? 0) <= 1;
  const hasBiasData = (story.bias.left || 0) + (story.bias.center || 0) + (story.bias.right || 0) > 0;
  const summary = (story.summary || "").trim() || "Open the story to compare source coverage and perspective details.";
  const chips = [
    story.blindspot ? "Blindspot" : null,
    story.trending ? "Trending" : null,
    stale ? "Stale" : null,
    !hasBiasData ? "Bias data unavailable" : null,
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
        {hasBiasData ? <BiasBar story={story} showLabels={false} /> : null}
        <p className="story-summary">{summary}</p>
        <div className="story-card-inline-meta">
          <span>{hasBiasData ? `${biasLabel(story)} coverage` : "Coverage mix unavailable"}</span>
          <span className="utility-dot" aria-hidden="true">
            •
          </span>
          <span>{sourceCountLabel(story)}</span>
          <span className="utility-dot" aria-hidden="true">
            •
          </span>
          <span>~{storyReadTimeMinutes(story)} min read</span>
        </div>
        <div className="u-mt-06">
          <Link className="btn btn-external" href={`/story/${story.slug}`}>
            {isSingleSource ? "Read Article" : "See the Story"}
          </Link>
        </div>
      </div>
    </article>
  );
}
