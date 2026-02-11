import { NextRequest, NextResponse } from "next/server";
import { listStories } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic") || undefined;
  const viewParam = searchParams.get("view") as "all" | "blindspot" | "local" | "trending" | null;
  const view = viewParam ?? "all";
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const stories = await listStories({ topic, view, limit });
  const filtered =
    q.length === 0
      ? stories
      : stories.filter((story) => {
          const haystack = `${story.title} ${story.summary} ${story.topic} ${story.tags.join(" ")} ${story.sources
            .map((s) => s.outlet)
            .join(" ")}`.toLowerCase();
          return haystack.includes(q);
        });
  return NextResponse.json({ stories: filtered, count: filtered.length });
}
