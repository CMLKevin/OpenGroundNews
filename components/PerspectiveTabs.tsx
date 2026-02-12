"use client";

import { useMemo, useState } from "react";
import { Story } from "@/lib/types";

type Perspective = "left" | "center" | "right";

function buildPerspectiveEntries(story: Story, perspective: Perspective) {
  return story.sources
    .filter((source) => source.bias === perspective && source.excerpt.trim().length > 0)
    .slice(0, 3);
}

export function PerspectiveTabs({ story }: { story: Story }) {
  const [active, setActive] = useState<Perspective>("center");

  const entries = useMemo(() => buildPerspectiveEntries(story, active), [story, active]);
  const emptyLabel = active === "left" ? "Left" : active === "center" ? "Center" : "Right";

  return (
    <section className="panel">
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
      {entries.length === 0 ? (
        <p className="story-summary" style={{ fontSize: "0.98rem" }}>
          No {emptyLabel.toLowerCase()}-bucket excerpts are available for this story yet.
        </p>
      ) : (
        <ul className="perspective-list">
          {entries.map((source) => (
            <li key={source.id}>
              <strong>{source.outlet}:</strong> {source.excerpt}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
