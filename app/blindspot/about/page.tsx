import Link from "next/link";

export const dynamic = "force-dynamic";

export default function BlindspotAboutPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">About Blindspot</h1>
          <Link className="btn" href="/blindspot">Open Blindspot Feed</Link>
        </div>
        <p className="story-meta u-m0">
          Blindspot stories highlight major coverage gaps where one side of the media ecosystem reports heavily and the other side barely covers the same event.
        </p>
        <div className="u-grid u-grid-gap-05">
          <h2 className="u-m0">How it works</h2>
          <ul className="topic-list">
            <li className="topic-item"><span className="topic-avatar">1</span><span>We aggregate coverage from many outlets per story.</span></li>
            <li className="topic-item"><span className="topic-avatar">2</span><span>We compute left, center, and right coverage distribution.</span></li>
            <li className="topic-item"><span className="topic-avatar">3</span><span>Stories with extreme skew are flagged as Blindspot candidates.</span></li>
          </ul>
        </div>
      </section>
    </main>
  );
}
