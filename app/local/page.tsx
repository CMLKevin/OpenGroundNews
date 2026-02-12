import { StoryCard } from "@/components/StoryCard";
import { LocalFeedControls } from "@/components/LocalFeedControls";
import { listStories } from "@/lib/store";

export const dynamic = "force-dynamic";

type LocalPageProps = {
  searchParams: Promise<{ location?: string; edition?: string }>;
};

export default async function LocalPage({ searchParams }: LocalPageProps) {
  const { location, edition } = await searchParams;
  const stories = await listStories({
    view: "local",
    limit: 24,
    location: location?.trim() || undefined,
    edition: edition?.trim() || undefined,
  });

  return (
    <main className="container" style={{ paddingTop: "1rem" }}>
      <div className="section-title">
        <h2>Local Lens Feed</h2>
      </div>
      <LocalFeedControls />
      <p className="note">
        Local stories are filtered by your selected region/city and by local-marked stories from ingestion.
      </p>
      <section className="grid" style={{ marginTop: "1rem" }}>
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </section>
    </main>
  );
}
