"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { slugify } from "@/lib/format";
import { FollowToggle } from "@/components/FollowToggle";

type Props = {
  tags: string[];
};

export function TrendingStrip({ tags }: Props) {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const normalized = useMemo(() => tags.map((t) => t.trim()).filter(Boolean).slice(0, 16), [tags]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const compute = () => {
      // Add a small epsilon to avoid flicker from subpixel widths.
      setIsOverflowing(el.scrollWidth > el.clientWidth + 4);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [normalized.length]);

  if (normalized.length === 0) return null;

  return (
    <section
      ref={(node) => {
        scrollerRef.current = node;
      }}
      className={`trending-strip ${isOverflowing ? "is-overflowing" : ""}`}
      aria-label="Trending topics"
    >
      <span className="trending-prefix" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path
            fill="currentColor"
            d="M13.5 2.5s.5 2.3-.6 3.9c-1.2 1.8-3.6 2.4-3.6 5.2 0 1.9 1.4 3.4 3.3 3.4 1.9 0 3.4-1.5 3.4-3.4 0-1.4-.8-2.2-1.6-3.2-.7-.9-1.3-1.8-.9-3.2 2.7 1.6 4.5 4.2 4.5 7.3 0 5-4.1 9-9 9s-9-4-9-9c0-4.1 2.7-7.6 6.4-8.7-.3 1.2-.1 2.4.4 3.4.6-1.6 2-2.6 3.1-3.4 1.4-1.1 2.5-1.9 2.2-3.6z"
          />
        </svg>
        <span>Trending</span>
      </span>
      {normalized.map((tag) => {
        const slug = slugify(tag);
        return (
          <span className="trending-item" key={tag}>
            <Link className="trending-link" href={`/interest/${slug}`}>
              {tag}
            </Link>
            <FollowToggle kind="topic" slug={slug} label={tag} variant="icon" />
          </span>
        );
      })}
    </section>
  );
}
