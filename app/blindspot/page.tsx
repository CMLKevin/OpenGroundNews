import { BlindspotStoryCard } from "@/components/BlindspotStoryCard";
import { listStories } from "@/lib/store";
import { computeBlindspotInfo } from "@/lib/blindspot";

export const dynamic = "force-dynamic";

type BlindspotProps = {
  searchParams: Promise<{ edition?: string }>;
};

export default async function BlindspotPage({ searchParams }: BlindspotProps) {
  const { edition } = await searchParams;
  const stories = await listStories({ view: "blindspot", limit: 24, edition: edition?.trim() || undefined });

  const candidates = stories
    .map((story) => ({ story, info: computeBlindspotInfo(story) }))
    .filter(({ info }) => info.isBlindspotCandidate);

  const forLeft = candidates.filter(({ info }) => info.column === "for-left").map(({ story }) => story);
  const forRight = candidates.filter(({ info }) => info.column === "for-right").map(({ story }) => story);

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel blindspot-hero" style={{ display: "grid", gap: "0.7rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
            Blindspot Report
          </h1>
          <span className="story-meta">{candidates.length} high-skew stories</span>
        </div>
        <p style={{ margin: 0, color: "var(--ink-soft)" }}>
          Blindspot stories are flagged when coverage is highly skewed. If a story is covered mostly by right-leaning
          outlets, it may be a blindspot <strong>for the left</strong>, and vice versa.
        </p>
      </section>

      <section className="blindspot-columns" style={{ marginTop: "1rem" }}>
        <div className="blindspot-col">
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h2 style={{ margin: 0 }}>For the Left</h2>
            <span className="story-meta">{forLeft.length}</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "0.85rem" }}>
            {forLeft.map((story) => (
              <BlindspotStoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>

        <div className="blindspot-col">
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h2 style={{ margin: 0 }}>For the Right</h2>
            <span className="story-meta">{forRight.length}</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "0.85rem" }}>
            {forRight.map((story) => (
              <BlindspotStoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
