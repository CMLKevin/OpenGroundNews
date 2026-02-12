import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryCard } from "@/components/StoryCard";
import { FollowToggle } from "@/components/FollowToggle";
import { listStoriesByOutletSlug } from "@/lib/store";
import { prettyDate } from "@/lib/format";
import { outletSlug, sourceMatchesOutletSlug } from "@/lib/lookup";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
};

export default async function SourcePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { edition } = await searchParams;
  const stories = await listStoriesByOutletSlug(slug, { edition: edition?.trim() || undefined });
  if (stories.length === 0) return notFound();

  const samples = stories.flatMap((story) => story.sources.filter((src) => sourceMatchesOutletSlug(src, slug)));
  const displayOutlet = samples[0]?.outlet || slug;
  const biasCounts = {
    left: samples.filter((s) => s.bias === "left").length,
    center: samples.filter((s) => s.bias === "center").length,
    right: samples.filter((s) => s.bias === "right").length,
    unknown: samples.filter((s) => s.bias === "unknown").length,
  };

  const latestSeen = samples
    .map((s) => s.publishedAt)
    .filter(Boolean)
    .sort((a, b) => +new Date(b as string) - +new Date(a as string))[0] as string | undefined;

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel" style={{ background: "#fff", display: "grid", gap: "0.8rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "clamp(1.55rem, 4vw, 2.2rem)" }}>
            {displayOutlet}
          </h1>
          <FollowToggle kind="outlet" slug={slug} label={displayOutlet} variant="pill" />
        </div>
        <div className="story-meta">
          {stories.length} stories • {samples.length} source cards • {latestSeen ? `Latest source: ${prettyDate(latestSeen)}` : "Latest source: unknown"}
        </div>
        <div className="chip-row">
          <span className="pill">Bias: L {biasCounts.left}</span>
          <span className="pill">C {biasCounts.center}</span>
          <span className="pill">R {biasCounts.right}</span>
          {biasCounts.unknown ? <span className="pill">Untracked {biasCounts.unknown}</span> : null}
          <Link className="pill" href="/">
            Back to Home
          </Link>
        </div>
      </section>

      <section className="panel" style={{ marginTop: "1rem", background: "#fff" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>Coverage Samples</h2>
          <span className="story-meta">{Math.min(samples.length, 30)} shown</span>
        </div>
        <div className="source-list">
          {samples.slice(0, 30).map((src) => (
            <article key={src.id} className="source-item">
              <div className="source-head">
                <div className="source-outlet">
                  {src.logoUrl ? (
                    <img src={src.logoUrl} alt={src.outlet} className="source-logo" />
                  ) : (
                    <span className="source-logo source-logo-fallback">{src.outlet.slice(0, 2).toUpperCase()}</span>
                  )}
                  <div style={{ display: "grid", gap: "0.08rem" }}>
                    <strong>{src.outlet}</strong>
                    <span className="story-meta">{src.publishedAt ? prettyDate(src.publishedAt) : "Unknown date"}</span>
                  </div>
                </div>
                <div className="chip-row source-chip-row">
                  <span className="chip">{src.bias}</span>
                  <span className="chip">{src.factuality}</span>
                </div>
              </div>
              <p className="story-summary source-excerpt">{src.excerpt}</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <a className="btn" href={src.url} target="_blank" rel="noreferrer">
                  Open Original
                </a>
              </div>
            </article>
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

