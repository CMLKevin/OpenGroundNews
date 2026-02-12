"use client";

import { useMemo, useState } from "react";
import { normalizeBiasPercentages } from "@/lib/format";
import { BiasBar } from "@/components/BiasBar";

export function BiasPlayground() {
  const [left, setLeft] = useState(33);
  const [center, setCenter] = useState(34);
  const [right, setRight] = useState(33);

  const story = useMemo(() => {
    const bias = normalizeBiasPercentages({ left, center, right });
    return {
      id: "playground",
      slug: "playground",
      title: "Example story",
      summary: "Adjust the sliders to see how a coverage distribution affects the bias bar.",
      topic: "Ratings",
      location: "International",
      tags: ["Ratings"],
      imageUrl: "/images/story-fallback-thumb.svg",
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceCount: 0,
      bias,
      blindspot: false,
      local: false,
      trending: false,
      sources: [],
    } as any;
  }, [left, center, right]);

  return (
    <section className="panel" style={{ display: "grid", gap: "0.75rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Bias Bar Playground</h2>
        <span className="story-meta">Interactive</span>
      </div>
      <BiasBar story={story} showLabels={true} />

      <div className="filters-grid">
        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Left: {left}%
          <input type="range" min={0} max={100} value={left} onChange={(e) => setLeft(Number(e.target.value))} />
        </label>
        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Center: {center}%
          <input type="range" min={0} max={100} value={center} onChange={(e) => setCenter(Number(e.target.value))} />
        </label>
        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Right: {right}%
          <input type="range" min={0} max={100} value={right} onChange={(e) => setRight(Number(e.target.value))} />
        </label>
      </div>

      <p className="story-meta" style={{ margin: 0 }}>
        Sliders do not need to sum to 100. Values are normalized to 100 for display.
      </p>
    </section>
  );
}

