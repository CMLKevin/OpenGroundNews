import type { Story } from "@/lib/types";
import { StoryListItem } from "@/components/StoryListItem";

export function NewsList({ stories, dense = false }: { stories: Story[]; dense?: boolean }) {
  if (!stories || stories.length === 0) return null;
  return (
    <section className="news-list" aria-label="News list">
      {stories.map((s) => (
        <StoryListItem key={s.id} story={s} dense={dense} />
      ))}
    </section>
  );
}

