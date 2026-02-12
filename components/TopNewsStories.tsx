import Link from "next/link";
import type { Story } from "@/lib/types";
import { StoryImage } from "@/components/StoryImage";
import { sourceCountLabel, storyReadTimeMinutes } from "@/lib/format";

export function TopNewsStories({ stories }: { stories: Story[] }) {
  const visible = stories.slice(0, 6);
  const totalArticles = visible.reduce((acc, s) => acc + (s.coverage?.totalSources ?? s.sourceCount ?? 0), 0);

  return (
    <section className="panel">
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Top News Stories</h2>
        <span className="story-meta">
          {visible.length} stories • {totalArticles} articles
        </span>
      </div>
      <ol className="rail-list rail-list-rich">
        {visible.map((story) => (
          <li key={story.id}>
            <Link href={`/story/${story.slug}`} className="rail-rich-link">
              <StoryImage src={story.imageUrl} alt={story.title} width={86} height={54} className="rail-thumb" unoptimized />
              <span>
                <span className="rail-link">{story.title}</span>
                <span className="story-meta">
                  {sourceCountLabel(story)} • ~{storyReadTimeMinutes(story)} min
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

