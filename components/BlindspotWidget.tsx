import Link from "next/link";
import type { Story } from "@/lib/types";
import { BlindspotStoryCard } from "@/components/BlindspotStoryCard";

export function BlindspotWidget({ stories }: { stories: Story[] }) {
  const visible = stories.slice(0, 4);

  return (
    <section className="panel" style={{ display: "grid", gap: "0.7rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Blindspot</h2>
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
        <p className="story-meta" style={{ margin: 0 }}>
          No blindspot candidates in the current sample.
        </p>
      )}
    </section>
  );
}

