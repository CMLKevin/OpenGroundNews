import { Story } from "@/lib/types";
import { deriveKeyPoints } from "@/lib/keyPoints";

export function KeyPointsPanel({ story }: { story: Story }) {
  const points = deriveKeyPoints(story, { max: 4 });
  if (points.length < 2) return null;

  return (
    <section className="panel u-grid u-grid-gap-06">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Key Points</h2>
        <span className="story-meta">Auto-generated</span>
      </div>
      <ul className="perspective-list u-pl-115">
        {points.map((point, idx) => (
          <li key={`${story.id}-kp-${idx}`}>{point}</li>
        ))}
      </ul>
      <p className="story-meta u-m0">
        Generated from the story summary and coverage excerpts. Verify details with original sources.
      </p>
    </section>
  );
}
