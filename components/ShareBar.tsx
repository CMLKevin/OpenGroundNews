"use client";

import { useMemo, useState } from "react";

type Props = {
  title: string;
  url: string;
};

export function ShareBar({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const links = useMemo(() => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    return {
      x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    };
  }, [title, url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback for older browsers.
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      } catch {
        setCopied(false);
      }
    }
  }

  return (
    <section className="panel" style={{ display: "grid", gap: "0.55rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Share</h2>
        <span className="story-meta">{copied ? "Link copied" : "Share this story"}</span>
      </div>
      <div className="chip-row">
        <button className="btn" type="button" onClick={copy} aria-label="Copy story link">
          Copy link
        </button>
        <a className="btn" href={links.x} target="_blank" rel="noreferrer">
          Post on X
        </a>
        <a className="btn" href={links.facebook} target="_blank" rel="noreferrer">
          Share to Facebook
        </a>
        <a className="btn" href={links.linkedin} target="_blank" rel="noreferrer">
          Share to LinkedIn
        </a>
        <a className="btn" href={links.reddit} target="_blank" rel="noreferrer">
          Share to Reddit
        </a>
      </div>
    </section>
  );
}

