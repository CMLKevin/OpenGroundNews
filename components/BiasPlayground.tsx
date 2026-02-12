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
    <section className="panel u-grid u-grid-gap-075">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Bias Bar Playground</h2>
        <span className="story-meta">Interactive</span>
      </div>
      <BiasBar story={story} showLabels={true} />

      <div className="filters-grid">
        <label className="story-meta u-grid u-grid-gap-02">
          Left: {left}%
          <input type="range" min={0} max={100} value={left} onChange={(e) => setLeft(Number(e.target.value))} />
        </label>
        <label className="story-meta u-grid u-grid-gap-02">
          Center: {center}%
          <input type="range" min={0} max={100} value={center} onChange={(e) => setCenter(Number(e.target.value))} />
        </label>
        <label className="story-meta u-grid u-grid-gap-02">
          Right: {right}%
          <input type="range" min={0} max={100} value={right} onChange={(e) => setRight(Number(e.target.value))} />
        </label>
      </div>

      <p className="story-meta u-m0">
        Sliders do not need to sum to 100. Values are normalized to 100 for display.
      </p>
    </section>
  );
}

