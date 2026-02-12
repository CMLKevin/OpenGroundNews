import { UtilityBar } from "@/components/UtilityBar";
import { TopNavClient } from "@/components/TopNavClient";
import { TrendingStrip } from "@/components/TrendingStrip";
import { db } from "@/lib/db";
import { DEFAULT_TOPIC_FALLBACKS } from "@/lib/constants";
import { topicDisplayName } from "@/lib/topics";
import { listStories } from "@/lib/store";
import { slugify } from "@/lib/format";

function dedupeTopics(labels: string[], limit = 16): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = String(raw || "").trim();
    if (!label) continue;
    const key = slugify(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}

async function deriveTrendingTagsFromStories(): Promise<string[]> {
  const stories = await listStories({ view: "all", limit: 300 }).catch(() => []);
  if (!stories.length) return [];

  const tagCounts = new Map<string, number>();
  for (const story of stories) {
    for (const tag of story.tags || []) {
      const label = topicDisplayName(tag);
      if (!label) continue;
      tagCounts.set(label, (tagCounts.get(label) || 0) + 1);
    }
  }
  if (tagCounts.size > 0) {
    return dedupeTopics(
      Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([tag]) => tag),
    );
  }

  const topicCounts = new Map<string, number>();
  for (const story of stories) {
    const label = topicDisplayName(story.topic);
    if (!label) continue;
    topicCounts.set(label, (topicCounts.get(label) || 0) + 1);
  }
  return dedupeTopics(
    Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([topic]) => topic),
  );
}

async function loadTrendingTags(): Promise<string[]> {
  try {
    const groups = await db.storyTag.groupBy({
      by: ["tag"],
      _count: { tag: true },
      orderBy: { _count: { tag: "desc" } },
      take: 16,
    });
    const tags = dedupeTopics(groups.map((g) => topicDisplayName(g.tag)).filter(Boolean) as string[]);
    if (tags.length) return tags;
    const topics = await db.story.groupBy({
      by: ["topic"],
      _count: { topic: true },
      orderBy: { _count: { topic: "desc" } },
      take: 16,
    });
    const mappedTopics = dedupeTopics(topics.map((g) => topicDisplayName(g.topic)).filter(Boolean) as string[]);
    if (mappedTopics.length) return mappedTopics;
    const fromStories = await deriveTrendingTagsFromStories();
    if (fromStories.length) return fromStories;
    return dedupeTopics([...DEFAULT_TOPIC_FALLBACKS]);
  } catch {
    const fromStories = await deriveTrendingTagsFromStories();
    if (fromStories.length) return fromStories;
    return dedupeTopics([...DEFAULT_TOPIC_FALLBACKS]);
  }
}

export async function TopNav() {
  const tags = await loadTrendingTags();
  return (
    <header className="topbar">
      <UtilityBar />
      <TopNavClient />
      <TrendingStrip tags={tags} />
    </header>
  );
}
