import Link from "next/link";
import type { Story } from "@/lib/types";
import { BlindspotStoryCard } from "@/components/BlindspotStoryCard";

export function BlindspotWidget({ stories }: { stories: Story[] }) {
  const visible = stories.slice(0, 4);

  return (
    <section className="panel u-grid u-grid-gap-07">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Blindspot</h2>
        <Link href="/blindspot" className="story-meta">
          open
        </Link>
      </div>
      {visible.length ? (
        <div className="blindspot-widget-grid" aria-label="Blindspot Watch">
          {visible.map((story) => (
            <BlindspotStoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <p className="story-meta u-m0">
          No blindspot candidates in the current sample.
        </p>
      )}
    </section>
  );
}

