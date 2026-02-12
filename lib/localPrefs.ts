"use client";

const TOPIC_KEY = "ogn_follow_topics";
const OUTLET_KEY = "ogn_follow_outlets";

function safeParse(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v)).filter(Boolean);
  } catch {
    return [];
  }
}

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  return new Set(safeParse(window.localStorage.getItem(key)));
}

function writeSet(key: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(set.values())));
}

export type FollowKind = "topic" | "outlet";

export function prefsKey(kind: FollowKind) {
  return kind === "topic" ? TOPIC_KEY : OUTLET_KEY;
}

export function isFollowed(kind: FollowKind, slug: string) {
  const set = readSet(prefsKey(kind));
  return set.has(slug);
}

export function toggleFollow(kind: FollowKind, slug: string) {
  const key = prefsKey(kind);
  const set = readSet(key);
  if (set.has(slug)) set.delete(slug);
  else set.add(slug);
  writeSet(key, set);
  return set.has(slug);
}

export function listFollows(kind: FollowKind) {
  return Array.from(readSet(prefsKey(kind)).values());
}

