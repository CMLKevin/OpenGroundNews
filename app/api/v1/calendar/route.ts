import { NextRequest, NextResponse } from "next/server";
import { listStories } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = (searchParams.get("topic") || "").trim();
  const bias = (searchParams.get("bias") || "all").trim().toLowerCase();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const stories = await listStories({ view: "all", limit: 2000, topic: topic || undefined });

  const filtered = stories.filter((story) => {
    const day = story.publishedAt.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (bias === "left") return story.bias.left > story.bias.center && story.bias.left > story.bias.right;
    if (bias === "center") return story.bias.center >= story.bias.left && story.bias.center >= story.bias.right;
    if (bias === "right") return story.bias.right > story.bias.center && story.bias.right > story.bias.left;
    return true;
  });

  const byDate = new Map<string, any[]>();
  for (const story of filtered) {
    const day = story.publishedAt.slice(0, 10);
    const bucket = byDate.get(day) || [];
    bucket.push({
      slug: story.slug,
      title: story.title,
      topic: story.topic,
      bias: story.bias,
      sourceCount: story.sourceCount,
      publishedAt: story.publishedAt,
    });
    byDate.set(day, bucket);
  }

  const calendar = Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, count: items.length, stories: items.slice(0, 50) }));

  return NextResponse.json({
    ok: true,
    version: "v1",
    count: filtered.length,
    calendar,
  });
}
