"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Story } from "@/lib/types";
import { listFollows } from "@/lib/localPrefs";
import { outletSlug, topicSlug } from "@/lib/lookup";
import { StoryListItem } from "@/components/StoryListItem";

type CloudPrefs = { topics: string[]; outlets: string[] };

async function fetchCloudPrefs(): Promise<CloudPrefs | null> {
  try {
    const meRes = await fetch("/api/auth/me", { cache: "no-store" });
    const me = (await meRes.json()) as any;
    if (!me?.user) return null;
    const prefsRes = await fetch("/api/follows", { cache: "no-store" });
    if (!prefsRes.ok) return null;
    const prefsData = (await prefsRes.json()) as any;
    const prefs = prefsData?.prefs;
    if (!prefs) return { topics: [], outlets: [] };
    return {
      topics: Array.isArray(prefs.topics) ? prefs.topics : [],
      outlets: Array.isArray(prefs.outlets) ? prefs.outlets : [],
    };
  } catch {
    return null;
  }
}

export function MyFeedClient({ initialStories }: { initialStories: Story[] }) {
  const [cloud, setCloud] = useState(false);
  const [followedTopics, setFollowedTopics] = useState<string[]>([]);
  const [followedOutlets, setFollowedOutlets] = useState<string[]>([]);

  const [view, setView] = useState<"all" | "trending" | "blindspot">("all");
  const [bias, setBias] = useState<"all" | "left" | "center" | "right">("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const prefs = await fetchCloudPrefs();
      if (!alive) return;
      if (!prefs) {
        setCloud(false);
        setFollowedTopics(listFollows("topic"));
        setFollowedOutlets(listFollows("outlet"));
        return;
      }
      setCloud(true);
      setFollowedTopics(prefs.topics);
      setFollowedOutlets(prefs.outlets);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Refresh local lists when follow toggles mutate localStorage.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (cloud) return;
      if (e.key === "ogn_follow_topics") setFollowedTopics(listFollows("topic"));
      if (e.key === "ogn_follow_outlets") setFollowedOutlets(listFollows("outlet"));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cloud]);

  const filtered = useMemo(() => {
    const topicSet = new Set(followedTopics.map((s) => String(s).toLowerCase()));
    const outletSet = new Set(followedOutlets.map((s) => String(s).toLowerCase()));
    const hasFollows = topicSet.size > 0 || outletSet.size > 0;

    const base = initialStories.filter((s) => {
      if (view === "trending" && !s.trending) return false;
      if (view === "blindspot" && !s.blindspot) return false;
      if (bias === "left") return s.bias.left > s.bias.center && s.bias.left > s.bias.right;
      if (bias === "center") return s.bias.center >= s.bias.left && s.bias.center >= s.bias.right;
      if (bias === "right") return s.bias.right > s.bias.center && s.bias.right > s.bias.left;
      return true;
    });

    const followed = hasFollows
      ? base.filter((story) => {
          const topicMatch = story.tags.some((tag) => topicSet.has(topicSlug(tag).toLowerCase()));
          const outletMatch = story.sources.some((src) => outletSet.has(outletSlug(src.outlet).toLowerCase()));
          return topicMatch || outletMatch;
        })
      : base;

    const query = q.trim().toLowerCase();
    if (!query) return followed;
    return followed.filter((s) => {
      const hay = `${s.title} ${s.summary} ${s.topic} ${s.tags.join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [initialStories, followedTopics, followedOutlets, view, bias, q]);

  const hasFollows = followedTopics.length > 0 || followedOutlets.length > 0;

  return (
    <section className="my-shell">
      <aside className="my-rail my-rail-left">
        <section className="panel u-grid u-grid-gap-07">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Filters</h2>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setView("all");
                setBias("all");
                setQ("");
              }}
            >
              Reset
            </button>
          </div>
          <label className="story-meta u-grid u-grid-gap-02">
            Feed
            <select className="select-control" value={view} onChange={(e) => setView(e.target.value as any)}>
              <option value="all">All</option>
              <option value="trending">Trending</option>
              <option value="blindspot">Blindspot</option>
            </select>
          </label>
          <label className="story-meta u-grid u-grid-gap-02">
            Coverage bias
            <select className="select-control" value={bias} onChange={(e) => setBias(e.target.value as any)}>
              <option value="all">All</option>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="story-meta u-grid u-grid-gap-02">
            Search
            <input className="input-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by keyword" />
          </label>
        </section>
      </aside>

      <div className="my-main">
        <section className="panel u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">{hasFollows ? "My Feed" : "Top Stories For You"}</h2>
            <span className="story-meta">
              {cloud ? "Synced" : "Guest"} • {filtered.length} stories
            </span>
          </div>
          {!hasFollows ? (
            <p className="story-meta u-m0">
              Follow a few topics and sources from <Link href="/my/discover">Discover</Link> to personalize this feed.
            </p>
          ) : null}
        </section>

        <div className="panel u-mt-1">
          {filtered.length > 0 ? (
            <div className="news-list">
              {filtered.slice(0, 80).map((story) => (
                <StoryListItem key={story.id} story={story} dense={true} showSummary={true} />
              ))}
            </div>
          ) : (
            <p className="story-meta u-m0">
              No stories match your current filters. Try switching feed view or clearing search terms.
            </p>
          )}
        </div>
      </div>

      <aside className="my-rail my-rail-right">
        <section className="panel u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Favorites</h2>
            <span className="story-meta">{cloud ? "Account" : "This device"}</span>
          </div>
          <div className="story-meta">{followedTopics.length} topics • {followedOutlets.length} sources</div>
          {hasFollows ? (
            <div className="chip-row">
              {followedTopics.slice(0, 18).map((t) => (
                <Link key={`t-${t}`} className="pill" href={`/interest/${encodeURIComponent(t)}`}>
                  {t}
                </Link>
              ))}
              {followedOutlets.slice(0, 18).map((o) => (
                <Link key={`o-${o}`} className="pill" href={`/source/${encodeURIComponent(o)}`}>
                  {o}
                </Link>
              ))}
            </div>
          ) : (
            <p className="story-meta u-m0">
              Follow topics and sources in Discover to turn this into your personalized dashboard.
            </p>
          )}
          <Link className="btn" href="/my/discover">
            Discover more
          </Link>
        </section>
      </aside>
    </section>
  );
}
