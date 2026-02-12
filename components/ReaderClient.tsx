"use client";

import { useEffect, useMemo, useState } from "react";

type ArchiveEntry = {
  originalUrl: string;
  status: "success" | "blocked" | "not_found" | "fallback" | "error";
  archiveUrl: string;
  title: string;
  notes: string;
  paragraphs: string[];
  checkedAt: string;
};

async function postJson(url: string, body: any) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export function ReaderClient({ initialUrl }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl || "");
  const [entry, setEntry] = useState<ArchiveEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const canRead = useMemo(() => url.trim().length > 0, [url]);

  async function read(force = false) {
    setBusy(true);
    setError("");
    try {
      const json = await postJson("/api/reader", { url, force });
      setEntry(json.entry as ArchiveEntry);
    } catch (e) {
      setEntry(null);
      setError(e instanceof Error ? e.message : "Failed to read article.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialUrl) {
      read(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="panel u-grid u-grid-gap-09">
      <div className="section-title u-pt-0">
        <h1 className="u-m0 u-font-serif">Reader</h1>
        <span className="story-meta">Archive-first</span>
      </div>

      <div className="searchwrap">
        <input
          className="input-control"
          placeholder="Paste an article URL (https://...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="chip-row u-flex u-justify-end">
          <button className="btn" onClick={() => read(false)} disabled={!canRead || busy}>
            {busy ? "Reading..." : "Read"}
          </button>
          <button className="btn btn-secondary" onClick={() => read(true)} disabled={!canRead || busy}>
            Force refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="note u-m0">
          {error}
        </p>
      ) : null}

      {entry ? (
        <article className="panel u-grid u-grid-gap-065">
          <div className="u-flex u-justify-between u-flex-gap-1 u-items-baseline">
            <h2 className="u-m0 u-font-serif">{entry.title}</h2>
            <span className="story-meta">{entry.status}</span>
          </div>
          <p className="story-meta u-m0">
            Source:{" "}
            <a href={entry.originalUrl} target="_blank" rel="noreferrer">
              {entry.originalUrl}
            </a>
          </p>
          {entry.archiveUrl && entry.archiveUrl !== "none" ? (
            <p className="story-meta u-m0">
              Archive:{" "}
              <a href={entry.archiveUrl} target="_blank" rel="noreferrer">
                {entry.archiveUrl}
              </a>
            </p>
          ) : null}
          <p className="note u-m0">
            {entry.notes}
          </p>
          <div className="u-grid u-grid-gap-085">
            {Array.isArray(entry.paragraphs) && entry.paragraphs.length > 0 ? (
              entry.paragraphs.map((p, idx) => (
                <p key={idx} className="u-m0 u-lh-165 u-text-102">
                  {p}
                </p>
              ))
            ) : (
              <p className="u-m0">No content.</p>
            )}
          </div>
        </article>
      ) : null}
    </section>
  );
}

