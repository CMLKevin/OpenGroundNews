export default function SubscribePage() {
  return (
    <main className="container" style={{ padding: "1.1rem 0 2rem" }}>
      <section className="hero">
        <div className="hero-panel">
          <h1>Support OpenGroundNews</h1>
          <p>
            OpenGroundNews is built to stay open. If you monetize, consider metered access features, API plans, and
            editorial tooling tiers rather than hard paywalls on public-interest reading.
          </p>
        </div>
        <div className="hero-panel">
          <div className="kpi-strip">
            <div className="kpi">
              <span>Community</span>
              <strong>Open</strong>
            </div>
            <div className="kpi">
              <span>Reader API</span>
              <strong>Ready</strong>
            </div>
            <div className="kpi">
              <span>Ingestion</span>
              <strong>CDP</strong>
            </div>
            <div className="kpi">
              <span>Archive</span>
              <strong>Fallback</strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
