import { NextRequest, NextResponse } from "next/server";
import { listStories } from "@/lib/store";

export const dynamic = "force-dynamic";

const LOCATION_COORDS: Record<string, { lat: number; lon: number }> = {
  international: { lat: 20, lon: 0 },
  "united states": { lat: 37.0902, lon: -95.7129 },
  canada: { lat: 56.1304, lon: -106.3468 },
  "united kingdom": { lat: 55.3781, lon: -3.436 },
  europe: { lat: 54.526, lon: 15.2551 },
};

function coordsFor(location: string) {
  const key = (location || "").trim().toLowerCase();
  return LOCATION_COORDS[key] || LOCATION_COORDS.international;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(3000, Number(searchParams.get("limit") || 1000) || 1000));
  const stories = await listStories({ view: "all", limit });

  const points = stories.map((story) => {
    const coords = coordsFor(story.location);
    return {
      id: story.id,
      slug: story.slug,
      title: story.title,
      topic: story.topic,
      location: story.location,
      lat: coords.lat,
      lon: coords.lon,
      bias: story.bias,
      sourceCount: story.sourceCount,
      updatedAt: story.updatedAt,
    };
  });

  return NextResponse.json({ ok: true, version: "v1", count: points.length, points });
}
