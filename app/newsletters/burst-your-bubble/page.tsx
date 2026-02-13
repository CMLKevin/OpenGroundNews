import { NewsletterSignup } from "@/components/NewsletterSignup";

export const dynamic = "force-dynamic";

export default function BurstYourBubbleNewsletterPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">Burst Your Bubble</h1>
          <span className="story-meta">Twice weekly</span>
        </div>
        <p className="story-meta u-m0">Stories selected to challenge your media comfort zone with left, center, and right perspectives.</p>
        <NewsletterSignup list="burst-your-bubble" />
      </section>
    </main>
  );
}
