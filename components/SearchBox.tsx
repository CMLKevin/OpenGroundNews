"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SuggestResponse = {
  ok: boolean;
  q: string;
  stories: Array<{ slug: string; title: string; topic: string; location: string }>;
  topics: Array<{ slug: string; label: string; count: number }>;
  outlets: Array<{ slug: string; label: string }>;
};

export function SearchBox({
  initialQuery,
  edition,
  bias,
  time,
  tab,
}: {
  initialQuery: string;
  edition?: string;
  bias?: string;
  time?: string;
  tab?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [suggest, setSuggest] = useState<SuggestResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setSuggest(null);
      setOpen(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const c = new AbortController();
        abortRef.current = c;
        setLoading(true);
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { cache: "no-store", signal: c.signal });
        const json = (await res.json()) as SuggestResponse;
        setSuggest(json);
        setOpen(true);
      } catch {
        setSuggest(null);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => window.clearTimeout(handle);
  }, [q]);

  return (
    <div className="panel" style={{ display: "grid", gap: "0.6rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Search</h1>
        <span className="story-meta">{loading ? "Loading..." : q.trim() ? "Suggestions" : "Type to search"}</span>
      </div>

      <form action="/search" method="get" className="searchbar">
        {edition ? <input type="hidden" name="edition" value={edition} /> : null}
        {bias ? <input type="hidden" name="bias" value={bias} /> : null}
        {time ? <input type="hidden" name="time" value={time} /> : null}
        {tab ? <input type="hidden" name="tab" value={tab} /> : null}
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stories, topics, outlets"
          className="input-control"
          type="search"
          aria-label="Search stories, topics, outlets"
          onFocus={() => {
            if (suggest) setOpen(true);
          }}
        />
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      {open && suggest ? (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {suggest.topics.length > 0 ? (
            <div>
              <div className="story-meta" style={{ marginBottom: "0.35rem" }}>
                Topics
              </div>
              <div className="chip-row">
                {suggest.topics.map((t) => (
                  <Link key={t.slug} className="pill" href={`/interest/${encodeURIComponent(t.slug)}`}>
                    {t.label} ({t.count})
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {suggest.outlets.length > 0 ? (
            <div>
              <div className="story-meta" style={{ marginBottom: "0.35rem" }}>
                Sources
              </div>
              <div className="chip-row">
                {suggest.outlets.map((o) => (
                  <Link key={o.slug} className="pill" href={`/source/${encodeURIComponent(o.slug)}`}>
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {suggest.stories.length > 0 ? (
            <div>
              <div className="story-meta" style={{ marginBottom: "0.35rem" }}>
                Stories
              </div>
              <div className="source-list">
                {suggest.stories.map((s) => (
                  <Link key={s.slug} className="suggest-item" href={`/story/${encodeURIComponent(s.slug)}`}>
                    <span className="suggest-item-main">{s.title}</span>
                    <span className="suggest-item-sub">
                      {s.topic} • {s.location}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
