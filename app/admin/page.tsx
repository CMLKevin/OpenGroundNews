import { getDashboardStats } from "@/lib/store";

export const dynamic = "force-dynamic";

const parityChecklist = [
  { feature: "Bias distribution on cards", status: "done" },
  { feature: "Blindspot feed", status: "done" },
  { feature: "Local feed section", status: "done" },
  { feature: "Perspective summary tabs", status: "done" },
  { feature: "Source sorting and filters (bias/factuality/ownership/paywall)", status: "done" },
  { feature: "Archive-first article reader with fallback", status: "done" },
  { feature: "Pricing/subscribe surface", status: "done" },
  { feature: "Edition selector", status: "done" },
  { feature: "User auth + follows", status: "planned" },
  { feature: "Podcast context panels", status: "planned" },
  { feature: "Mobile native app parity", status: "planned" },
];

export default async function AdminPage() {
  const stats = await getDashboardStats();

  return (
    <main className="container" style={{ padding: "1.1rem 0 2rem" }}>
      <div className="panel" style={{ display: "grid", gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>Ingestion + Parity Admin</h1>
        <div className="kpi-strip">
          <div className="kpi">
            <span>Stories</span>
            <strong>{stats.storyCount}</strong>
          </div>
          <div className="kpi">
            <span>Source Articles</span>
            <strong>{stats.sourceArticleCount}</strong>
          </div>
          <div className="kpi">
            <span>Unique Outlets</span>
            <strong>{stats.uniqueOutletCount}</strong>
          </div>
          <div className="kpi">
            <span>Archive Entries</span>
            <strong>{stats.archiveCacheCount}</strong>
          </div>
          <div className="kpi">
            <span>Last Mode</span>
            <strong style={{ fontSize: "0.95rem" }}>{stats.ingestion.lastMode ?? "n/a"}</strong>
          </div>
        </div>

        <p className="note">
          Trigger sync via API:<br />
          <code>curl -X POST -H "x-ogn-api-key: &lt;key&gt;" http://localhost:3000/api/ingest/groundnews</code>
        </p>

        <section className="panel" style={{ background: "#fff" }}>
          <h2 style={{ marginTop: 0 }}>Feature Parity Checklist</h2>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
            {parityChecklist.map((item) => (
              <li key={item.feature}>
                <strong>{item.status === "done" ? "[Done]" : "[Planned]"}</strong> {item.feature}
              </li>
            ))}
          </ul>
        </section>

        <div className="panel" style={{ background: "#fff" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(stats.ingestion, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}
