import Link from "next/link";

export function SubscribePlans() {
  return (
    <div className="u-grid u-grid-gap-1">
      <section className="panel u-grid u-grid-gap-075">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Support The Project</h2>
          <span className="story-meta">Open-source, non-commercial</span>
        </div>
        <p className="story-meta u-m0">
          OpenGroundNews is not selling plans. If you want to help, contribute code, run ingestion checks, and report
          data-quality issues.
        </p>
        <div className="chip-row">
          <Link className="btn" href="/admin">
            Run ingestion checks
          </Link>
          <Link className="btn" href="/get-started">
            Improve your local setup
          </Link>
        </div>
      </section>

      <section className="panel u-grid u-grid-gap-065">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Contribution Priorities</h2>
        </div>
        <ul className="u-m0 u-pl-11 u-grid u-grid-gap-045">
          <li>Ingestion reliability and deduplication accuracy.</li>
          <li>Topic mapping quality and source metadata enrichment.</li>
          <li>Accessibility and performance across mobile and desktop.</li>
          <li>Regression tests for parity-critical UX flows.</li>
        </ul>
      </section>
    </div>
  );
}

