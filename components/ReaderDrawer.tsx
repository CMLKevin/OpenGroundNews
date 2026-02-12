"use client";

import { useEffect, useMemo, useState } from "react";
import { ArchiveEntry } from "@/lib/types";

type Props = {
  entry: ArchiveEntry;
};

export function ReaderDrawer({ entry }: Props) {
  const [open, setOpen] = useState(false);

  const title = useMemo(() => entry.title || "Reader Mode", [entry.title]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <section className="panel" style={{ display: "grid", gap: "0.6rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Reader Mode</h2>
        <span className="story-meta">
          Status: <strong>{entry.status}</strong>
        </span>
      </div>
      <p className="story-meta" style={{ margin: 0 }}>
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
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            padding: "1rem",
          }}
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setOpen(false);
          }}
        >
          <div
            className="panel"
            style={{
              width: "min(920px, calc(100% - 1rem))",
              maxHeight: "min(86vh, 860px)",
              overflow: "auto",
              display: "grid",
              gap: "0.6rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "start" }}>
              <div style={{ display: "grid", gap: "0.2rem" }}>
                <h3 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>{title}</h3>
                <div className="story-meta">Reader status: {entry.status}</div>
              </div>
              <button className="btn" type="button" onClick={() => setOpen(false)} aria-label="Close reader">
                Close
              </button>
            </div>
            {entry.paragraphs.map((p, idx) => (
              <p key={`${entry.originalUrl}-${idx}`} style={{ margin: 0, lineHeight: 1.7 }}>
                {p}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

