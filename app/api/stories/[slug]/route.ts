import { NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/store";
import { storyReadTimeMinutes } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const story = await getStoryBySlug(slug);
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  return NextResponse.json({
    story: {
      ...story,
      readTimeMinutes: story.readTimeMinutes || storyReadTimeMinutes(story),
      freshness: {
        lastRefreshedAt: story.updatedAt,
        staleAt: new Date(new Date(story.updatedAt).getTime() + 7 * 86400000).toISOString(),
        isStale: Date.now() - +new Date(story.updatedAt) >= 7 * 86400000,
      },
    },
  });
}
