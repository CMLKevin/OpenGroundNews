import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outletSlug, topicSlug } from "@/lib/lookup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalize(value: string) {
  return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = normalize(searchParams.get("q") || "");
  if (!q || q.length < 2) return NextResponse.json({ ok: true, q, stories: [], topics: [], outlets: [] });

  const storyRows = await db.story.findMany({
    where: {
      OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }],
    },
    orderBy: { updatedAt: "desc" },
    select: { slug: true, title: true, topic: true, location: true, updatedAt: true, imageUrl: true, sourceCount: true },
    take: 8,
  });

  const topicCounts = new Map<string, { slug: string; label: string; count: number }>();
  for (const row of storyRows) {
    const slug = topicSlug(row.topic);
    const existing = topicCounts.get(slug) || { slug, label: row.topic, count: 0 };
    existing.count += 1;
    topicCounts.set(slug, existing);
  }

  const outletRows = await db.outlet.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, logoUrl: true },
    take: 8,
  });

  return NextResponse.json({
    ok: true,
    q,
    stories: storyRows.map((r) => ({
      slug: r.slug,
      title: r.title,
      topic: r.topic,
      location: r.location,
      imageUrl: r.imageUrl,
      sourceCount: r.sourceCount,
      updatedAt: r.updatedAt.toISOString(),
    })),
    topics: Array.from(topicCounts.values()).sort((a, b) => b.count - a.count).slice(0, 8),
    outlets: outletRows.map((o) => ({ slug: outletSlug(o.name) || o.slug, label: o.name, logoUrl: o.logoUrl })),
  });
}
