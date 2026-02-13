import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container u-page-pad-error">
      <section className="panel u-grid u-grid-gap-07">
        <h1 className="u-m0 u-font-serif">Page not found</h1>
        <p className="story-meta u-m0">
          The page may have moved, or the address may be incorrect.
        </p>
        <div className="chip-row">
          <Link className="btn" href="/">
            Back to Home
          </Link>
          <Link className="btn" href="/search">
            Search stories
          </Link>
        </div>
      </section>
    </main>
  );
}
