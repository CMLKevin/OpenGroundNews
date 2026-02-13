"use client";

import { useEffect, useMemo, useState } from "react";
import { FollowKind, isFollowed, toggleFollow } from "@/lib/localPrefs";

type Props = {
  kind: FollowKind;
  slug: string;
  label?: string;
  variant?: "pill" | "icon";
};

type CloudPrefs = { topics: string[]; outlets: string[] };
type CloudUser = { id: string; email: string; role: "user" | "admin" };

let mePromise: Promise<CloudUser | null> | null = null;
let prefsPromise: Promise<CloudPrefs | null> | null = null;

async function fetchMe(): Promise<CloudUser | null> {
  if (!mePromise) {
    mePromise = fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => (data?.user ? (data.user as CloudUser) : null))
      .catch(() => null);
  }
  return mePromise;
}

async function fetchPrefs(): Promise<CloudPrefs | null> {
  if (!prefsPromise) {
    prefsPromise = fetch("/api/follows", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const prefs = data?.prefs;
        if (!prefs) return null;
        return { topics: Array.isArray(prefs.topics) ? prefs.topics : [], outlets: Array.isArray(prefs.outlets) ? prefs.outlets : [] };
      })
      .catch(() => null);
  }
  return prefsPromise;
}

export function FollowToggle({ kind, slug, label, variant = "icon" }: Props) {
  const stableSlug = useMemo(() => (slug || "").trim().toLowerCase(), [slug]);
  const [followed, setFollowed] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);

  useEffect(() => {
    if (!stableSlug) return;
    let alive = true;
    (async () => {
      const me = await fetchMe();
      if (!alive) return;
      if (!me) {
        setCloudEnabled(false);
        setFollowed(isFollowed(kind, stableSlug));
        return;
      }
      setCloudEnabled(true);
      const prefs = await fetchPrefs();
      if (!alive) return;
      const list = kind === "topic" ? prefs?.topics || [] : prefs?.outlets || [];
      setFollowed(new Set(list.map((s) => String(s).toLowerCase())).has(stableSlug));
    })();
    return () => {
      alive = false;
    };
  }, [kind, stableSlug]);

  if (!stableSlug) return null;

  const text = followed ? "✓" : "+";
  const aria = `${followed ? "Unfollow" : "Follow"} ${label || stableSlug}`;

  async function onToggle() {
    if (!cloudEnabled) {
      setFollowed(toggleFollow(kind, stableSlug));
      return;
    }
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, slug: stableSlug }),
      });
      const data = await res.json();
      const prefs = data?.prefs;
      if (prefs) {
        // Update cached prefs so other toggles stay consistent.
        prefsPromise = Promise.resolve({
          topics: Array.isArray(prefs.topics) ? prefs.topics : [],
          outlets: Array.isArray(prefs.outlets) ? prefs.outlets : [],
        });
        const list = kind === "topic" ? prefs.topics : prefs.outlets;
        setFollowed(new Set((list || []).map((s: string) => String(s).toLowerCase())).has(stableSlug));
      }
    } catch {
      // Fallback to local if cloud fails.
      setCloudEnabled(false);
      setFollowed(toggleFollow(kind, stableSlug));
    }
  }

  if (variant === "pill") {
    return (
      <button
        className={`btn perspective-btn ${followed ? "is-active" : ""}`}
        aria-label={aria}
        title={aria}
        onClick={onToggle}
        type="button"
      >
        {followed ? "Following" : "Follow"}
      </button>
    );
  }

  return (
    <button className="topic-action" aria-label={aria} title={aria} onClick={onToggle} type="button">
      {text}
    </button>
  );
}
