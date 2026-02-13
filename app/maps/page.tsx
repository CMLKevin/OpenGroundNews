import { StoryMapClient } from "@/components/maps/StoryMapClient";
import { listStories } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MapsPage() {
  const stories = await listStories({ view: "all", limit: 1000 });
  const LOCATION_COORDS: Record<string, { lat: number; lon: number }> = {
    international: { lat: 20, lon: 0 },
    "united states": { lat: 37.0902, lon: -95.7129 },
    canada: { lat: 56.1304, lon: -106.3468 },
    "united kingdom": { lat: 55.3781, lon: -3.436 },
    europe: { lat: 54.526, lon: 15.2551 },
  };
  const points = stories.map((story) => {
    const key = String(story.location || "").toLowerCase();
    const coords =
      story.geo && Number.isFinite(story.geo.lat) && Number.isFinite(story.geo.lon)
        ? { lat: story.geo.lat, lon: story.geo.lon }
        : LOCATION_COORDS[key] || LOCATION_COORDS.international;
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
    };
  });

  return (
    <main className="container u-page-pad">
      <StoryMapClient points={points || []} />
    </main>
  );
}
