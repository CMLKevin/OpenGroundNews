"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "ogn_local_location";

type Story = { slug: string; title: string };

type StoriesResponse = { stories?: Story[]; count?: number };

export function DailyLocalNewsWidget() {
  const [location, setLocation] = useState<string>("");
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
    if (!location.trim()) {
      setStories([]);
      setLoading(false);
      return;
    }
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
    <section className="panel u-grid u-grid-gap-06">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Daily Local News</h2>
        <Link className="story-meta" href={location ? `/local?location=${encodeURIComponent(location)}` : "/local"}>
          open
        </Link>
      </div>

      <div className="story-meta">{loading ? "Loading..." : location || "No city selected"}</div>

      {stories.length > 0 ? (
        <ul className="rail-list u-list-reset">
          {stories.slice(0, 5).map((s) => (
            <li key={s.slug}>
              <Link className="rail-link" href={`/story/${encodeURIComponent(s.slug)}`}>
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="u-grid u-grid-gap-05">
          <p className="story-meta u-m0">
            {location
              ? "No local-marked stories found for this city yet. Try another nearby city."
              : "Set up your city to unlock local headlines and weather."}
          </p>
          <Link className="btn" href="/local">
            Set up Local
          </Link>
        </div>
      )}
    </section>
  );
}
