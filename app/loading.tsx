export default function RootLoading() {
  return (
    <main className="container u-page-pad-loading">
      <section className="panel u-grid u-grid-gap-08">
        <div className="loading-block loading-line-lg" />
        <div className="grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <article key={idx} className="panel loading-card">
              <div className="loading-block loading-line-md" />
              <div className="loading-block loading-line-lg" />
              <div className="loading-block loading-line-sm" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

