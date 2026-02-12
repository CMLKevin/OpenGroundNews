import { Story } from "@/lib/types";
import { deriveKeyPoints } from "@/lib/keyPoints";

export function KeyPointsPanel({ story }: { story: Story }) {
  const points = deriveKeyPoints(story, { max: 4 });
  if (points.length === 0) return null;

  return (
    <section className="panel" style={{ display: "grid", gap: "0.6rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Key Points</h2>
        <span className="story-meta">Auto-generated</span>
      </div>
      <ul className="perspective-list" style={{ paddingLeft: "1.15rem" }}>
        {points.map((point, idx) => (
          <li key={`${story.id}-kp-${idx}`}>{point}</li>
        ))}
      </ul>
      <p className="story-meta" style={{ margin: 0 }}>
        Generated from the story summary and coverage excerpts. Verify details with original sources.
      </p>
    </section>
  );
}

