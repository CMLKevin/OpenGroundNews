import { NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/store";
import { storyReadTimeMinutes } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const story = await getStoryBySlug(slug);
  if (!story) return NextResponse.json({ ok: false, error: "Story not found" }, { status: 404 });

  const sourceWithTime = (story.sources || []).filter((s) => s.publishedAt).sort((a, b) => +new Date(String(a.publishedAt)) - +new Date(String(b.publishedAt)));
  const ownershipCounts = (story.sources || []).reduce<Record<string, number>>((acc, source) => {
    const key = String(source.ownership || "Unlabeled").trim() || "Unlabeled";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const factualityCounts = (story.sources || []).reduce<Record<string, number>>((acc, source) => {
    const key = String(source.factuality || "unknown").trim() || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const timeline = Array.isArray(story.timeline)
    ? story.timeline
    : (story.timelineHeaders || []).map((label, idx) => ({
        id: `${story.id}-timeline-${idx}`,
        label,
        order: idx + 1,
      }));
  const podcasts = Array.isArray(story.podcasts)
    ? story.podcasts
    : (story.podcastReferences || []).map((label, idx) => ({
        id: `${story.id}-podcast-${idx}`,
        label,
      }));
  const readerLinkItems = Array.isArray(story.readerLinkItems)
    ? story.readerLinkItems
    : (story.readerLinks || []).map((url, idx) => ({
        id: `${story.id}-reader-${idx}`,
        url,
      }));

  return NextResponse.json({
    ok: true,
    version: "v1",
    story: {
      ...story,
      readTimeMinutes: story.readTimeMinutes || storyReadTimeMinutes(story),
      brokeTheNews:
        story.brokeTheNews ||
        (sourceWithTime[0]
          ? {
              sourceId: sourceWithTime[0].id,
              outlet: sourceWithTime[0].outlet,
              publishedAt: sourceWithTime[0].publishedAt,
            }
          : null),
      timeline,
      podcasts,
      readerLinks: readerLinkItems.map((item) => item.url),
      readerLinkItems,
      relatedStories: story.relatedStories || [],
      snapshots: story.snapshots || [],
      ownershipModule: {
        ownershipCounts,
        topOwnership: Object.entries(ownershipCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([label, count]) => ({ label, count })),
      },
      factualityModule: {
        counts: factualityCounts,
      },
      geo: story.geo || null,
    },
  });
}
