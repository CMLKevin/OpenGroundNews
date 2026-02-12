"use client";

import { useMemo } from "react";

function hostForUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function labelForHost(host: string) {
  const h = host.toLowerCase();
  if (h.includes("spotify")) return "Spotify";
  if (h.includes("apple.com")) return "Apple Podcasts";
  if (h.includes("youtube.com") || h.includes("youtu.be")) return "YouTube";
  if (h.includes("podcasts.google")) return "Google Podcasts";
  return host || "Podcast";
}

export function PodcastCards({ entries }: { entries: string[] }) {
  const cards = useMemo(() => {
    return (entries || [])
      .slice(0, 8)
      .map((entry) => {
        const text = String(entry || "").trim();
        const match = text.match(/https?:\/\/[^\s)]+/i);
        const url = match?.[0] ?? "";
        const label = url ? text.replace(url, "").trim() || labelForHost(hostForUrl(url)) : text || "Podcast";
        return { label, url, host: url ? hostForUrl(url) : "" };
      })
      .filter((c) => c.label);
  }, [entries]);

  if (cards.length === 0) return null;

  return (
    <div className="podcast-grid">
      {cards.map((c, idx) => (
        <article key={`${c.url || c.label}-${idx}`} className="podcast-card">
          <div className="u-grid u-grid-gap-02">
            <strong>{c.label}</strong>
            {c.host ? <span className="story-meta">{labelForHost(c.host)}</span> : null}
          </div>
          {c.url ? (
            <a className="btn" href={c.url} target="_blank" rel="noreferrer">
              Open
            </a>
          ) : (
            <span className="story-meta">Link unavailable</span>
          )}
        </article>
      ))}
    </div>
  );
}

