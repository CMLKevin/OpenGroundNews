"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const EDITION_KEY = "ogn_edition";
const THEME_KEY = "ogn_theme";
const NOTIFY_DAILY_KEY = "ogn_notify_daily";
const NOTIFY_BLINDSPOT_KEY = "ogn_notify_blindspot";
const NOTIFY_FOLLOWED_KEY = "ogn_notify_followed";

type Step = 1 | 2 | 3 | 4;
type FollowKind = "topic" | "outlet";

type Suggestion = { slug: string; label: string };

async function postJson(url: string, body: any) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.ok !== false, json };
}

export function GetStartedWizard({
  suggestedTopics,
  suggestedOutlets,
}: {
  suggestedTopics: Suggestion[];
  suggestedOutlets: Suggestion[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [edition, setEdition] = useState("International");
  const [theme, setTheme] = useState<"dark" | "light" | "auto">("auto");
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedOutlets, setSelectedOutlets] = useState<Set<string>>(new Set());
  const [notifyDailyBriefing, setNotifyDailyBriefing] = useState(false);
  const [notifyBlindspot, setNotifyBlindspot] = useState(false);
  const [notifyFollowed, setNotifyFollowed] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json()) as any;
        setSignedIn(Boolean(json?.user));
      } catch {
        setSignedIn(false);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const savedEdition = window.localStorage.getItem(EDITION_KEY);
      if (savedEdition) setEdition(savedEdition);
      const savedTheme = window.localStorage.getItem(THEME_KEY) as any;
      if (savedTheme === "dark" || savedTheme === "light" || savedTheme === "auto") setTheme(savedTheme);
      setNotifyDailyBriefing(window.localStorage.getItem(NOTIFY_DAILY_KEY) === "1");
      setNotifyBlindspot(window.localStorage.getItem(NOTIFY_BLINDSPOT_KEY) === "1");
      setNotifyFollowed(window.localStorage.getItem(NOTIFY_FOLLOWED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  const topicList = useMemo(() => suggestedTopics.slice(0, 18), [suggestedTopics]);
  const outletList = useMemo(() => suggestedOutlets.slice(0, 18), [suggestedOutlets]);

  function toggle(kind: FollowKind, slug: string) {
    const set = kind === "topic" ? new Set(selectedTopics) : new Set(selectedOutlets);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    if (kind === "topic") setSelectedTopics(set);
    else setSelectedOutlets(set);
  }

  async function persistPrefs() {
    setBusy(true);
    try {
      // Local always.
      window.localStorage.setItem(EDITION_KEY, edition);
      window.localStorage.setItem(THEME_KEY, theme);
      document.cookie = `ogn_theme=${encodeURIComponent(theme)}; Path=/; Max-Age=31536000; SameSite=Lax`;
      window.localStorage.setItem(NOTIFY_DAILY_KEY, notifyDailyBriefing ? "1" : "0");
      window.localStorage.setItem(NOTIFY_BLINDSPOT_KEY, notifyBlindspot ? "1" : "0");
      window.localStorage.setItem(NOTIFY_FOLLOWED_KEY, notifyFollowed ? "1" : "0");

      if (signedIn) {
        await postJson("/api/me/prefs", { edition, theme, notifyDailyBriefing, notifyBlindspot, notifyFollowed });
        for (const slug of Array.from(selectedTopics)) {
          await postJson("/api/follows", { kind: "topic", slug });
        }
        for (const slug of Array.from(selectedOutlets)) {
          await postJson("/api/follows", { kind: "outlet", slug });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" style={{ display: "grid", gap: "0.85rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>Get Started</h1>
        <span className="story-meta">Step {step} of 4</span>
      </div>

      {step === 1 ? (
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <p className="story-meta" style={{ margin: 0 }}>
            Pick an edition and theme. You can change these anytime.
          </p>
          <div className="filters-grid">
            <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
              Edition
              <select className="select-control" value={edition} onChange={(e) => setEdition(e.target.value)}>
                {["International", "United States", "Canada", "United Kingdom", "Europe"].map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
              Theme
              <select className="select-control" value={theme} onChange={(e) => setTheme(e.target.value as any)}>
                <option value="auto">Auto</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
          </div>
          <div className="chip-row">
            <button className="btn" type="button" onClick={() => setStep(2)}>
              Continue
            </button>
            <Link className="btn" href="/">
              Skip for now
            </Link>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <p className="story-meta" style={{ margin: 0 }}>
            Follow topics to tune your feed.
          </p>
          <div className="chip-row">
            {topicList.map((t) => (
              <button
                key={t.slug}
                type="button"
                className={`pill ${selectedTopics.has(t.slug) ? "perspective-btn is-active" : ""}`}
                onClick={() => toggle("topic", t.slug)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="chip-row">
            <button className="btn" type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn" type="button" onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <p className="story-meta" style={{ margin: 0 }}>
            Follow sources you trust (or want to monitor).
          </p>
          <div className="chip-row">
            {outletList.map((o) => (
              <button
                key={o.slug}
                type="button"
                className={`pill ${selectedOutlets.has(o.slug) ? "perspective-btn is-active" : ""}`}
                onClick={() => toggle("outlet", o.slug)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="note" style={{ margin: 0 }}>
            {signedIn ? "These will sync to your account." : "Sign in to sync these picks across devices."}
          </p>
          <div className="chip-row">
            <button className="btn" type="button" onClick={() => setStep(2)} disabled={busy}>
              Back
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => setStep(4)}
              disabled={busy}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <p className="story-meta" style={{ margin: 0 }}>
            Want alerts? Choose what you care about. You can enable push per-device on the Notifications page.
          </p>
          <label className="toggle-row">
            <input type="checkbox" checked={notifyDailyBriefing} onChange={(e) => setNotifyDailyBriefing(e.target.checked)} />
            <span>Daily Briefing reminders</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={notifyBlindspot} onChange={(e) => setNotifyBlindspot(e.target.checked)} />
            <span>Blindspot Report alerts</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={notifyFollowed} onChange={(e) => setNotifyFollowed(e.target.checked)} />
            <span>Followed topic/source spikes</span>
          </label>
          <p className="note" style={{ margin: 0 }}>
            After finishing, open <Link href="/notifications">Notifications</Link> to enable push on this browser.
          </p>
          <div className="chip-row">
            <button className="btn btn-secondary" type="button" onClick={() => setStep(3)} disabled={busy}>
              Back
            </button>
            <button
              className="btn"
              type="button"
              onClick={async () => {
                await persistPrefs();
                window.location.href = "/my";
              }}
              disabled={busy}
            >
              {busy ? "Saving..." : "Finish"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
