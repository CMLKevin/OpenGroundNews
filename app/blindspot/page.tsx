import { BlindspotStoryCard } from "@/components/BlindspotStoryCard";
import { BlindspotHeader } from "@/components/BlindspotHeader";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { listStories } from "@/lib/store";
import { computeBlindspotInfo } from "@/lib/blindspot";

export const dynamic = "force-dynamic";

type BlindspotProps = {
  searchParams: Promise<{ edition?: string; scope?: string; filter?: string }>;
};

export default async function BlindspotPage({ searchParams }: BlindspotProps) {
  const { edition, scope, filter } = await searchParams;
  const normalizedScope = (scope || "").toLowerCase();
  const useInternational = normalizedScope === "international";
  const normalizedFilter = (filter || "all").toLowerCase();
  const stories = await listStories({
    view: "blindspot",
    limit: 30,
    edition: useInternational ? undefined : edition?.trim() || undefined,
  });

  const candidates = stories
    .map((story) => ({ story, info: computeBlindspotInfo(story) }))
    .filter(({ info }) => info.isBlindspotCandidate);

  const forLeft = candidates.filter(({ info }) => info.column === "for-left").map(({ story }) => story);
  const forRight = candidates.filter(({ info }) => info.column === "for-right").map(({ story }) => story);

  const showLeft = normalizedFilter === "all" || normalizedFilter === "left";
  const showRight = normalizedFilter === "all" || normalizedFilter === "right";

  const hrefFor = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (edition) params.set("edition", edition);
    if (useInternational) params.set("scope", "international");
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const s = params.toString();
    return `/blindspot${s ? `?${s}` : ""}`;
  };

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel blindspot-hero" style={{ display: "grid", gap: "0.7rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <BlindspotHeader subtitle={useInternational ? "International blindspots" : "Edition blindspots"} />
        </div>

        <div className="panel" style={{ padding: "0.75rem", display: "grid", gap: "0.6rem" }}>
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h2 style={{ margin: 0 }}>New to Blindspot?</h2>
            <a className="btn" href="/rating-system">
              Find out more
            </a>
          </div>
          <p className="story-meta" style={{ margin: 0 }}>
            A Blindspot is a story with a heavy coverage skew: one side talks about it, the other barely does.
          </p>
        </div>

        <div className="panel" style={{ padding: "0.75rem", display: "grid", gap: "0.6rem" }}>
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h2 style={{ margin: 0 }}>Blindspot Report newsletter</h2>
            <span className="story-meta">Email updates</span>
          </div>
          <NewsletterSignup list="blindspot" />
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

      <section className="blindspot-columns" style={{ marginTop: "1rem" }}>
        {showLeft ? (
        <div className="blindspot-col">
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h2 style={{ margin: 0 }}>For the Left</h2>
            <span className="story-meta">{forLeft.length}</span>
          </div>
          <p className="story-meta" style={{ margin: "0 0 0.7rem" }}>
            News stories that had little to no reporting on the Left.
          </p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.85rem" }}>
            {forLeft.length === 0 ? (
              <section className="panel">
                <h3 style={{ marginTop: 0 }}>No blindspot stories found for the left.</h3>
                <p className="story-meta" style={{ margin: 0 }}>
                  Try switching to International blindspots or check back after the next ingestion sync.
                </p>
              </section>
            ) : (
              forLeft.map((story) => <BlindspotStoryCard key={story.id} story={story} />)
            )}
          </div>
        </div>
        ) : null}

        {showRight ? (
        <div className="blindspot-col">
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h2 style={{ margin: 0 }}>For the Right</h2>
            <span className="story-meta">{forRight.length}</span>
          </div>
          <p className="story-meta" style={{ margin: "0 0 0.7rem" }}>
            News stories that had little to no reporting on the Right.
          </p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.85rem" }}>
            {forRight.length === 0 ? (
              <section className="panel">
                <h3 style={{ marginTop: 0 }}>No blindspot stories found for the right.</h3>
                <p className="story-meta" style={{ margin: 0 }}>
                  Try switching to International blindspots or check back after the next ingestion sync.
                </p>
              </section>
            ) : (
              forRight.map((story) => <BlindspotStoryCard key={story.id} story={story} />)
            )}
          </div>
        </div>
        ) : null}
      </section>
    </main>
  );
}
