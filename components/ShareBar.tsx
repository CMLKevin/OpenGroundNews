"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type Props = {
  title: string;
  url: string;
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function ShareBar({ title, url }: Props) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"" | "embed" | "hidden" | "reported">("");

  const links = useMemo(() => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    return {
      x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    };
  }, [title, url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setStatus("");
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
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
        setStatus("");
        window.setTimeout(() => setCopied(false), 1200);
      } catch {
        setCopied(false);
      }
    }
  }

  async function copyEmbed() {
    const safeTitle = title.replace(/"/g, "&quot;");
    const embed = `<iframe src="${url}" title="${safeTitle}" width="640" height="360" loading="lazy"></iframe>`;
    try {
      await navigator.clipboard.writeText(embed);
      setStatus("embed");
      window.setTimeout(() => setStatus(""), 1400);
    } catch {
      setStatus("");
    }
  }

  function markHidden() {
    setStatus("hidden");
    window.setTimeout(() => setStatus(""), 1400);
  }

  function markReported() {
    setStatus("reported");
    window.setTimeout(() => setStatus(""), 1400);
  }

  const items: Array<{ key: string; href?: string; onClick?: () => void; label: string; icon: React.ReactNode }> = [
    {
      key: "copy",
      onClick: copy,
      label: copied ? "Link copied" : "Copy link",
      icon: (
        <Icon>
          <path
            fill="currentColor"
            d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm4 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h12v14z"
          />
        </Icon>
      ),
    },
    {
      key: "embed",
      onClick: copyEmbed,
      label: status === "embed" ? "Embed code copied" : "Copy embed code",
      icon: (
        <Icon>
          <path fill="currentColor" d="M8.6 16.6 3.9 12l4.7-4.6 1.4 1.4L6.8 12l3.2 3.2-1.4 1.4zm6.8 0-1.4-1.4 3.2-3.2-3.2-3.2 1.4-1.4 4.7 4.6-4.7 4.6z" />
        </Icon>
      ),
    },
    {
      key: "hide",
      onClick: markHidden,
      label: status === "hidden" ? "Story hidden" : "Hide this story",
      icon: (
        <Icon>
          <path fill="currentColor" d="M12 6c-7 0-10 6-10 6s3 6 10 6c1.8 0 3.3-.4 4.6-1.1l1.5 1.5 1.4-1.4L4.4 3.9 3 5.3l2 2C3.4 8.5 2.4 10 2 10.7L1.4 12l.6 1.3C2.7 14.7 5.7 18 12 18c2.2 0 4.2-.4 5.9-1.2l1.6 1.6 1.4-1.4-17-17-1.4 1.4 3 3A12.5 12.5 0 0 1 12 6zm0 2c2.2 0 4 1.8 4 4 0 .6-.1 1.1-.3 1.6l-5.3-5.3c.5-.2 1-.3 1.6-.3zm-4 4c0-.6.1-1.1.3-1.6l5.3 5.3c-.5.2-1 .3-1.6.3-2.2 0-4-1.8-4-4z" />
        </Icon>
      ),
    },
    {
      key: "report",
      onClick: markReported,
      label: status === "reported" ? "Reported" : "Report this story",
      icon: (
        <Icon>
          <path fill="currentColor" d="M4 3h2v18H4V3zm4 1h11l-2.5 4L19 12H8V4z" />
        </Icon>
      ),
    },
    {
      key: "x",
      href: links.x,
      label: "Share on X",
      icon: (
        <Icon>
          <path
            fill="currentColor"
            d="M18.9 2H22l-6.8 7.8L22.8 22h-6.3l-5-6.5L5.9 22H2.8l7.3-8.4L1.2 2H7.7l4.5 5.8L18.9 2zm-1.1 18h1.7L6.7 3.9H4.9L17.8 20z"
          />
        </Icon>
      ),
    },
    {
      key: "facebook",
      href: links.facebook,
      label: "Share on Facebook",
      icon: (
        <Icon>
          <path
            fill="currentColor"
            d="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.9.3-1.5 1.6-1.5h1.7V5c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V11H7v3h2.6v8h3.9z"
          />
        </Icon>
      ),
    },
    {
      key: "linkedin",
      href: links.linkedin,
      label: "Share on LinkedIn",
      icon: (
        <Icon>
          <path
            fill="currentColor"
            d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.1c.5-1 1.9-2 3.9-2 4.2 0 5 2.8 5 6.5V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9z"
          />
        </Icon>
      ),
    },
    {
      key: "reddit",
      href: links.reddit,
      label: "Share on Reddit",
      icon: (
        <Icon>
          <path
            fill="currentColor"
            d="M22 12c0-1.1-.9-2-2-2-.6 0-1.2.3-1.6.7-1.4-1-3.3-1.6-5.4-1.7l1-4.1 2.9.7c.1.9.9 1.7 1.9 1.7 1.1 0 2-0.9 2-2s-.9-2-2-2c-.8 0-1.5.5-1.8 1.2l-3.6-.9c-.5-.1-1 .2-1.1.7l-1.2 4.9c-2.1.1-4 .7-5.4 1.7-.4-.4-1-.7-1.6-.7-1.1 0-2 .9-2 2 0 .8.5 1.5 1.2 1.8-.1.3-.2.7-.2 1.1 0 3 3.6 5.5 8 5.5s8-2.5 8-5.5c0-.4-.1-.8-.2-1.1.7-.3 1.2-1 1.2-1.8zm-13.5 2.5c-.8 0-1.5-.7-1.5-1.5S7.7 11.5 8.5 11.5 10 12.2 10 13s-.7 1.5-1.5 1.5zm7 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM12 18c-1.6 0-3-.5-3.8-1.3-.2-.2-.2-.5 0-.7.2-.2.5-.2.7 0 .6.6 1.8 1 3.1 1s2.5-.4 3.1-1c.2-.2.5-.2.7 0 .2.2.2.5 0 .7C15 17.5 13.6 18 12 18z"
          />
        </Icon>
      ),
    },
    {
      key: "email",
      href: links.email,
      label: "Share via Email",
      icon: (
        <Icon>
          <path
            fill="currentColor"
            d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"
          />
        </Icon>
      ),
    },
    {
      key: "pinterest",
      href: links.pinterest,
      label: "Share on Pinterest",
      icon: (
        <Icon>
          <path
            fill="currentColor"
            d="M12 2C6.5 2 2 6.2 2 11.5c0 4 2.5 7.6 6 9 0-.7 0-1.7.2-2.4l1.3-5.1s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-1 3.8-.3 1.1.6 2 1.7 2 2 0 3.6-2.1 3.6-5 0-2.6-1.9-4.5-4.6-4.5-3.1 0-5 2.3-5 4.8 0 1 .4 2 .9 2.6.1.1.1.2.1.3-.1.3-.3 1.1-.3 1.3-.1.2-.2.3-.4.2-1.4-.6-2.3-2.4-2.3-3.9 0-3.2 2.3-6.1 6.7-6.1 3.5 0 6.2 2.5 6.2 5.8 0 3.5-2.2 6.3-5.2 6.3-1 0-2-.5-2.3-1.2l-.6 2.3c-.2.8-.7 1.8-1.1 2.4.8.2 1.6.3 2.5.3 5.5 0 10-4.2 10-9.5C22 6.2 17.5 2 12 2z"
          />
        </Icon>
      ),
    },
  ];

  return (
    <div className="sharebar" aria-label="Share">
      {items.map((item) => {
        if (item.onClick) {
          return (
            <button key={item.key} type="button" className="sharebtn" onClick={item.onClick} aria-label={item.label} title={item.label}>
              {item.icon}
            </button>
          );
        }
        return (
          <a
            key={item.key}
            className="sharebtn"
            href={item.href}
            target="_blank"
            rel="noreferrer"
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
          </a>
        );
      })}
    </div>
  );
}
