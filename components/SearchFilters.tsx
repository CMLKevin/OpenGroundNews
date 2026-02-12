"use client";

import { useRef } from "react";

type Props = {
  query: string;
  edition?: string;
  activeTab: "stories" | "topics" | "sources";
  timeFilter: "all" | "24h" | "7d" | "30d";
  biasFilter: "all" | "left" | "center" | "right";
};

export function SearchFilters({ query, edition, activeTab, timeFilter, biasFilter }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form ref={formRef} action="/search" method="get" className="filters-grid">
      <input type="hidden" name="q" value={query} />
      {edition ? <input type="hidden" name="edition" value={edition} /> : null}
      <input type="hidden" name="tab" value={activeTab} />
      <label className="story-meta u-grid u-grid-gap-02">
        Time
        <select
          className="select-control"
          name="time"
          defaultValue={timeFilter}
          onChange={() => {
            formRef.current?.requestSubmit();
          }}
        >
          <option value="all">All time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </label>
      <label className="story-meta u-grid u-grid-gap-02">
        Bias (dominant)
        <select
          className="select-control"
          name="bias"
          defaultValue={biasFilter}
          onChange={() => {
            formRef.current?.requestSubmit();
          }}
        >
          <option value="all">All</option>
          <option value="left">Leaning Left</option>
          <option value="center">Center</option>
          <option value="right">Leaning Right</option>
        </select>
      </label>
    </form>
  );
}
