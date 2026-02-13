export const dynamic = "force-dynamic";

export default function MethodologyPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-075">
        <div className="section-title u-pt-0">
          <h1 className="u-m0">Methodology</h1>
          <span className="story-meta">How OpenGroundNews works</span>
        </div>
        <p className="u-m0 u-lh-165">
          OpenGroundNews aggregates multiple publisher perspectives on the same story, normalizes source-level metadata,
          and computes coverage splits across the political spectrum. We preserve uncertainty labels when source metadata
          is unavailable and avoid inferring bias from domain names alone.
        </p>
        <div className="u-grid u-grid-gap-06">
          <section className="panel u-grid u-grid-gap-04">
            <h2 className="u-m0">Bias Ratings</h2>
            <p className="story-meta u-m0">
              We support seven-bucket source ratings (Far Left to Far Right) and three-bucket story distribution
              summaries (Left / Center / Right) derived from tracked source coverage.
            </p>
          </section>
          <section className="panel u-grid u-grid-gap-04">
            <h2 className="u-m0">Factuality and Ownership</h2>
            <p className="story-meta u-m0">
              Outlet factuality and ownership fields are persisted when available from structured source metadata. Missing
              fields remain explicitly labeled as unknown.
            </p>
          </section>
          <section className="panel u-grid u-grid-gap-04">
            <h2 className="u-m0">Blindspot Detection</h2>
            <p className="story-meta u-m0">
              Blindspot candidates are identified when coverage skew is strongly asymmetric between left and right
              coverage buckets after normalization.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
