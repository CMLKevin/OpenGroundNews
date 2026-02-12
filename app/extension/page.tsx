export const dynamic = "force-dynamic";

export default function ExtensionPage() {
  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.7rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Browser Extension</h1>
          <span className="story-meta">Available</span>
        </div>
        <p style={{ margin: 0, maxWidth: "75ch" }}>
          OpenGroundNews ships a minimal open-source Chrome/Edge extension (MV3) that lets you open the current tab in the
          OpenGroundNews reader or search for coverage instantly.
        </p>
        <p className="note" style={{ margin: 0 }}>
          Install locally: open <code>chrome://extensions</code> -&gt; enable Developer mode -&gt; “Load unpacked” -&gt; select the
          <code>extension/</code> folder in this repo.
        </p>
        <p className="story-meta" style={{ margin: 0 }}>
          The extension opens <code>/reader?url=...</code> (requires sign-in) or <code>/search?q=...</code> on your OpenGroundNews base URL.
        </p>
      </section>
    </main>
  );
}
