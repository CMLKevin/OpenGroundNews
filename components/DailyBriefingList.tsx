import Link from "next/link";
import { StoryImage } from "@/components/StoryImage";
import { sourceCountLabel } from "@/lib/format";
import type { Story } from "@/lib/types";

export function DailyBriefingList({ stories, title = "Daily Briefing" }: { stories: Story[]; title?: string }) {
  const origVals = stories
    .slice(0, 6)
    .map((s) => (typeof s.originalReportingPct === "number" ? s.originalReportingPct : null))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const origAvg = origVals.length ? Math.round(origVals.reduce((a, b) => a + b, 0) / origVals.length) : null;

  return (
    <section className="panel">
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span className="story-meta">Top {Math.min(6, stories.length)}</span>
      </div>
      {origAvg != null ? (
        <p className="story-meta" style={{ margin: "0 0 0.55rem" }}>
          Original reporting: <strong>{origAvg}% of sources are Original Reporting</strong>
        </p>
      ) : null}
      <ol className="rail-list rail-list-rich">
        {stories.slice(0, 6).map((story) => (
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
                    {sourceCountLabel(story)} • {story.bias.left}% L • {story.bias.center}% C • {story.bias.right}% R
                  </span>
                </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
