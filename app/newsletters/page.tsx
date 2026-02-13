import { NewsletterSignup } from "@/components/NewsletterSignup";

export const dynamic = "force-dynamic";

export default function NewslettersPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-075">
        <div className="section-title u-pt-0">
          <h1 className="u-m0">Newsletters</h1>
          <span className="story-meta">Bias-aware briefings</span>
        </div>
        <p className="u-m0 u-text-soft">
          Subscribe to editorial briefings built from your perspective preferences and coverage blindspots.
        </p>
      </section>

      <section className="grid u-mt-1">
        <section className="panel u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Daily Briefing</h2>
            <span className="story-meta">Every morning</span>
          </div>
          <NewsletterSignup list="daily" />
        </section>
        <section className="panel u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Blindspot Report</h2>
            <span className="story-meta">Twice weekly</span>
          </div>
          <NewsletterSignup list="blindspot" />
        </section>
        <section className="panel u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Local Watch</h2>
            <span className="story-meta">Weekly</span>
          </div>
          <NewsletterSignup list="local" />
        </section>
      </section>
    </main>
  );
}
