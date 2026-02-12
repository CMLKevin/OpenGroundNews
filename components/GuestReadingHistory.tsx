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
      const next: Record<string, string> = {};
      for (const slug of slugs) {
        if (titles[slug]) continue;
        try {
          const res = await fetch(`/api/stories/${encodeURIComponent(slug)}`, { cache: "no-store" });
          if (!res.ok) continue;
          const json = (await res.json()) as any;
          const title = String(json?.story?.title || "").trim();
          if (title) next[slug] = title;
        } catch {
          // ignore
        }
      }
      if (!alive) return;
      if (Object.keys(next).length) setTitles((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      alive = false;
    };
  }, [slugs, titles]);

  return (
    <section className="panel" style={{ display: "grid", gap: "0.6rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Reading History</h2>
        <span className="story-meta">{events.length ? "Guest (this device)" : "No reads yet"}</span>
      </div>
      {events.length ? (
        <ul className="rail-list" style={{ listStyle: "none", paddingLeft: 0 }}>
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
        <p className="story-meta" style={{ margin: 0 }}>
          Open a story to start building your bias dashboard.
        </p>
      )}
    </section>
  );
}

