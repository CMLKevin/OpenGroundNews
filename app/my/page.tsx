import { SavedFeed } from "@/components/SavedFeed";
import { listStories } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const stories = await listStories({ view: "all", limit: 120 });

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <SavedFeed initialStories={stories} />
    </main>
  );
}

