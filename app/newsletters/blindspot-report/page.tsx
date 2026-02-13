import { NewsletterSignup } from "@/components/NewsletterSignup";

export const dynamic = "force-dynamic";

export default function BlindspotNewsletterPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">Blindspot Report</h1>
          <span className="story-meta">Weekly</span>
        </div>
        <p className="story-meta u-m0">A weekly roundup of stories one side missed, with coverage context and source breakdowns.</p>
        <NewsletterSignup list="blindspot" />
      </section>
    </main>
  );
}
