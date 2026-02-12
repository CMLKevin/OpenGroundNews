import { StoryCard } from "@/components/StoryCard";
import { listStories } from "@/lib/store";

export const dynamic = "force-dynamic";

type BlindspotProps = {
  searchParams: Promise<{ edition?: string }>;
};

export default async function BlindspotPage({ searchParams }: BlindspotProps) {
  const { edition } = await searchParams;
  const stories = await listStories({ view: "blindspot", limit: 24, edition: edition?.trim() || undefined });

  return (
    <main className="container" style={{ paddingTop: "1rem" }}>
      <div className="section-title">
        <h2>Blindspot Monitor</h2>
      </div>
      <p className="note">
        Blindspot stories are flagged when one side dominates coverage distribution. Thresholds can be tuned in the
        ingestion pipeline script.
      </p>
      <section className="grid" style={{ marginTop: "1rem" }}>
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </section>
    </main>
  );
}
