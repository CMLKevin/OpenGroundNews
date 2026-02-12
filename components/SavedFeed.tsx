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

  useEffect(() => {
    setFollowedTopics(listFollows("topic"));
    setFollowedOutlets(listFollows("outlet"));
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
