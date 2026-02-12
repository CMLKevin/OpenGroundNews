"use client";

import { useMemo, useState } from "react";
import { Story } from "@/lib/types";

type Perspective = "left" | "center" | "right";
type Tab = Perspective | "compare";

function buildPerspectiveEntries(story: Story, perspective: Perspective) {
  return story.sources
    .filter((source) => source.bias === perspective && source.excerpt.trim().length > 0)
    .slice(0, 3);
}

export function PerspectiveTabs({ story }: { story: Story }) {
  const [active, setActive] = useState<Tab>("center");

  const hasAnyPerspective = useMemo(() => {
    return story.sources.some(
      (source) =>
        (source.bias === "left" || source.bias === "center" || source.bias === "right") &&
        source.excerpt.trim().length > 0,
    );
  }, [story.sources]);

  const entries = useMemo(() => {
    if (active === "compare") return [];
    return buildPerspectiveEntries(story, active);
  }, [story, active]);
  const emptyLabel = active === "left" ? "Left" : active === "center" ? "Center" : active === "right" ? "Right" : "Bias comparison";

  const compare = useMemo(() => {
    if (active !== "compare") return null;
    return {
      left: buildPerspectiveEntries(story, "left"),
      center: buildPerspectiveEntries(story, "center"),
      right: buildPerspectiveEntries(story, "right"),
    };
  }, [active, story]);

  return (
    <section className="panel">
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Perspective Summary</h2>
      </div>
      {!hasAnyPerspective ? (
        <p className="story-summary" style={{ fontSize: "0.98rem" }}>
          Perspective excerpts are not available for this story yet.
        </p>
      ) : (
        <>
          <div className="chip-row" style={{ marginBottom: "0.7rem" }}>
            <button
              className={`btn perspective-btn ${active === "left" ? "is-active" : ""}`}
              onClick={() => setActive("left")}
              aria-pressed={active === "left"}
            >
              Left
            </button>
            <button
              className={`btn perspective-btn ${active === "center" ? "is-active" : ""}`}
              onClick={() => setActive("center")}
              aria-pressed={active === "center"}
            >
              Center
            </button>
            <button
              className={`btn perspective-btn ${active === "right" ? "is-active" : ""}`}
              onClick={() => setActive("right")}
              aria-pressed={active === "right"}
            >
              Right
            </button>
            <button
              className={`btn perspective-btn ${active === "compare" ? "is-active" : ""}`}
              onClick={() => setActive("compare")}
              aria-pressed={active === "compare"}
            >
              Bias Comparison
            </button>
          </div>
          {active === "compare" && compare ? (
            <div className="perspective-compare" aria-label="Bias comparison">
              {(["left", "center", "right"] as const).map((side) => (
                <div key={side} className={`perspective-compare-col perspective-compare-${side}`}>
                  <div className="perspective-compare-title">{side === "left" ? "Left" : side === "center" ? "Center" : "Right"}</div>
                  <ul className="perspective-list">
                    {(compare[side] || []).length ? (
                      compare[side].map((source) => (
                        <li key={source.id}>
                          <strong>{source.outlet}:</strong> {source.excerpt}
                        </li>
                      ))
                    ) : (
                      <li>No excerpts available.</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
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
        </>
      )}
    </section>
  );
}
