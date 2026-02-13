import { Story, SourceArticle } from "@/lib/types";
import { OutletAvatar } from "@/components/OutletAvatar";

type Props = {
  story: Story;
};

function pct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function SourceBadge({ source }: { source: SourceArticle }) {
  return (
    <span className="bias-source-badge" title={source.outlet}>
      <OutletAvatar
        outlet={source.outlet}
        logoUrl={source.logoUrl}
        websiteUrl={source.websiteUrl || ""}
        sourceUrl={source.url}
        className="bias-source-badge-img"
        fallbackClassName="bias-source-badge-fallback-text"
      />
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
  const visible = sources.slice(0, 6);
  const rest = sources.length - visible.length;

  return (
    <div className={`bias-column bias-column-${tone}`}>
      <div className="bias-column-head">
        <div className="bias-column-title">{title}</div>
        <div className="bias-column-count">{sources.length}</div>
      </div>
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
  const trackedCount = left.length + center.length + right.length;

  return (
    <section className="panel bias-dist-panel">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Bias Distribution</h2>
        <span className="story-meta">{story.sources.length} sources</span>
      </div>
      <p className="bias-dist-lead">
        • {dominant.value}% of tracked sources lean {dominant.side}
        {trackedCount > 0 && trackedCount < story.sources.length
          ? ` (${story.sources.length - trackedCount} untracked)`
          : ""}
      </p>

      <div className="bias-dist-progress" aria-label="Bias distribution">
        <div className="seg seg-left" style={{ width: `${leftPct}%` }}>
          {leftPct >= 8 ? `L ${leftPct}%` : ""}
        </div>
        <div className="seg seg-center" style={{ width: `${centerPct}%` }}>
          {centerPct >= 8 ? `C ${centerPct}%` : ""}
        </div>
        <div className="seg seg-right" style={{ width: `${rightPct}%` }}>
          {rightPct >= 8 ? `R ${rightPct}%` : ""}
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
