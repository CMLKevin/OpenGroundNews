import { SubscribePlans } from "@/components/SubscribePlans";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ success?: string; canceled?: string }>;
};

export default async function SubscribePage({ searchParams }: Props) {
  const { success, canceled } = await searchParams;

  return (
    <main className="container u-page-pad-compact">
      <section className="hero">
        <div className="hero-panel">
          <h1>Project Support</h1>
          <p>
            OpenGroundNews is an open project focused on data quality, perspective coverage, and transparent tooling.
            This page exists for contribution guidance, not subscriptions.
          </p>
        </div>
        <div className="hero-panel">
          <p className="note u-m0">
            If you want to help: run ingestion regularly, report scraper regressions, and share problematic article
            URLs so we can improve extraction quality.
          </p>
        </div>
      </section>

      {success ? (
        <p className="note u-mt-1">
          No checkout flow is used in this project.
        </p>
      ) : null}
      {canceled ? (
        <p className="note u-mt-1">
          No checkout flow is used in this project.
        </p>
      ) : null}

      <div className="u-mt-1">
        <SubscribePlans />
      </div>
    </main>
  );
}
