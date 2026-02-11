import { Story } from "@/lib/types";

export function BiasBar({ story }: { story: Story }) {
  return (
    <div
      className="biasbar"
      style={{
        ["--left-w" as string]: `${story.bias.left}%`,
        ["--center-w" as string]: `${story.bias.center}%`,
        ["--right-w" as string]: `${story.bias.right}%`,
      }}
      aria-label="Bias distribution"
    >
      <span className="bias-left" />
      <span className="bias-center" />
      <span className="bias-right" />
    </div>
  );
}
