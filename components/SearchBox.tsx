"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FollowToggle } from "@/components/FollowToggle";
import { OutletAvatar } from "@/components/OutletAvatar";

type SuggestResponse = {
  ok: boolean;
  q: string;
  stories: Array<{
    slug: string;
    title: string;
    topic: string;
    location: string;
    imageUrl?: string;
    sourceCount?: number;
    updatedAt?: string;
  }>;
  topics: Array<{ slug: string; label: string; count: number }>;
  outlets: Array<{ slug: string; label: string; logoUrl?: string | null; websiteUrl?: string | null }>;
};

function highlightQuery(text: string, query: string) {
  const value = String(text || "");
  const needle = String(query || "").trim();
  if (!needle) return value;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "ig");
  const chunks = value.split(re);
  const needleLower = needle.toLowerCase();
  return chunks.map((chunk, idx) =>
    chunk.toLowerCase() === needleLower ? (
      <mark className="search-highlight" key={`hl-${idx}`}>
        {chunk}
      </mark>
    ) : (
      <span key={`tx-${idx}`}>{chunk}</span>
    ),
  );
}

export function SearchBox({
  initialQuery,
  edition,
  bias,
  time,
  tab,
}: {
  initialQuery: string;
  edition?: string;
  bias?: string;
  time?: string;
  tab?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [suggest, setSuggest] = useState<SuggestResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navKey = useMemo(() => `${pathname}?${searchParams.toString()}`, [pathname, searchParams]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setSuggest(null);
      setOpen(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const c = new AbortController();
        abortRef.current = c;
        setLoading(true);
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { cache: "no-store", signal: c.signal });
        const json = (await res.json()) as SuggestResponse;
        setSuggest(json);
        setOpen(true);
      } catch {
        setSuggest(null);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => window.clearTimeout(handle);
  }, [q]);

  // Close the suggest dropdown on navigation or filter changes.
  useEffect(() => {
    setOpen(false);
  }, [navKey]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    const onDown = (ev: MouseEvent | TouchEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const target = ev.target as Node | null;
      if (target && el.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown as any);
    };
  }, []);

  return (
    <div className="panel u-grid u-grid-gap-06" ref={wrapRef}>
      <div className="section-title u-pt-0">
        <h1 className="u-m0 u-font-serif">Search</h1>
        <span className="story-meta">{loading ? "Loading..." : q.trim() ? "Suggestions" : "Type to search"}</span>
      </div>

      <form
        action="/search"
        method="get"
        className="searchwrap"
        onSubmit={() => {
          // Prevent the dropdown from overlapping the filter tabs after submit.
          setOpen(false);
        }}
      >
        {edition ? <input type="hidden" name="edition" value={edition} /> : null}
        {bias ? <input type="hidden" name="bias" value={bias} /> : null}
        {time ? <input type="hidden" name="time" value={time} /> : null}
        {tab ? <input type="hidden" name="tab" value={tab} /> : null}
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Enter an article's title, URL, or type to search..."
          className="input-control"
          type="search"
          aria-label="Search stories, topics, outlets"
          onFocus={() => {
            if (suggest) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <button className="btn" type="submit">
          Search
        </button>
        {open && suggest ? (
          <div className="suggest-pop" role="listbox" aria-label="Search suggestions">
          {suggest.topics.length > 0 ? (
            <div>
              <div className="story-meta u-mb-035">
                Topics
              </div>
              <div className="suggest-rich-list">
                {suggest.topics.map((t) => (
                  <div key={t.slug} className="suggest-rich-item">
                    <Link
                      className="suggest-rich-main"
                      href={`/interest/${encodeURIComponent(t.slug)}`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="topic-avatar">{t.label.slice(0, 1).toUpperCase()}</span>
                      <span>{t.label}</span>
                      <span className="story-meta">{t.count.toLocaleString()} stories</span>
                    </Link>
                    <FollowToggle kind="topic" slug={t.slug} label={t.label} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {suggest.outlets.length > 0 ? (
            <div>
              <div className="story-meta u-mb-035">
                Sources
              </div>
              <div className="suggest-rich-list">
                {suggest.outlets.map((o) => (
                  <div key={o.slug} className="suggest-rich-item">
                    <Link
                      className="suggest-rich-main"
                      href={`/source/${encodeURIComponent(o.slug)}`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="topic-avatar">
                        <OutletAvatar
                          outlet={o.label}
                          logoUrl={o.logoUrl || ""}
                          websiteUrl={o.websiteUrl || ""}
                          className="u-avatar-24"
                        />
                      </span>
                      <span>{o.label}</span>
                    </Link>
                    <FollowToggle kind="outlet" slug={o.slug} label={o.label} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {suggest.stories.length > 0 ? (
            <div>
              <div className="story-meta u-mb-035">
                Stories
              </div>
              <div className="source-list">
                {suggest.stories.map((s) => (
                  <Link
                    key={s.slug}
                    className="suggest-item"
                    href={`/story/${encodeURIComponent(s.slug)}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="suggest-item-main">
                      {s.imageUrl ? <img src={s.imageUrl} alt={s.title} className="suggest-story-thumb" /> : null}
                      <span>{highlightQuery(s.title, q)}</span>
                    </span>
                    <span className="suggest-item-sub">
                      {s.topic} • {s.location}
                      {typeof s.sourceCount === "number" ? ` • ${s.sourceCount} sources` : ""}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
