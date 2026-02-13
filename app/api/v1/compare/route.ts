import { NextRequest, NextResponse } from "next/server";
import { listStories } from "@/lib/store";
import { outletSlug } from "@/lib/lookup";

export const dynamic = "force-dynamic";

type Coverage = {
  commonStories: number;
  sourceAOnly: number;
  sourceBOnly: number;
  overlapScore: number;
  biasA: any;
  biasB: any;
  sharedStories: Array<{ slug: string; title: string; topic: string; publishedAt: string }>;
  topTopics: Array<{ topic: string; sharedCount: number }>;
};

function normalizeBias(values: { left: number; center: number; right: number }) {
  const total = values.left + values.center + values.right;
  if (total <= 0) return { left: 0, center: 0, right: 0 };
  const left = Math.round((values.left / total) * 100);
  const center = Math.round((values.center / total) * 100);
  return { left, center, right: Math.max(0, 100 - left - center) };
}

function compareOutlets(stories: any[], sourceA: string, sourceB: string): Coverage {
  const slugA = outletSlug(sourceA).toLowerCase();
  const slugB = outletSlug(sourceB).toLowerCase();

  let commonStories = 0;
  let sourceAOnly = 0;
  let sourceBOnly = 0;
  const sharedStories: Array<{ slug: string; title: string; topic: string; publishedAt: string }> = [];
  const sharedTopicCounts = new Map<string, number>();

  const biasA = { left: 0, center: 0, right: 0 };
  const biasB = { left: 0, center: 0, right: 0 };

  for (const story of stories) {
    const outlets = new Set((story.sources || []).map((s: any) => outletSlug(s.outlet).toLowerCase()));
    const hasA = outlets.has(slugA);
    const hasB = outlets.has(slugB);

    if (hasA && hasB) {
      commonStories += 1;
      sharedStories.push({
        slug: story.slug,
        title: story.title,
        topic: story.topic,
        publishedAt: story.publishedAt,
      });
      const topic = String(story.topic || "Top Stories").trim() || "Top Stories";
      sharedTopicCounts.set(topic, (sharedTopicCounts.get(topic) || 0) + 1);
    } else if (hasA) sourceAOnly += 1;
    else if (hasB) sourceBOnly += 1;

    if (hasA) {
      biasA.left += story.bias.left || 0;
      biasA.center += story.bias.center || 0;
      biasA.right += story.bias.right || 0;
    }
    if (hasB) {
      biasB.left += story.bias.left || 0;
      biasB.center += story.bias.center || 0;
      biasB.right += story.bias.right || 0;
    }
  }

  const totalMentions = commonStories + sourceAOnly + sourceBOnly;
  const overlapScore = totalMentions > 0 ? Math.round((commonStories / totalMentions) * 100) : 0;

  return {
    commonStories,
    sourceAOnly,
    sourceBOnly,
    overlapScore,
    biasA: normalizeBias(biasA),
    biasB: normalizeBias(biasB),
    sharedStories: sharedStories
      .sort((a, b) => +new Date(b.publishedAt || 0) - +new Date(a.publishedAt || 0))
      .slice(0, 12),
    topTopics: Array.from(sharedTopicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, sharedCount]) => ({ topic, sharedCount })),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceA = (searchParams.get("a") || "").trim();
  const sourceB = (searchParams.get("b") || "").trim();
  const limit = Math.max(20, Math.min(2000, Number(searchParams.get("limit") || 600) || 600));

  if (!sourceA || !sourceB) {
    return NextResponse.json({ ok: false, error: "Query params a and b are required" }, { status: 400 });
  }

  const stories = await listStories({ view: "all", limit });
  const coverage = compareOutlets(stories, sourceA, sourceB);

  return NextResponse.json({
    ok: true,
    version: "v1",
    compared: { a: sourceA, b: sourceB },
    coverage,
  });
}
