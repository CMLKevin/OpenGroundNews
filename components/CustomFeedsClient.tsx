"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Feed = {
  id: string;
  name: string;
  description?: string | null;
  rules: any;
};

type CloudFollows = { topics: string[]; outlets: string[] };

async function getFollows(): Promise<CloudFollows | null> {
  try {
    const meRes = await fetch("/api/auth/me", { cache: "no-store" });
    const me = (await meRes.json()) as any;
    if (!me?.user) return null;
    const prefsRes = await fetch("/api/follows", { cache: "no-store" });
    if (!prefsRes.ok) return { topics: [], outlets: [] };
    const json = (await prefsRes.json()) as any;
    return {
      topics: Array.isArray(json?.prefs?.topics) ? json.prefs.topics : [],
      outlets: Array.isArray(json?.prefs?.outlets) ? json.prefs.outlets : [],
    };
  } catch {
    return null;
  }
}

export function CustomFeedsClient() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [follows, setFollows] = useState<CloudFollows>({ topics: [], outlets: [] });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<Set<string>>(new Set());
  const [outlets, setOutlets] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const f = await getFollows();
      if (!alive) return;
      if (!f) {
        setSignedIn(false);
        setFeeds([]);
        return;
      }
      setSignedIn(true);
      setFollows(f);
      const res = await fetch("/api/custom-feeds", { cache: "no-store" });
      const json = (await res.json()) as any;
      if (!alive) return;
      setFeeds(Array.isArray(json?.feeds) ? json.feeds : []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canCreate = useMemo(() => name.trim().length >= 2, [name]);

  async function create() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/custom-feeds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          rules: { topics: Array.from(topics.values()), outlets: Array.from(outlets.values()) },
        }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "Failed");
      const next = await fetch("/api/custom-feeds", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      setFeeds(Array.isArray((next as any)?.feeds) ? (next as any).feeds : feeds);
      setName("");
      setDescription("");
      setTopics(new Set());
      setOutlets(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/custom-feeds/${encodeURIComponent(id)}`, { method: "DELETE" });
      setFeeds((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <section className="panel">
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>Custom Feeds</h2>
          <span className="story-meta">Sign in required</span>
        </div>
        <p className="story-meta" style={{ margin: 0 }}>
          Custom feeds are stored in your account.{" "}
          <Link href="/login?next=/my/custom-feeds" style={{ fontWeight: 800 }}>
            Sign in
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <section className="panel">
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>Custom Feeds</h2>
          <span className="story-meta">{feeds.length} saved</span>
        </div>
        <p className="story-meta" style={{ margin: 0 }}>
          Build feeds from topic and source sets. These rules power a dedicated feed view and notifications later.
        </p>
      </section>

      <section className="panel" style={{ display: "grid", gap: "0.7rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h2 style={{ margin: 0 }}>Create feed</h2>
          <span className="story-meta">Rules</span>
        </div>
        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Name
          <input className="input-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Climate & Energy" />
        </label>
        <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
          Description (optional)
          <input className="input-control" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
        </label>

        <div className="panel" style={{ padding: "0.7rem", display: "grid", gap: "0.55rem" }}>
          <div className="story-meta">Topics (from your follows)</div>
          <div className="chip-row">
            {follows.topics.length ? (
              follows.topics.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`pill ${topics.has(t) ? "is-selected" : ""}`}
                  onClick={() => {
                    const next = new Set(topics);
                    if (next.has(t)) next.delete(t);
                    else next.add(t);
                    setTopics(next);
                  }}
                >
                  #{t}
                </button>
              ))
            ) : (
              <span className="story-meta">Follow topics in Discover to enable topic rules.</span>
            )}
          </div>
        </div>

        <div className="panel" style={{ padding: "0.7rem", display: "grid", gap: "0.55rem" }}>
          <div className="story-meta">Sources (from your follows)</div>
          <div className="chip-row">
            {follows.outlets.length ? (
              follows.outlets.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`pill ${outlets.has(o) ? "is-selected" : ""}`}
                  onClick={() => {
                    const next = new Set(outlets);
                    if (next.has(o)) next.delete(o);
                    else next.add(o);
                    setOutlets(next);
                  }}
                >
                  {o}
                </button>
              ))
            ) : (
              <span className="story-meta">Follow sources in Discover to enable source rules.</span>
            )}
          </div>
        </div>

        {error ? (
          <p className="note" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}

        <div className="chip-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span className="story-meta">
            {topics.size} topics • {outlets.size} sources
          </span>
          <button className="btn" type="button" onClick={create} disabled={busy || !canCreate}>
            {busy ? "Saving..." : "Create feed"}
          </button>
        </div>
      </section>

      {feeds.length ? (
        <section className="panel">
          <div className="section-title" style={{ paddingTop: 0 }}>
            <h2 style={{ margin: 0 }}>Your feeds</h2>
            <span className="story-meta">Manage</span>
          </div>
          <div className="source-list">
            {feeds.map((f) => (
              <article key={f.id} className="source-item">
                <div className="source-head">
                  <div className="source-outlet">
                    <span className="source-logo source-logo-fallback">{f.name.slice(0, 2).toUpperCase()}</span>
                    <div style={{ display: "grid", gap: "0.08rem" }}>
                      <strong>{f.name}</strong>
                      <span className="story-meta">{f.description || "No description"}</span>
                    </div>
                  </div>
                  <button className="btn" type="button" onClick={() => remove(f.id)} disabled={busy}>
                    Delete
                  </button>
                </div>
                <div className="story-meta">
                  Topics: {Array.isArray(f.rules?.topics) ? f.rules.topics.join(", ") : "—"} • Sources:{" "}
                  {Array.isArray(f.rules?.outlets) ? f.rules.outlets.join(", ") : "—"}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

