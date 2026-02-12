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
