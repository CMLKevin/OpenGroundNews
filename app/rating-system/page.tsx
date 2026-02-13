import { BiasPlayground } from "@/components/BiasPlayground";
import { db } from "@/lib/db";

const RATING_ROWS = [
  { key: "far-left", label: "Far Left" },
  { key: "left", label: "Left" },
  { key: "lean-left", label: "Lean Left" },
  { key: "center", label: "Center" },
  { key: "lean-right", label: "Lean Right" },
  { key: "right", label: "Right" },
  { key: "far-right", label: "Far Right" },
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
    <main className="container u-page-pad-compact">
      <section className="panel u-grid u-grid-gap-075">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">Rating System</h1>
          <span className="story-meta">Overview</span>
        </div>
        <p className="u-m0 u-maxw-75ch">
          OpenGroundNews mirrors the Ground News-style media bias spectrum and shows you how story coverage changes
          across the political landscape. Ratings are designed to be auditable: we store per-source metadata and compute
          distributions from tracked source cards.
        </p>
        <div className="kpi-strip">
          <div className="kpi">
            <span>Bias spectrum</span>
            <strong className="u-text-1">7-category rating</strong>
          </div>
          <div className="kpi">
            <span>Story coverage</span>
            <strong className="u-text-1">Left / Center / Right</strong>
          </div>
          <div className="kpi">
            <span>Factuality</span>
            <strong className="u-text-1">Very high .. very low</strong>
          </div>
          <div className="kpi">
            <span>Ownership</span>
            <strong className="u-text-1">Publisher entity</strong>
          </div>
        </div>
        <p className="note u-m0">
          Sources without reliable metadata are labeled <code>unknown</code>. We avoid guessing bias from domain names.
        </p>
      </section>

      <section className="panel u-mt-1 u-grid u-grid-gap-075">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Bias Categories</h2>
        </div>
        <div className="u-grid u-grid-gap-065">
          {RATING_ROWS.map((r) => {
            const outletExamples = examples.get(r.key) || [];
            return (
              <div key={r.key} className="u-grid u-grid-gap-025">
                <div className="u-flex u-flex-gap-06 u-items-center">
                  <span aria-hidden="true" className={`rating-swatch rating-swatch-${r.key}`} />
                  <strong>{r.label}</strong>
                </div>
                <div className="story-meta u-ml-16">
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

      <section className="panel u-mt-1 u-grid u-grid-gap-075">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">How Ratings Are Assigned</h2>
        </div>
        <p className="story-meta u-m0">
          Bias ratings, factuality ratings, and ownership labels are sourced from the Ground News metadata layer when
          available. When a signal is missing or ambiguous, we keep it as <code>unknown</code> rather than guessing.
        </p>
        <ul className="u-m0 u-pl-12 u-grid u-grid-gap-035">
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

      <div className="u-mt-1">
        <BiasPlayground />
      </div>
    </main>
  );
}
