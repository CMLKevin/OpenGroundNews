import { PromoBanner } from "@/components/PromoBanner";
import { UtilityBar } from "@/components/UtilityBar";
import { TopNavClient } from "@/components/TopNavClient";
import { TrendingStrip } from "@/components/TrendingStrip";
import { db } from "@/lib/db";

async function loadTrendingTags(): Promise<string[]> {
  try {
    const groups = await db.storyTag.groupBy({
      by: ["tag"],
      _count: { tag: true },
      orderBy: { _count: { tag: "desc" } },
      take: 16,
    });
    const tags = groups.map((g) => g.tag).filter(Boolean);
    if (tags.length) return tags;
    return ["Politics", "World", "Business", "Technology", "Science", "Health", "Sports", "Climate"];
  } catch {
    return ["Politics", "World", "Business", "Technology", "Science", "Health", "Sports", "Climate"];
  }
}

export async function TopNav() {
  const tags = await loadTrendingTags();
  return (
    <header className="topbar">
      <PromoBanner />
      <UtilityBar />
      <TopNavClient />
      <TrendingStrip tags={tags} />
    </header>
  );
}
