import { StoryCard } from "@/components/StoryCard";
import { LocalFeedControls } from "@/components/LocalFeedControls";
import { listStories } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LocalPage() {
  const stories = await listStories({ view: "local", limit: 24 });

  return (
    <main className="container" style={{ paddingTop: "1rem" }}>
      <div className="section-title">
        <h2>Local Lens Feed</h2>
      </div>
      <LocalFeedControls />
      <p className="note">
        Local stories are generated from region-tagged stories during ingestion. For deeper parity, add geolocation +
        district-level ranking in the pipeline.
      </p>
      <section className="grid" style={{ marginTop: "1rem" }}>
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </section>
    </main>
  );
}
