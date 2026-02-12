import { SubscribePlans } from "@/components/SubscribePlans";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ success?: string; canceled?: string }>;
};

export default async function SubscribePage({ searchParams }: Props) {
  const { success, canceled } = await searchParams;
  const stripeEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_YEARLY,
  );

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

      {success ? (
        <p className="note" style={{ marginTop: "1rem" }}>
          Subscription checkout completed. It may take a moment for your account to update.
        </p>
      ) : null}
      {canceled ? (
        <p className="note" style={{ marginTop: "1rem" }}>
          Checkout canceled.
        </p>
      ) : null}

      <div style={{ marginTop: "1rem" }}>
        <SubscribePlans stripeEnabled={stripeEnabled} />
      </div>
    </main>
  );
}
