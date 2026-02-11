import { Story } from "@/lib/types";
import { normalizeBiasPercentages } from "@/lib/format";

type BiasBarProps = {
  story: Story;
  showLabels?: boolean;
};

export function BiasBar({ story, showLabels = true }: BiasBarProps) {
  const bias = normalizeBiasPercentages(story.bias);

  return (
    <div className="biasbar-block">
      <div
        className="biasbar"
        style={{
          ["--left-w" as string]: `${bias.left}%`,
          ["--center-w" as string]: `${bias.center}%`,
          ["--right-w" as string]: `${bias.right}%`,
        }}
        aria-label={`Bias distribution: ${bias.left}% left, ${bias.center}% center, ${bias.right}% right`}
      >
        <span className="bias-left" />
        <span className="bias-center" />
        <span className="bias-right" />
      </div>

      {showLabels ? (
        <div className="biasbar-meta">
          <span className="bias-meta-left">{bias.left}% left</span>
          <span className="bias-meta-center">{bias.center}% center</span>
          <span className="bias-meta-right">{bias.right}% right</span>
        </div>
      ) : null}
    </div>
  );
}
