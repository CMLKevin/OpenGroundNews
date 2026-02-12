"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container u-page-pad-error">
      <section className="panel u-grid u-grid-gap-07">
        <h1 className="u-m0 u-font-serif">Something went wrong</h1>
        <p className="story-meta u-m0">
          We hit an unexpected issue while rendering this page.
        </p>
        <div className="chip-row">
          <button className="btn" type="button" onClick={() => reset()}>
            Retry
          </button>
          <Link className="btn" href="/">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}

