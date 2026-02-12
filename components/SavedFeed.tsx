"use client";

import { useEffect, useMemo, useState } from "react";
import { StoryCard } from "@/components/StoryCard";
import { listFollows } from "@/lib/localPrefs";
import { outletSlug, topicSlug } from "@/lib/lookup";
import { Story } from "@/lib/types";
import Link from "next/link";

type Props = {
  initialStories: Story[];
};

export function SavedFeed({ initialStories }: Props) {
  const [followedTopics, setFollowedTopics] = useState<string[]>([]);
  const [followedOutlets, setFollowedOutlets] = useState<string[]>([]);
  const [cloud, setCloud] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const me = (await meRes.json()) as { user: any };
        if (!alive) return;
        if (!me?.user) {
          setCloud(false);
          setFollowedTopics(listFollows("topic"));
          setFollowedOutlets(listFollows("outlet"));
          return;
        }
        const prefsRes = await fetch("/api/follows", { cache: "no-store" });
        if (!prefsRes.ok) throw new Error("prefs");
        const prefsData = (await prefsRes.json()) as { prefs?: { topics?: string[]; outlets?: string[] } };
        if (!alive) return;
        setCloud(true);
        setFollowedTopics(Array.isArray(prefsData.prefs?.topics) ? prefsData.prefs!.topics : []);
        setFollowedOutlets(Array.isArray(prefsData.prefs?.outlets) ? prefsData.prefs!.outlets : []);
      } catch {
        if (!alive) return;
        setCloud(false);
        setFollowedTopics(listFollows("topic"));
        setFollowedOutlets(listFollows("outlet"));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (followedTopics.length === 0 && followedOutlets.length === 0) return [];

    const topicSet = new Set(followedTopics.map((s) => s.toLowerCase()));
    const outletSet = new Set(followedOutlets.map((s) => s.toLowerCase()));

    return initialStories.filter((story) => {
      const topicMatch = story.tags.some((tag) => topicSet.has(topicSlug(tag).toLowerCase()));
      const outletMatch = story.sources.some((src) => outletSet.has(outletSlug(src.outlet).toLowerCase()));
      return topicMatch || outletMatch;
    });
  }, [followedTopics, followedOutlets, initialStories]);

  return (
    <div style={{ display: "grid", gap: "0.9rem" }}>
      <section className="panel">
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>Saved Preferences</h2>
          <span className="story-meta">{filtered.length} matching stories</span>
        </div>
        <p className="story-meta" style={{ margin: 0 }}>
          {cloud ? "Synced to your account." : "Stored on this device."}
        </p>
        <div className="chip-row">
          {followedTopics.map((slug) => (
            <Link key={`topic-${slug}`} className="pill" href={`/interest/${slug}`}>
              #{slug}
            </Link>
          ))}
          {followedOutlets.map((slug) => (
            <Link key={`outlet-${slug}`} className="pill" href={`/source/${slug}`}>
              {slug}
            </Link>
          ))}
        </div>
        {followedTopics.length === 0 && followedOutlets.length === 0 ? (
          <p className="note" style={{ marginTop: "0.7rem" }}>
            Follow topics and sources from story pages to populate your personalized feed.
          </p>
        ) : null}
      </section>

      <section className="grid">
        {filtered.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </section>
    </div>
  );
}
