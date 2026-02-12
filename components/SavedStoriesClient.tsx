"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listSavedStories } from "@/lib/localPrefs";
import type { Story } from "@/lib/types";
import { SaveStoryToggle } from "@/components/SaveStoryToggle";

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

export function SavedStoriesClient() {
  const [signedIn, setSignedIn] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [stories, setStories] = useState<Record<string, Story>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const me = (await meRes.json()) as any;
        if (!alive) return;
        if (!me?.user) {
          setSignedIn(false);
          setSlugs(listSavedStories());
          return;
        }
        setSignedIn(true);
        const res = await fetch("/api/saved", { cache: "no-store" });
        const json = (await res.json()) as any;
        const next = Array.isArray(json?.saved)
          ? json.saved.map((s: any) => String(s.storySlug || s.story?.slug || "").trim()).filter(Boolean)
          : [];
        setSlugs(next);
      } catch {
        if (!alive) return;
        setSignedIn(false);
        setSlugs(listSavedStories());
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (signedIn) return;
      if (e.key === "ogn_saved_stories") setSlugs(listSavedStories());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [signedIn]);

  const missing = useMemo(() => slugs.filter((s) => !stories[s]).slice(0, 18), [slugs, stories]);

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
          <h2 className="u-m0">Saved</h2>
          <span className="story-meta">{signedIn ? "Account" : "This device"} • {slugs.length}</span>
        </div>
        <p className="story-meta u-m0">
          Save stories from the story page to build your reading list.
        </p>
      </section>

      {slugs.length ? (
        <section className="panel">
          <div className="news-list">
            {slugs.map((slug) => (
              <div key={slug} className="story-list-item is-dense">
                <div className="u-grid u-grid-gap-025">
                  <Link className="rail-link" href={`/story/${encodeURIComponent(slug)}`}>
                    {stories[slug]?.title || slug}
                  </Link>
                  <div className="story-meta">{stories[slug]?.topic || "Saved story"}</div>
                </div>
                <div className="u-justify-self-end">
                  <SaveStoryToggle storySlug={slug} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel">
          <p className="story-meta u-m0">
            No saved stories yet.
          </p>
        </section>
      )}
    </div>
  );
}
