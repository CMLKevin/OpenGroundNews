export default function RatingSystemPage() {
  return (
    <main className="container" style={{ padding: "1.1rem 0 2rem" }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>OpenGroundNews Rating System</h1>
        <p>
          Ratings are transparent and reproducible. Each source article receives a bias bucket and factuality label,
          then story-level distribution is computed from source aggregation.
        </p>
        <ul>
          <li>
            <strong>Bias buckets:</strong> <code>left</code>, <code>center</code>, <code>right</code>
          </li>
          <li>
            <strong>Factuality:</strong> <code>high</code>, <code>mixed</code>, <code>low</code>
          </li>
          <li>
            <strong>Ownership:</strong> Organization label tracked per outlet
          </li>
        </ul>
        <p className="note">
          The default pipeline uses deterministic placeholder scoring from domain hashes. Replace with your own
          external ratings dataset for production-grade analysis.
        </p>
      </div>
    </main>
  );
}
