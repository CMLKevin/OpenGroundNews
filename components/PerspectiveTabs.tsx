"use client";

import { useMemo, useState } from "react";
import { Story } from "@/lib/types";

type Perspective = "left" | "center" | "right";

function buildPerspectiveText(story: Story, perspective: Perspective) {
  const matching = story.sources
    .filter((source) => source.bias === perspective && source.excerpt.trim().length > 0)
    .slice(0, 3);

  if (matching.length === 0) {
    const label = perspective === "left" ? "Left" : perspective === "center" ? "Center" : "Right";
    return `No ${label.toLowerCase()}-bucket excerpts are available for this story yet.`;
  }

  return matching.map((source) => `${source.outlet}: ${source.excerpt}`).join(" ");
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
        <button
          className={`btn perspective-btn ${active === "left" ? "is-active" : ""}`}
          onClick={() => setActive("left")}
          aria-pressed={active === "left"}
        >
          Left View
        </button>
        <button
          className={`btn perspective-btn ${active === "center" ? "is-active" : ""}`}
          onClick={() => setActive("center")}
          aria-pressed={active === "center"}
        >
          Center View
        </button>
        <button
          className={`btn perspective-btn ${active === "right" ? "is-active" : ""}`}
          onClick={() => setActive("right")}
          aria-pressed={active === "right"}
        >
          Right View
        </button>
      </div>
      <p className="story-summary" style={{ fontSize: "0.98rem" }}>{text}</p>
    </section>
  );
}
