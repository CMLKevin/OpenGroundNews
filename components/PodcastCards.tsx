"use client";

import { useMemo } from "react";
import type { StoryPodcastReference } from "@/lib/types";

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

function providerFromHost(host: string) {
  const h = host.toLowerCase();
  if (h.includes("spotify")) return "spotify";
  if (h.includes("apple.com")) return "apple";
  if (h.includes("youtube.com") || h.includes("youtu.be")) return "youtube";
  if (h.includes("podcasts.google")) return "google";
  return "podcast";
}

function youtubeThumb(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
    }
  } catch {
    // ignore
  }
  return "";
}

function biasToneFromText(text: string) {
  const value = String(text || "").toLowerCase();
  if (/\b(far left|lean left|left)\b/.test(value)) return "left";
  if (/\b(far right|lean right|right)\b/.test(value)) return "right";
  if (/\b(center|centrist)\b/.test(value)) return "center";
  return "unknown";
}

export function PodcastCards({ entries }: { entries: Array<string | StoryPodcastReference> }) {
  const cards = useMemo(() => {
    return (entries || [])
      .slice(0, 8)
      .map((entry) => {
        const text = typeof entry === "string" ? String(entry || "").trim() : String(entry?.label || entry?.url || "").trim();
        const match = text.match(/https?:\/\/[^\s)]+/i);
        const directUrl = typeof entry === "object" && entry?.url ? String(entry.url) : "";
        const url = directUrl || match?.[0] || "";
        const host = url ? hostForUrl(url) : "";
        const provider = (typeof entry === "object" && entry?.provider ? String(entry.provider) : "") || providerFromHost(host);
        const remainder = url ? text.replace(url, "").trim() : text;
        const label = remainder || labelForHost(host) || "Podcast";
        const quoteCandidate =
          typeof entry === "object" && entry && "quote" in (entry as any)
            ? String((entry as any).quote || "")
            : "";
        const quote =
          quoteCandidate.trim() ||
          (remainder.includes(" - ")
            ? remainder.split(" - ").slice(1).join(" - ").trim()
            : remainder.includes(":")
              ? remainder.split(":").slice(1).join(":").trim()
              : "");
        const artwork = provider === "youtube" && url ? youtubeThumb(url) : "";
        return { label, url, host, provider, quote, artwork, biasTone: biasToneFromText(`${label} ${quote}`) };
      })
      .filter((c) => c.label);
  }, [entries]);

  if (cards.length === 0) return null;

  return (
    <div className="podcast-grid">
      {cards.map((c, idx) => (
        <article key={`${c.url || c.label}-${idx}`} className="podcast-card">
          <div className="podcast-art">
            {c.artwork ? <img src={c.artwork} alt={c.label} /> : <span>{labelForHost(c.host).slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="podcast-body">
            <div className="podcast-topline">
              <span className="podcast-provider">{labelForHost(c.host || c.provider)}</span>
              <span className={`podcast-bias-badge is-${c.biasTone}`}>
                {c.biasTone === "unknown" ? "Bias unknown" : c.biasTone}
              </span>
            </div>
            <strong className="podcast-title">{c.label}</strong>
            {c.quote ? <blockquote className="podcast-quote">“{c.quote}”</blockquote> : null}
            {c.url ? (
              <a className="btn" href={c.url} target="_blank" rel="noreferrer">
                Listen to Full Episode
              </a>
            ) : (
              <span className="story-meta">Link unavailable</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
