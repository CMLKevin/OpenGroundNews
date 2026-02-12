"use client";

import { useEffect, useMemo, useState } from "react";
import { ArchiveEntry } from "@/lib/types";

type Props = {
  entry: ArchiveEntry;
};

export function ReaderDrawer({ entry }: Props) {
  const [open, setOpen] = useState(false);

  const title = useMemo(() => entry.title || "Reader Mode", [entry.title]);
  const statusLabel = useMemo(() => {
    if (entry.status === "success") return "Archived";
    if (entry.status === "fallback") return "Cached version";
    if (entry.status === "not_found") return "Unavailable";
    if (entry.status === "blocked") return "Publisher blocked";
    return "Unavailable";
  }, [entry.status]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <section className="panel u-grid u-grid-gap-06">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Reader Mode</h2>
        <span className="story-meta">
          Status: <strong>{statusLabel}</strong>
        </span>
      </div>
      <p className="story-meta u-m0">
        {entry.notes}
      </p>
      <div className="chip-row">
        <button className="btn" type="button" onClick={() => setOpen(true)}>
          Open reader
        </button>
        {entry.archiveUrl !== "none" ? (
          <a className="btn" href={entry.archiveUrl} target="_blank" rel="noreferrer">
            Open archived source
          </a>
        ) : null}
        <a className="btn" href={entry.originalUrl} target="_blank" rel="noreferrer">
          Open original
        </a>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reader mode"
          className="reader-overlay"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setOpen(false);
          }}
        >
          <div className="panel reader-modal">
            <div className="reader-modal-head">
              <div className="u-grid u-grid-gap-02">
                <h3 className="u-m0 u-font-serif">{title}</h3>
                <div className="story-meta">Reader status: {statusLabel}</div>
              </div>
              <button className="btn" type="button" onClick={() => setOpen(false)} aria-label="Close reader">
                Close
              </button>
            </div>
            {entry.paragraphs.map((p, idx) => (
              <p key={`${entry.originalUrl}-${idx}`} className="reader-modal-paragraph">
                {p}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
