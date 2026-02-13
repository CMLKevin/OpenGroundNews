import { NextRequest, NextResponse } from "next/server";
import { listStories } from "@/lib/store";
import { storyReadTimeMinutes } from "@/lib/format";

export const dynamic = "force-dynamic";

function withParityFields(story: any) {
  const refreshedAt = new Date(story.lastRefreshedAt || story.updatedAt || story.publishedAt || Date.now());
  const staleAt = story.staleAt
    ? new Date(story.staleAt)
    : new Date(refreshedAt.getTime() + Math.max(1, Number(process.env.STORY_STALE_AFTER_DAYS || 7)) * 86400000);

  const sourceWithTime = (story.sources || [])
    .filter((s: any) => s.publishedAt)
    .sort((a: any, b: any) => +new Date(String(a.publishedAt)) - +new Date(String(b.publishedAt)));

  const brokeTheNews = sourceWithTime[0]
    ? {
        outlet: sourceWithTime[0].outlet,
        publishedAt: sourceWithTime[0].publishedAt,
        sourceId: sourceWithTime[0].id,
      }
    : null;

  return {
    ...story,
    readTimeMinutes: story.readTimeMinutes || storyReadTimeMinutes(story),
    freshness:
      story.freshness && story.freshness.lastRefreshedAt && story.freshness.staleAt
        ? story.freshness
        : {
            lastRefreshedAt: refreshedAt.toISOString(),
            staleAt: staleAt.toISOString(),
            isStale: staleAt.getTime() <= Date.now(),
          },
    brokeTheNews: story.brokeTheNews || brokeTheNews,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic") || undefined;
  const viewParam = searchParams.get("view") as "all" | "blindspot" | "local" | "trending" | null;
  const view = viewParam ?? "all";
  const edition = searchParams.get("edition") || undefined;
  const location = searchParams.get("location") || undefined;
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const limit = Math.max(1, Math.min(2000, Number(searchParams.get("limit") || 200) || 200));

  const stories = await listStories({ topic, view, limit, edition, location });
  const filtered =
    q.length === 0
      ? stories
      : stories.filter((story) => {
          const haystack = `${story.title} ${story.summary} ${story.topic} ${story.tags.join(" ")} ${story.sources
            .map((s) => s.outlet)
            .join(" ")}`.toLowerCase();
          return haystack.includes(q);
        });

  return NextResponse.json({
    ok: true,
    version: "v1",
    count: filtered.length,
    stories: filtered.map(withParityFields),
  });
}
