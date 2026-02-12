import Link from "next/link";
import { StoryImage } from "@/components/StoryImage";
import { sourceCountLabel, storyReadTimeMinutes } from "@/lib/format";
import type { Story } from "@/lib/types";

export function DailyBriefingList({ stories, title = "Daily Briefing" }: { stories: Story[]; title?: string }) {
  const visible = stories.slice(0, 6);
  const origVals = stories
    .slice(0, 6)
    .map((s) => (typeof s.originalReportingPct === "number" ? s.originalReportingPct : null))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const origAvg = origVals.length ? Math.round(origVals.reduce((a, b) => a + b, 0) / origVals.length) : null;
  const totalArticles = visible.reduce((acc, s) => acc + (s.coverage?.totalSources ?? s.sourceCount ?? 0), 0);
  const avgReadTime = visible.length
    ? Math.round(visible.reduce((acc, s) => acc + storyReadTimeMinutes(s), 0) / visible.length)
    : 0;

  return (
    <section className="panel">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">{title}</h2>
        <span className="story-meta">
          {Math.min(6, stories.length)} stories • {totalArticles} articles • ~{avgReadTime || 1} min read
        </span>
      </div>
      {origAvg != null ? (
        <p className="story-meta u-mb-055">
          Original reporting: <strong>{origAvg}% of sources are Original Reporting</strong>
        </p>
      ) : null}
      <ol className="rail-list rail-list-rich">
        {visible.map((story) => (
          <li key={story.id}>
            <Link href={`/story/${story.slug}`} className="rail-rich-link">
              <StoryImage
                src={story.imageUrl}
                alt={story.title}
                width={86}
                height={54}
                className="rail-thumb"
                unoptimized
              />
                <span>
                  <span className="rail-link">{story.title}</span>
                  <span className="story-meta">
                    {typeof story.originalReportingPct === "number" ? `${story.originalReportingPct}% Original • ` : ""}
                    {sourceCountLabel(story)} • ~{storyReadTimeMinutes(story)} min • {story.bias.left}% L • {story.bias.center}% C • {story.bias.right}% R
                  </span>
                </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
