import { NextRequest, NextResponse } from "next/server";
import { listStories } from "@/lib/store";
import { storyReadTimeMinutes } from "@/lib/format";
import { applyRateLimit } from "@/lib/infra/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon";
  const rl = await applyRateLimit({
    namespace: "api-stories",
    identifier: ip,
    limit: Number(process.env.API_STORIES_RATE_LIMIT || 240),
    windowSec: Number(process.env.API_STORIES_RATE_WINDOW_SEC || 60),
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic") || undefined;
  const viewParam = searchParams.get("view") as "all" | "blindspot" | "local" | "trending" | null;
  const view = viewParam ?? "all";
  const edition = searchParams.get("edition") || undefined;
  const location = searchParams.get("location") || undefined;
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

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
  const withParityFields = filtered.map((story) => ({
    ...story,
    readTimeMinutes: story.readTimeMinutes || storyReadTimeMinutes(story),
    freshness: {
      lastRefreshedAt: story.updatedAt,
      staleAt: new Date(new Date(story.updatedAt).getTime() + 7 * 86400000).toISOString(),
      isStale: Date.now() - +new Date(story.updatedAt) >= 7 * 86400000,
    },
  }));
  return NextResponse.json(
    { stories: withParityFields, count: withParityFields.length },
    {
      headers: {
        "x-ratelimit-limit": String(rl.limit),
        "x-ratelimit-remaining": String(rl.remaining),
        "x-ratelimit-reset": String(rl.resetAt),
      },
    },
  );
}
