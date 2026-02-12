export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.65rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Privacy Policy</h1>
          <span className="story-meta">Placeholder</span>
        </div>
        <p className="story-meta" style={{ margin: 0 }}>
          This is a development placeholder. Replace with your privacy policy before deploying publicly.
        </p>
      </section>
    </main>
  );
}

