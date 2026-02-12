"use client";

import { useEffect, useMemo, useState } from "react";
import { FollowKind, isFollowed, toggleFollow } from "@/lib/localPrefs";

type Props = {
  kind: FollowKind;
  slug: string;
  label?: string;
  variant?: "pill" | "icon";
};

export function FollowToggle({ kind, slug, label, variant = "icon" }: Props) {
  const stableSlug = useMemo(() => (slug || "").trim().toLowerCase(), [slug]);
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    if (!stableSlug) return;
    setFollowed(isFollowed(kind, stableSlug));
  }, [kind, stableSlug]);

  if (!stableSlug) return null;

  const text = followed ? "✓" : "+";
  const aria = `${followed ? "Unfollow" : "Follow"} ${label || stableSlug}`;

  if (variant === "pill") {
    return (
      <button
        className={`btn perspective-btn ${followed ? "is-active" : ""}`}
        aria-label={aria}
        onClick={() => setFollowed(toggleFollow(kind, stableSlug))}
        type="button"
      >
        {followed ? "Following" : "Follow"}
      </button>
    );
  }

  return (
    <button className="topic-action" aria-label={aria} onClick={() => setFollowed(toggleFollow(kind, stableSlug))} type="button">
      {text}
    </button>
  );
}

