import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">About OpenGroundNews</h1>
          <Link className="btn" href="/rating-system">
            How ratings work
          </Link>
        </div>
        <p className="u-m0 u-text-soft u-maxw-75ch">
          OpenGroundNews is an open-source, bias-aware news reader focused on coverage comparison. We aggregate story
          coverage across outlets, expose left/center/right distribution, and highlight blindspots where one side of
          the media ecosystem underreports a story.
        </p>
        <div className="u-grid u-grid-gap-05">
          <h2 className="u-m0">What you can do here</h2>
          <ul className="topic-list">
            <li className="topic-item">
              <span className="topic-avatar">1</span>
              <span>Compare source overlap and bias distribution for any outlet pair.</span>
            </li>
            <li className="topic-item">
              <span className="topic-avatar">2</span>
              <span>Track blindspot stories and subscribe to blindspot-aware briefings.</span>
            </li>
            <li className="topic-item">
              <span className="topic-avatar">3</span>
              <span>Personalize your feed with followed topics and sources.</span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
