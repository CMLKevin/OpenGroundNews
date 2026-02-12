import { Story, SourceArticle } from "@/lib/types";

type Props = {
  story: Story;
};

function pct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function pickInitials(outlet: string) {
  const words = outlet
    .replace(/\.[a-z]{2,}$/i, "")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function SourceBadge({ source }: { source: SourceArticle }) {
  if (source.logoUrl) {
    return (
      <span className="bias-source-badge" title={source.outlet}>
        <img src={source.logoUrl} alt={source.outlet} />
      </span>
    );
  }

  return (
    <span className="bias-source-badge bias-source-badge-fallback" title={source.outlet}>
      {pickInitials(source.outlet)}
    </span>
  );
}

function SourceColumn({
  title,
  tone,
  sources,
}: {
  title: string;
  tone: "left" | "center" | "right";
  sources: SourceArticle[];
}) {
  const visible = sources.slice(0, 7);
  const rest = sources.length - visible.length;

  return (
    <div className={`bias-column bias-column-${tone}`}>
      <div className="bias-column-title">{title}</div>
      <div className="bias-column-stack">
        {visible.map((source) => (
          <SourceBadge key={source.id} source={source} />
        ))}
        {rest > 0 ? <span className="bias-source-badge bias-source-badge-more">+{rest}</span> : null}
      </div>
    </div>
  );
}

export function BiasDistributionPanel({ story }: Props) {
  const left = story.sources.filter((s) => s.bias === "left");
  const center = story.sources.filter((s) => s.bias === "center");
  const right = story.sources.filter((s) => s.bias === "right");
  const unknown = story.sources.filter((s) => s.bias === "unknown");

  const leftPct = pct(story.bias.left);
  const centerPct = pct(story.bias.center);
  const rightPct = pct(story.bias.right);
  const hasBiasData = leftPct + centerPct + rightPct > 0 && left.length + center.length + right.length > 0;

  if (!hasBiasData) {
    return (
      <section className="panel bias-dist-panel">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Bias Distribution</h2>
        </div>
        <p className="note u-m0">
          Bias distribution data is not available for this story yet.
        </p>
      </section>
    );
  }

  const dominant = [
    { side: "Left", value: leftPct },
    { side: "Center", value: centerPct },
    { side: "Right", value: rightPct },
  ].sort((a, b) => b.value - a.value)[0];

  const totalCoverage = story.coverage?.totalSources ?? story.sourceCount;
  const trackedByCoverage =
    (story.coverage?.leaningLeft ?? left.length) +
    (story.coverage?.center ?? center.length) +
    (story.coverage?.leaningRight ?? right.length);
  const untrackedCount = Math.max(unknown.length, totalCoverage - trackedByCoverage);

  return (
    <section className="panel bias-dist-panel">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Bias Distribution</h2>
      </div>
      <p className="bias-dist-lead">
        • {dominant.value}% of the sources lean {dominant.side}
      </p>

      <div className="bias-dist-progress" aria-label="Bias distribution">
        <div className="seg seg-left" style={{ width: `${leftPct}%` }}>
          {leftPct > 0 ? `L ${leftPct}%` : ""}
        </div>
        <div className="seg seg-center" style={{ width: `${centerPct}%` }}>
          {centerPct > 0 ? `C ${centerPct}%` : ""}
        </div>
        <div className="seg seg-right" style={{ width: `${rightPct}%` }}>
          {rightPct > 0 ? `R ${rightPct}%` : ""}
        </div>
      </div>

      <div className="bias-columns">
        <SourceColumn title="Left" tone="left" sources={left} />
        <SourceColumn title="Center" tone="center" sources={center} />
        <SourceColumn title="Right" tone="right" sources={right} />
      </div>

      <div className="bias-untracked">
        <h3>Untracked bias</h3>
        <div className="bias-untracked-row">
          {unknown.slice(0, 8).map((source) => (
            <SourceBadge key={source.id} source={source} />
          ))}
          {untrackedCount > unknown.slice(0, 8).length ? (
            <span className="bias-source-badge bias-source-badge-more">
              +{untrackedCount - unknown.slice(0, 8).length}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
