"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { __GUEST_READING_KEY__ } from "@/components/MyNewsBiasWidget";

type GuestEvent = {
  storySlug: string;
  readAt: string;
  dwellMs?: number;
};

function readGuestEvents(): GuestEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(__GUEST_READING_KEY__);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((ev: any) => ({
        storySlug: String(ev.storySlug || "").trim(),
        readAt: String(ev.readAt || "").trim(),
        dwellMs: typeof ev.dwellMs === "number" ? ev.dwellMs : undefined,
      }))
      .filter((ev) => ev.storySlug && ev.readAt)
      .slice(-500);
  } catch {
    return [];
  }
}

export function GuestReadingHistory() {
  const [events, setEvents] = useState<GuestEvent[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = () => setEvents(readGuestEvents().slice().reverse().slice(0, 12));
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === __GUEST_READING_KEY__) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const slugs = useMemo(() => Array.from(new Set(events.map((e) => e.storySlug))).slice(0, 12), [events]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const uncached = slugs.filter((slug) => !titles[slug]);
      if (uncached.length === 0) return;
      const next: Record<string, string> = {};
      try {
        const res = await fetch("/api/stories/batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ slugs: uncached }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as any;
        const rows = Array.isArray(json?.stories) ? json.stories : [];
        for (const row of rows) {
          const slug = String(row?.slug || "").trim();
          const title = String(row?.title || "").trim();
          if (slug && title) next[slug] = title;
        }
      } catch {
        // ignore
      }
      if (!alive) return;
      if (Object.keys(next).length) setTitles((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      alive = false;
    };
  }, [slugs, titles]);

  return (
    <section className="panel u-grid u-grid-gap-06">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Reading History</h2>
        <span className="story-meta">{events.length ? "Guest (this device)" : "No reads yet"}</span>
      </div>
      {events.length ? (
        <ul className="rail-list u-list-reset">
          {events.map((ev) => (
            <li key={`${ev.storySlug}-${ev.readAt}`}>
              <Link className="rail-link" href={`/story/${encodeURIComponent(ev.storySlug)}`}>
                {titles[ev.storySlug] || ev.storySlug}
              </Link>
              <div className="story-meta">
                Read{" "}
                {new Date(ev.readAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="story-meta u-m0">
          Open a story to start building your bias dashboard.
        </p>
      )}
    </section>
  );
}
