"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "ogn_local_location";

type Story = { slug: string; title: string };

type StoriesResponse = { stories?: Story[]; count?: number };

export function DailyLocalNewsWidget() {
  const [location, setLocation] = useState<string>("United States");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved) setLocation(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/stories?view=local&location=${encodeURIComponent(location)}&limit=6`, { cache: "no-store" });
        const json = (await res.json()) as StoriesResponse;
        if (!alive) return;
        setStories(Array.isArray(json.stories) ? json.stories.slice(0, 6) : []);
      } catch {
        if (!alive) return;
        setStories([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [location]);

  return (
    <section className="panel" style={{ display: "grid", gap: "0.6rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Daily Local News</h2>
        <Link className="story-meta" href={`/local?location=${encodeURIComponent(location)}`}>
          open
        </Link>
      </div>

      <div className="story-meta">{loading ? "Loading..." : location}</div>

      {stories.length > 0 ? (
        <ul className="rail-list" style={{ listStyle: "none", paddingLeft: 0 }}>
          {stories.slice(0, 5).map((s) => (
            <li key={s.slug}>
              <Link className="rail-link" href={`/story/${encodeURIComponent(s.slug)}`}>
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="story-meta" style={{ margin: 0 }}>
          No local-marked stories found. Pick a city in Local settings to improve matching.
        </p>
      )}
    </section>
  );
}
