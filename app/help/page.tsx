import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">Help Center</h1>
          <a className="btn" href={`mailto:${process.env.NEXT_PUBLIC_OGN_SUPPORT_EMAIL || "support@opengroundnews.com"}`}>
            Contact Support
          </a>
        </div>

        <div className="u-grid u-grid-gap-05">
          <h2 className="u-m0">Frequently Asked Questions</h2>
          <div className="u-grid u-grid-gap-04">
            <article className="panel"><strong>How do follows work?</strong><p className="story-meta u-m0">Followed topics and sources tune your For You experience and notifications.</p></article>
            <article className="panel"><strong>How often is ingestion updated?</strong><p className="story-meta u-m0">The Ground News pipeline can be run manually from admin or scheduled externally.</p></article>
            <article className="panel"><strong>Why do some outlets show unknown ratings?</strong><p className="story-meta u-m0">Unknown means we have not yet enriched that outlet's bias/factuality profile.</p></article>
          </div>
        </div>

        <div className="chip-row">
          <Link className="btn" href="/search">Search stories</Link>
        </div>
      </section>
    </main>
  );
}
