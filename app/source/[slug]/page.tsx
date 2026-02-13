import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryCard } from "@/components/StoryCard";
import { FollowToggle } from "@/components/FollowToggle";
import { OutletAvatar } from "@/components/OutletAvatar";
import { listStoriesByOutletSlug } from "@/lib/store";
import { prettyDate, slugify } from "@/lib/format";
import { outletSlug, sourceMatchesOutletSlug } from "@/lib/lookup";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} • Sources • OpenGroundNews`, description: `Coverage and stories for source: ${slug}.` };
}

export default async function SourcePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { edition } = await searchParams;
  const stories = await listStoriesByOutletSlug(slug, { edition: edition?.trim() || undefined });
  if (stories.length === 0) return notFound();

  const outlet = await db.outlet
    .findUnique({
      where: { slug },
      select: {
        name: true,
        logoUrl: true,
        websiteUrl: true,
        description: true,
        country: true,
        foundedYear: true,
        biasRating: true,
        bias: true,
        factuality: true,
        ownership: true,
        lastEnrichedAt: true,
      },
    })
    .catch(() => null);
  const relatedByBias = await db.outlet
    .findMany({
      where: {
        slug: { not: slug },
        biasRating: outlet?.biasRating || undefined,
      },
      select: { slug: true, name: true, biasRating: true },
      orderBy: { name: "asc" },
      take: 8,
    })
    .catch(() => []);
  const alsoCovers = Array.from(
    stories
      .flatMap((story) => story.tags || [])
      .reduce((acc, tag) => {
        const clean = String(tag || "").trim();
        if (!clean) return acc;
        acc.set(clean, (acc.get(clean) || 0) + 1);
        return acc;
      }, new Map<string, number>())
      .entries(),
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10);

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

  const biasRatingLabel = String(outlet?.biasRating || "unknown").replace(/_/g, "-");
  const inferredBias = (() => {
    const ranked = [
      { key: "left", value: biasCounts.left },
      { key: "center", value: biasCounts.center },
      { key: "right", value: biasCounts.right },
    ].sort((a, b) => b.value - a.value);
    return ranked[0]?.value > 0 ? ranked[0].key : "unknown";
  })();
  const displayBiasRating = biasRatingLabel === "unknown" ? inferredBias : biasRatingLabel;
  const factualityLabel = String(outlet?.factuality || "unknown").replace(/_/g, "-");
  const websiteFromSample =
    outlet?.websiteUrl ||
    samples
      .map((source) => {
        try {
          const url = new URL(source.url);
          return `${url.protocol}//${url.hostname}`;
        } catch {
          return "";
        }
      })
      .find(Boolean);
  const ownershipLabel = (outlet?.ownership || "").trim() || "Unlabeled";

  return (
    <main className="container u-page-pad">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep" aria-hidden="true">/</span>
        <span className="breadcrumb-current">Source</span>
      </nav>

      <section className="panel u-grid u-grid-gap-08">
        <div className="section-title u-pt-0">
          <div className="u-flex u-flex-gap-065 u-items-center">
            <span className="topic-avatar" aria-hidden="true">
              <OutletAvatar
                outlet={displayOutlet}
                logoUrl={String(outlet?.logoUrl || "")}
                websiteUrl={String(outlet?.websiteUrl || "")}
                className="u-avatar-28"
              />
            </span>
            <h1 className="topic-page-title">
              {displayOutlet}
            </h1>
          </div>
          <FollowToggle kind="outlet" slug={slug} label={displayOutlet} variant="pill" />
        </div>
        <div className="story-meta">
          {stories.length} stories • {samples.length} source cards • {latestSeen ? `Latest source: ${prettyDate(latestSeen)}` : "Latest source: unknown"}
        </div>
        <div className="source-profile" id="bias-ratings">
          <div className="source-profile-row">
            <div className="source-profile-label">Bias rating</div>
            <div className="source-profile-value">
              <span className="bias-pill">{displayBiasRating}</span>
              {displayBiasRating !== biasRatingLabel ? <span className="story-meta">inferred from source cards</span> : null}
            </div>
          </div>
          <div className="source-profile-row">
            <div className="source-profile-label">Factuality</div>
            <div className="source-profile-value">
              <span className="bias-pill" title={factualityLabel === "unknown" ? "This outlet has not been assessed yet." : undefined}>
                {factualityLabel === "unknown" ? "not-rated" : factualityLabel}
              </span>
            </div>
          </div>
          <div className="source-profile-row">
            <div className="source-profile-label">Ownership</div>
            <div className="source-profile-value">{ownershipLabel}</div>
          </div>
          <div className="source-profile-row">
            <div className="source-profile-label">Website</div>
            <div className="source-profile-value">
              {websiteFromSample ? (
                <a href={String(websiteFromSample)} target="_blank" rel="noreferrer">
                  {String(websiteFromSample)}
                </a>
              ) : (
                <span className="story-meta">Unknown</span>
              )}
            </div>
          </div>
          <div className="source-profile-row">
            <div className="source-profile-label">Country</div>
            <div className="source-profile-value">{outlet?.country || <span className="story-meta">Unknown</span>}</div>
          </div>
          <div className="source-profile-row">
            <div className="source-profile-label">Founded</div>
            <div className="source-profile-value">
              {typeof outlet?.foundedYear === "number" ? outlet.foundedYear : <span className="story-meta">Unknown</span>}
            </div>
          </div>
        </div>

        <div className="source-biasbar" aria-label="Coverage distribution (tracked cards)">
          <div className="bias-mini-bar">
            <span className="seg seg-left" style={{ width: `${samples.length ? Math.round((biasCounts.left / samples.length) * 100) : 0}%` }} />
            <span className="seg seg-center" style={{ width: `${samples.length ? Math.round((biasCounts.center / samples.length) * 100) : 0}%` }} />
            <span className="seg seg-right" style={{ width: `${samples.length ? Math.round((biasCounts.right / samples.length) * 100) : 0}%` }} />
          </div>
          <div className="bias-mini-meta">
            <span className="bias-meta-left">L {biasCounts.left}</span>
            <span className="bias-meta-center">C {biasCounts.center}</span>
            <span className="bias-meta-right">R {biasCounts.right}</span>
          </div>
        </div>
      </section>

      <section className="topic-shell u-mt-1">
        <div className="u-grid u-grid-gap-085">
          <section className="panel u-grid u-grid-gap-06">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">About this source</h2>
              <span className="story-meta">{outlet?.lastEnrichedAt ? `Enriched ${prettyDate(outlet.lastEnrichedAt.toISOString())}` : "Not enriched yet"}</span>
            </div>
            <p className="story-meta u-m0">
              {outlet?.description
                ? outlet.description
                : "Description unavailable. This profile will be enriched as more source metadata is collected."}
            </p>
          </section>

          <section className="panel">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Coverage Samples</h2>
              <span className="story-meta">{Math.min(samples.length, 30)} shown</span>
            </div>
            <div className="source-list">
              {samples.slice(0, 30).map((src) => (
                <article key={src.id} className="source-item">
                  <div className="source-head">
                    <div className="source-outlet">
                      <OutletAvatar
                        outlet={src.outlet}
                        logoUrl={src.logoUrl}
                        sourceUrl={src.url}
                        websiteUrl={src.websiteUrl || ""}
                        className="source-logo"
                        fallbackClassName="source-logo source-logo-fallback"
                      />
                      <div className="u-grid u-grid-gap-008">
                        <strong>{src.outlet}</strong>
                        <span className="story-meta">{src.publishedAt ? prettyDate(src.publishedAt) : "Unknown date"}</span>
                      </div>
                    </div>
                    <div className="chip-row source-chip-row">
                      <span className="chip">{src.bias === "unknown" ? "Unclassified" : src.bias}</span>
                      <span className="chip">{src.factuality === "unknown" ? "Not rated" : src.factuality}</span>
                    </div>
                  </div>
                  <p className="story-summary source-excerpt">{src.excerpt}</p>
                  <div className="u-flex u-flex-gap-05 u-wrap">
                    <a className="btn" href={src.url} target="_blank" rel="noreferrer">
                      Open Original
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid">
            {stories.slice(0, 30).map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </section>
        </div>

        <aside className="feed-rail sticky-rail">
          <section className="panel">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Similar Bias</h2>
              <span className="story-meta">{relatedByBias.length}</span>
            </div>
            <ul className="topic-list">
              {relatedByBias.map((rel) => (
                <li key={rel.slug} className="topic-item">
                  <Link href={`/source/${encodeURIComponent(rel.slug)}`} className="u-no-underline">
                    {rel.name}
                  </Link>
                  <span className="bias-pill">{String(rel.biasRating || "unknown").replace(/_/g, "-")}</span>
                </li>
              ))}
              {relatedByBias.length === 0 ? <li className="story-meta">No similar-bias sources found.</li> : null}
            </ul>
          </section>

          <section className="panel">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Also Covers</h2>
              <span className="story-meta">Top tags</span>
            </div>
            <div className="chip-row">
              {alsoCovers.map(([tag, count]) => (
                <Link key={tag} className="pill" href={`/interest/${encodeURIComponent(slugify(tag))}`}>
                  {tag} ({count})
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
