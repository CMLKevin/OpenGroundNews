import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryCard } from "@/components/StoryCard";
import { BiasBar } from "@/components/BiasBar";
import { FollowToggle } from "@/components/FollowToggle";
import { listStoriesByTopicSlug } from "@/lib/store";
import { prettyDate, slugify } from "@/lib/format";
import { topicSlug, outletSlug } from "@/lib/lookup";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
};

function weightedBias(stories: Awaited<ReturnType<typeof listStoriesByTopicSlug>>) {
  let weight = 0;
  let left = 0;
  let center = 0;
  let right = 0;

  for (const story of stories) {
    const w = story.coverage?.totalSources ?? story.sourceCount ?? 0;
    if (!Number.isFinite(w) || w <= 0) continue;
    weight += w;
    left += (story.bias.left / 100) * w;
    center += (story.bias.center / 100) * w;
    right += (story.bias.right / 100) * w;
  }

  if (weight <= 0) return { left: 0, center: 0, right: 0 };

  const raw = {
    left: Math.round((left / weight) * 100),
    center: Math.round((center / weight) * 100),
    right: Math.round((right / weight) * 100),
  };
  const sum = raw.left + raw.center + raw.right;
  if (sum === 100) return raw;
  return {
    left: Math.max(0, Math.min(100, raw.left)),
    center: Math.max(0, Math.min(100, raw.center)),
    right: Math.max(0, Math.min(100, 100 - raw.left - raw.center)),
  };
}

export default async function InterestPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { edition } = await searchParams;
  const stories = await listStoriesByTopicSlug(slug, { edition: edition?.trim() || undefined });

  if (stories.length === 0) return notFound();

  const displayTag =
    stories
      .flatMap((s) => s.tags)
      .find((tag) => topicSlug(tag).toLowerCase() === slug.toLowerCase()) || slug;

  const lead = stories[0];
  const bias = weightedBias(stories);
  const topOutlets = Array.from(
    new Map(
      stories
        .flatMap((story) => story.sources.map((src) => src.outlet))
        .map((outlet) => [outletSlug(outlet), outlet] as const),
    ).values(),
  ).slice(0, 18);

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.75rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(1.6rem, 4vw, 2.3rem)" }}>
            {displayTag}
          </h1>
          <FollowToggle kind="topic" slug={slugify(slug)} label={displayTag} variant="pill" />
        </div>
        <div className="story-meta">
          {stories.length} stories • Updated {prettyDate(lead.updatedAt)}
        </div>
        <BiasBar story={{ ...lead, bias }} showLabels={true} />
        <div className="chip-row">
          <Link className="pill" href="/">
            Back to Home
          </Link>
          {topOutlets.map((outlet) => (
            <Link key={outletSlug(outlet)} className="pill" href={`/source/${outletSlug(outlet)}`}>
              {outlet}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid" style={{ marginTop: "1rem" }}>
        {stories.slice(0, 30).map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </section>
    </main>
  );
}
