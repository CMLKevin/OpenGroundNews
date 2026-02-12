export default function BlindspotLoading() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-08">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">Blindspot</h1>
          <span className="story-meta">Loading coverage...</span>
        </div>
        <div className="grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <article key={idx} className="panel loading-card u-minh-220">
              <div className="loading-block loading-line-lg" />
              <div className="loading-block loading-line-md" />
              <div className="loading-block loading-line-sm" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

