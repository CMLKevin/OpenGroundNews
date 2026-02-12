import { BiasPlayground } from "@/components/BiasPlayground";
import { db } from "@/lib/db";

const RATING_ROWS = [
  { key: "far-left", label: "Far Left", color: "#802727" },
  { key: "left", label: "Left", color: "#995252" },
  { key: "lean-left", label: "Lean Left", color: "#C09393" },
  { key: "center", label: "Center", color: "#DADBD6" },
  { key: "lean-right", label: "Lean Right", color: "#90A4C3" },
  { key: "right", label: "Right", color: "#4D6D9E" },
  { key: "far-right", label: "Far Right", color: "#204986" },
] as const;

async function loadExamples() {
  try {
    const rows = await Promise.all(
      RATING_ROWS.map(async (r) => {
        const prismaKey =
          r.key === "far-left"
            ? "far_left"
            : r.key === "lean-left"
              ? "lean_left"
              : r.key === "lean-right"
                ? "lean_right"
                : r.key === "far-right"
                  ? "far_right"
                  : r.key;
        const outlets = await db.outlet.findMany({
          where: { biasRating: prismaKey as any },
          orderBy: { name: "asc" },
          take: 3,
          select: { name: true, slug: true },
        });
        return { key: r.key, outlets };
      }),
    );
    return new Map(rows.map((r) => [r.key, r.outlets]));
  } catch {
    return new Map<string, Array<{ name: string; slug: string }>>();
  }
}

export default async function RatingSystemPage() {
  const examples = await loadExamples();
  return (
    <main className="container" style={{ padding: "1.1rem 0 2rem" }}>
      <section className="panel" style={{ display: "grid", gap: "0.75rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Rating System</h1>
          <span className="story-meta">Methodology</span>
        </div>
        <p style={{ margin: 0, maxWidth: "75ch" }}>
          OpenGroundNews mirrors the Ground News-style media bias spectrum and shows you how story coverage changes
          across the political landscape. Ratings are designed to be auditable: we store per-source metadata and compute
          distributions from tracked source cards.
        </p>
        <div className="kpi-strip">
          <div className="kpi">
            <span>Bias spectrum</span>
            <strong style={{ fontSize: "1rem" }}>7-category rating</strong>
          </div>
          <div className="kpi">
            <span>Story coverage</span>
            <strong style={{ fontSize: "1rem" }}>Left / Center / Right</strong>
          </div>
          <div className="kpi">
            <span>Factuality</span>
            <strong style={{ fontSize: "1rem" }}>Very high .. very low</strong>
          </div>
          <div className="kpi">
            <span>Ownership</span>
            <strong style={{ fontSize: "1rem" }}>Publisher entity</strong>
          </div>
        </div>
        <p className="note" style={{ margin: 0 }}>
          Sources without reliable metadata are labeled <code>unknown</code>. We avoid guessing bias from domain names.
        </p>
      </section>

      <section className="panel" style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>Bias Categories</h2>
        </div>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {RATING_ROWS.map((r) => {
            const outletExamples = examples.get(r.key) || [];
            return (
              <div key={r.key} style={{ display: "grid", gap: "0.25rem" }}>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: r.color,
                      border: "1px solid rgba(166,166,161,0.65)",
                      flex: "0 0 auto",
                    }}
                  />
                  <strong>{r.label}</strong>
                </div>
                <div className="story-meta" style={{ marginLeft: "1.6rem" }}>
                  {outletExamples.length ? (
                    <>
                      Examples:{" "}
                      {outletExamples.map((o, idx) => (
                        <span key={o.slug}>
                          {o.name}
                          {idx < outletExamples.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </>
                  ) : (
                    <>Examples: unavailable in current dataset.</>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>How Ratings Are Assigned</h2>
        </div>
        <p className="story-meta" style={{ margin: 0 }}>
          Bias ratings, factuality ratings, and ownership labels are sourced from the Ground News metadata layer when
          available. When a signal is missing or ambiguous, we keep it as <code>unknown</code> rather than guessing.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.35rem" }}>
          <li>
            <strong>Bias spectrum</strong>: Far Left .. Far Right (7 categories)
          </li>
          <li>
            <strong>Story bias bars</strong>: aggregated Left/Center/Right distribution of tracked source cards
          </li>
          <li>
            <strong>Blindspot</strong>: flagged when coverage is heavily skewed to one side
          </li>
        </ul>
      </section>

      <div style={{ marginTop: "1rem" }}>
        <BiasPlayground />
      </div>
    </main>
  );
}
