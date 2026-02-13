import { Story } from "@/lib/types";
import { normalizeBiasPercentages } from "@/lib/format";

type BiasBarProps = {
  story: Story;
  showLabels?: boolean;
};

export function BiasBar({ story, showLabels = true }: BiasBarProps) {
  const bias = normalizeBiasPercentages(story.bias);
  const hasData = bias.left + bias.center + bias.right > 0;
  const minLabelWidth = 18;

  return (
    <div className="biasbar-block">
      <div
        className="biasbar"
        style={{
          ["--left-w" as string]: `${bias.left}%`,
          ["--center-w" as string]: `${bias.center}%`,
          ["--right-w" as string]: `${bias.right}%`,
          ["--left-min" as string]: bias.left > 0 ? "3px" : "0px",
          ["--center-min" as string]: bias.center > 0 ? "3px" : "0px",
          ["--right-min" as string]: bias.right > 0 ? "3px" : "0px",
        }}
        aria-label={
          hasData
            ? `Bias distribution: ${bias.left}% left, ${bias.center}% center, ${bias.right}% right`
            : "Bias distribution unavailable"
        }
      >
        <span className="bias-left">{showLabels && hasData && bias.left >= minLabelWidth ? `Left ${bias.left}%` : ""}</span>
        <span className="bias-center">{showLabels && hasData && bias.center >= minLabelWidth ? `Center ${bias.center}%` : ""}</span>
        <span className="bias-right">{showLabels && hasData && bias.right >= minLabelWidth ? `Right ${bias.right}%` : ""}</span>
      </div>

      {showLabels ? (
        !hasData ? (
          <div className="biasbar-meta">
            <span className="story-meta">Bias data unavailable</span>
          </div>
        ) : null
      ) : null}
    </div>
  );
}
