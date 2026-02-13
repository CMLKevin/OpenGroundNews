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
  tone: "far-left" | "lean-left" | "center" | "lean-right" | "far-right" | "unknown";
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

function sourceTier(source: SourceArticle) {
  const explicit = String(source.biasRating || "").trim().toLowerCase().replace(/_/g, "-");
  if (explicit === "far-left" || explicit === "left") return "far-left";
  if (explicit === "lean-left") return "lean-left";
  if (explicit === "center") return "center";
  if (explicit === "lean-right") return "lean-right";
  if (explicit === "right" || explicit === "far-right") return "far-right";
  if (source.bias === "left") return "far-left";
  if (source.bias === "center") return "center";
  if (source.bias === "right") return "far-right";
  return "unknown";
}

export function BiasDistributionPanel({ story }: Props) {
  const left = story.sources.filter((s) => s.bias === "left");
  const center = story.sources.filter((s) => s.bias === "center");
  const right = story.sources.filter((s) => s.bias === "right");
  const byTier = {
    "far-left": story.sources.filter((s) => sourceTier(s) === "far-left"),
    "lean-left": story.sources.filter((s) => sourceTier(s) === "lean-left"),
    center: story.sources.filter((s) => sourceTier(s) === "center"),
    "lean-right": story.sources.filter((s) => sourceTier(s) === "lean-right"),
    "far-right": story.sources.filter((s) => sourceTier(s) === "far-right"),
    unknown: story.sources.filter((s) => sourceTier(s) === "unknown"),
  };

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

      <div className="bias-columns bias-columns-six">
        <SourceColumn title="Far Left" tone="far-left" sources={byTier["far-left"]} />
        <SourceColumn title="Lean Left" tone="lean-left" sources={byTier["lean-left"]} />
        <SourceColumn title="Center" tone="center" sources={byTier.center} />
        <SourceColumn title="Lean Right" tone="lean-right" sources={byTier["lean-right"]} />
        <SourceColumn title="Far Right" tone="far-right" sources={byTier["far-right"]} />
        <SourceColumn title="Untracked" tone="unknown" sources={byTier.unknown} />
      </div>
    </section>
  );
}
