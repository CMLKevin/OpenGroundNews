"use client";

import { useMemo, useState } from "react";
import { Story } from "@/lib/types";

type Perspective = "left" | "center" | "right";

function buildPerspectiveText(story: Story, p: Perspective) {
  const dominance =
    p === "left" ? story.bias.left : p === "center" ? story.bias.center : story.bias.right;

  if (p === "left") {
    return `${story.summary} Left-oriented framing in this story cluster tends to emphasize structural causes, public accountability, and policy response urgency. Current estimated share: ${dominance}%.`;
  }
  if (p === "center") {
    return `${story.summary} Center-oriented framing emphasizes chronology, verified claims, and incremental context from multiple institutions. Current estimated share: ${dominance}%.`;
  }
  return `${story.summary} Right-oriented framing in this story cluster tends to emphasize institutional overreach risks, fiscal/sovereignty concerns, and legal constraints. Current estimated share: ${dominance}%.`;
}

export function PerspectiveTabs({ story }: { story: Story }) {
  const [active, setActive] = useState<Perspective>("center");

  const text = useMemo(() => buildPerspectiveText(story, active), [story, active]);

  return (
    <section className="panel" style={{ background: "#fff" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Perspective Summary</h2>
      </div>
      <div className="chip-row" style={{ marginBottom: "0.7rem" }}>
        <button className="btn" onClick={() => setActive("left")}>Left View</button>
        <button className="btn" onClick={() => setActive("center")}>Center View</button>
        <button className="btn" onClick={() => setActive("right")}>Right View</button>
      </div>
      <p className="story-summary" style={{ fontSize: "0.98rem" }}>{text}</p>
    </section>
  );
}
