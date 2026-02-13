import { NewsletterSignup } from "@/components/NewsletterSignup";

export const dynamic = "force-dynamic";

export default function DailyGroundNewsletterPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">Daily Ground</h1>
          <span className="story-meta">Daily</span>
        </div>
        <p className="story-meta u-m0">Your daily briefing of top stories with bias distribution, source counts, and what changed overnight.</p>
        <NewsletterSignup list="daily-ground" />
      </section>
    </main>
  );
}
