"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { __GUEST_READING_KEY__ } from "@/components/MyNewsBiasWidget";
import type { Story } from "@/lib/types";
import { compactHost } from "@/lib/format";

type GuestEvent = { storySlug: string; readAt: string };

function readGuestEvents(): GuestEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(__GUEST_READING_KEY__);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((ev: any) => ({ storySlug: String(ev.storySlug || "").trim(), readAt: String(ev.readAt || "").trim() }))
      .filter((ev) => ev.storySlug && ev.readAt)
      .slice(-500)
      .reverse();
  } catch {
    return [];
  }
}

async function fetchStory(slug: string): Promise<Story | null> {
  try {
    const res = await fetch(`/api/stories/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    return json?.story || null;
  } catch {
    return null;
  }
}

export function GuestCitationsClient() {
  const [events, setEvents] = useState<GuestEvent[]>([]);
  const [stories, setStories] = useState<Record<string, Story>>({});

  useEffect(() => {
    const load = () => setEvents(readGuestEvents().slice(0, 10));
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === __GUEST_READING_KEY__) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const slugs = useMemo(() => Array.from(new Set(events.map((e) => e.storySlug))).slice(0, 10), [events]);
  const missing = useMemo(() => slugs.filter((s) => !stories[s]).slice(0, 10), [slugs, stories]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const next: Record<string, Story> = {};
      for (const slug of missing) {
        const story = await fetchStory(slug);
        if (story) next[slug] = story;
      }
      if (!alive) return;
      if (Object.keys(next).length) setStories((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      alive = false;
    };
  }, [missing]);

  return (
    <div className="u-grid u-grid-gap-085">
      <section className="panel">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Citations</h2>
          <span className="story-meta">Guest (this device)</span>
        </div>
        <p className="story-meta u-m0">
          Citations list the source articles behind each story you read recently.
        </p>
      </section>

      {slugs.length ? (
        slugs.map((slug) => {
          const story = stories[slug];
          return (
            <section key={slug} className="panel u-grid u-grid-gap-06">
              <div className="section-title u-pt-0">
                <h3 className="u-m0">
                  <Link href={`/story/${encodeURIComponent(slug)}`} className="u-no-underline">
                    {story?.title || slug}
                  </Link>
                </h3>
                <span className="story-meta">{story ? `${story.sources.length} sources` : "Loading..."}</span>
              </div>
              {story ? (
                <ul className="rail-list u-list-reset">
                  {story.sources.slice(0, 10).map((src) => (
                    <li key={src.id}>
                      <a className="rail-link" href={src.url} target="_blank" rel="noreferrer">
                        {src.outlet} ({compactHost(src.url)})
                      </a>
                      <div className="story-meta">{src.bias === "unknown" ? "Unclassified" : src.bias} • {src.factuality === "unknown" ? "Not rated" : src.factuality}</div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })
      ) : (
        <section className="panel">
          <p className="story-meta u-m0">
            No citations yet. Read a story to populate this page.
          </p>
        </section>
      )}
    </div>
  );
}

