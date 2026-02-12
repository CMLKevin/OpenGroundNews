import { BiasPlayground } from "@/components/BiasPlayground";

export default function RatingSystemPage() {
  return (
    <main className="container" style={{ padding: "1.1rem 0 2rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.7rem" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>OpenGroundNews Rating System</h1>
        <p style={{ margin: 0 }}>
          Ratings are transparent and reproducible. Each source article receives a bias bucket and factuality label,
          then story-level distribution is computed from source aggregation.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.35rem" }}>
          <li>
            <strong>Bias buckets:</strong> <code>left</code>, <code>center</code>, <code>right</code>
          </li>
          <li>
            <strong>Factuality:</strong> <code>very-high</code>, <code>high</code>, <code>mixed</code>, <code>low</code>,{" "}
            <code>very-low</code>, <code>unknown</code>
          </li>
          <li>
            <strong>Ownership:</strong> Organization label tracked per outlet
          </li>
        </ul>
        <p className="note" style={{ margin: 0 }}>
          Sources without reliable metadata are labeled <code>unknown</code> instead of inferring values from domain
          names.
        </p>
      </section>

      <div style={{ marginTop: "1rem" }}>
        <BiasPlayground />
      </div>
    </main>
  );
}
