import { BlindspotStoryCard } from "@/components/BlindspotStoryCard";
import { BlindspotHeader } from "@/components/BlindspotHeader";
import { listStories } from "@/lib/store";
import { computeBlindspotInfo } from "@/lib/blindspot";

export const dynamic = "force-dynamic";

type BlindspotProps = {
  searchParams: Promise<{ edition?: string; scope?: string; filter?: string; page?: string }>;
};

export default async function BlindspotPage({ searchParams }: BlindspotProps) {
  const { edition, scope, filter, page } = await searchParams;
  const normalizedScope = (scope || "").toLowerCase();
  const useInternational = normalizedScope === "international";
  const normalizedFilter = (filter || "all").toLowerCase();
  const pageNumber = Math.max(1, Number(page || 1) || 1);
  const PAGE_SIZE = 12;
  const stories = await listStories({
    view: "blindspot",
    limit: 200,
    edition: useInternational ? undefined : edition?.trim() || undefined,
  });

  const candidates = stories
    .map((story) => ({ story, info: computeBlindspotInfo(story) }))
    .filter(({ info }) => info.isBlindspotCandidate);

  const forLeft = candidates.filter(({ info }) => info.column === "for-left").map(({ story }) => story);
  const forRight = candidates.filter(({ info }) => info.column === "for-right").map(({ story }) => story);

  const showLeft = normalizedFilter === "all" || normalizedFilter === "left";
  const showRight = normalizedFilter === "all" || normalizedFilter === "right";

  const visibleCount = pageNumber * PAGE_SIZE;
  const forLeftVisible = forLeft.slice(0, visibleCount);
  const forRightVisible = forRight.slice(0, visibleCount);
  const hasMore =
    (showLeft && forLeftVisible.length < forLeft.length) || (showRight && forRightVisible.length < forRight.length);

  const hrefFor = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (edition) params.set("edition", edition);
    if (useInternational) params.set("scope", "international");
    if (normalizedFilter && normalizedFilter !== "all") params.set("filter", normalizedFilter);
    if (pageNumber > 1) params.set("page", String(pageNumber));
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const s = params.toString();
    return `/blindspot${s ? `?${s}` : ""}`;
  };

  return (
    <main className="container u-page-pad">
      <section className="panel blindspot-hero u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <BlindspotHeader
            subtitle="Stories that one side barely sees."
            scopeLabel={useInternational ? "International blindspots" : "Edition blindspots"}
          />
        </div>

        <div className="panel blindspot-intro-banner u-p-075 u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">New to the Blindspot feed?</h2>
            <a className="btn" href="/blindspot/about">
              Find out more
            </a>
          </div>
          <p className="story-meta u-m0">
            A Blindspot is a story with a heavy coverage skew: one side talks about it, the other barely does.
          </p>
        </div>

        <div className="panel blindspot-newsletter-banner u-p-075 u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Blindspot Report newsletter</h2>
            <span className="story-meta">Email updates</span>
          </div>
          <a className="btn" href="/newsletters/blindspot-report">
            Sign up for the Blindspot Report newsletter
          </a>
        </div>

        <div className="chip-row">
          <a className={`pill ${useInternational ? "" : "perspective-btn is-active"}`} href={edition ? `/blindspot?edition=${encodeURIComponent(edition)}` : "/blindspot"}>
            Edition
          </a>
          <a className={`pill ${useInternational ? "perspective-btn is-active" : ""}`} href="/blindspot?scope=international">
            International blindspots
          </a>
        </div>

        <div className="chip-row" aria-label="Blindspot filters">
          <a className={`pill ${normalizedFilter === "all" ? "perspective-btn is-active" : ""}`} href={hrefFor({ filter: undefined })}>
            All
          </a>
          <a className={`pill ${normalizedFilter === "left" ? "perspective-btn is-active" : ""}`} href={hrefFor({ filter: "left" })}>
            For the Left
          </a>
          <a className={`pill ${normalizedFilter === "right" ? "perspective-btn is-active" : ""}`} href={hrefFor({ filter: "right" })}>
            For the Right
          </a>
        </div>
      </section>

      <section className="blindspot-columns u-mt-1">
        {showLeft ? (
        <div className="blindspot-col">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">For the Left</h2>
          </div>
          <p className="story-meta u-mb-07">
            News stories that had little to no reporting on the Left.
          </p>
          <div className="grid u-grid-cols-2-gap-085">
            {forLeft.length === 0 ? (
              <section className="panel">
                <h3 className="u-mt-0">No blindspot stories found for the left.</h3>
                <p className="story-meta u-m0">
                  Try switching to International blindspots or check back after the next ingestion sync.
                </p>
              </section>
            ) : (
              forLeftVisible.map((story) => <BlindspotStoryCard key={story.id} story={story} />)
            )}
          </div>
        </div>
        ) : null}

        {showRight ? (
        <div className="blindspot-col">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">For the Right</h2>
          </div>
          <p className="story-meta u-mb-07">
            News stories that had little to no reporting on the Right.
          </p>
          <div className="grid u-grid-cols-2-gap-085">
            {forRight.length === 0 ? (
              <section className="panel">
                <h3 className="u-mt-0">No blindspot stories found for the right.</h3>
                <p className="story-meta u-m0">
                  Try switching to International blindspots or check back after the next ingestion sync.
                </p>
              </section>
            ) : (
              forRightVisible.map((story) => <BlindspotStoryCard key={story.id} story={story} />)
            )}
          </div>
        </div>
        ) : null}
      </section>

      {hasMore ? (
        <div className="u-flex u-justify-center u-mt-12">
          <a className="btn" href={hrefFor({ page: String(pageNumber + 1) })}>
            More stories
          </a>
        </div>
      ) : null}
    </main>
  );
}
