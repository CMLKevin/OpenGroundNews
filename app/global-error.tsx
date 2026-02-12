"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <main className="container u-page-pad-error">
          <section className="panel u-grid u-grid-gap-07">
            <h1 className="u-m0 u-font-serif">OpenGroundNews is temporarily unavailable</h1>
            <p className="story-meta u-m0">
              Please retry in a moment.
            </p>
            <button className="btn" type="button" onClick={() => reset()}>
              Retry
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

