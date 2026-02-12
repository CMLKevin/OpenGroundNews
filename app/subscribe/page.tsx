import { SubscribePlans } from "@/components/SubscribePlans";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ success?: string; canceled?: string }>;
};

export default async function SubscribePage({ searchParams }: Props) {
  const { success, canceled } = await searchParams;

  return (
    <main className="container" style={{ padding: "1.1rem 0 2rem" }}>
      <section className="hero">
        <div className="hero-panel">
          <h1>Support OpenGroundNews</h1>
          <p>
            OpenGroundNews is building full Ground News-style feature parity, but with open infrastructure and
            transparent ingestion. Plans are presented in the familiar 3-tier layout, but payments are intentionally
            disabled for now.
          </p>
        </div>
        <div className="hero-panel">
          <p className="note" style={{ margin: 0 }}>
            If you want to help: run ingestion regularly, report scraper regressions, and share problematic article URLs
            so we can improve the archive and fallback extractors.
          </p>
        </div>
      </section>

      {success ? (
        <p className="note" style={{ marginTop: "1rem" }}>
          Payments are disabled. This message is kept for link compatibility.
        </p>
      ) : null}
      {canceled ? (
        <p className="note" style={{ marginTop: "1rem" }}>
          Payments are disabled. This message is kept for link compatibility.
        </p>
      ) : null}

      <div style={{ marginTop: "1rem" }}>
        <SubscribePlans />
      </div>
    </main>
  );
}
