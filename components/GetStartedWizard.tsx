"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const EDITION_KEY = "ogn_edition";
const THEME_KEY = "ogn_theme";
const NOTIFY_DAILY_KEY = "ogn_notify_daily";
const NOTIFY_BLINDSPOT_KEY = "ogn_notify_blindspot";
const NOTIFY_FOLLOWED_KEY = "ogn_notify_followed";
const LOCAL_LABEL_KEY = "ogn_local_location";
const LOCAL_LAT_KEY = "ogn_local_lat";
const LOCAL_LON_KEY = "ogn_local_lon";

type Step = 1 | 2 | 3 | 4 | 5;
type FollowKind = "topic" | "outlet";

type Suggestion = { slug: string; label: string };
type GeoResult = {
  name?: string;
  admin1?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

function labelForResult(result: GeoResult) {
  const parts = [result.name, result.admin1, result.country].filter(Boolean);
  return parts.join(", ") || "Unknown location";
}

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
  const [localLabel, setLocalLabel] = useState("");
  const [localLat, setLocalLat] = useState<number | null>(null);
  const [localLon, setLocalLon] = useState<number | null>(null);
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const geoAbortRef = useRef<AbortController | null>(null);
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
      const savedLocal = window.localStorage.getItem(LOCAL_LABEL_KEY);
      if (savedLocal) setLocalLabel(savedLocal);
      const savedLat = Number(window.localStorage.getItem(LOCAL_LAT_KEY));
      const savedLon = Number(window.localStorage.getItem(LOCAL_LON_KEY));
      if (Number.isFinite(savedLat) && Number.isFinite(savedLon)) {
        setLocalLat(savedLat);
        setLocalLon(savedLon);
      }
    } catch {
      // ignore
    }
  }, []);

  const topicList = useMemo(() => suggestedTopics.slice(0, 18), [suggestedTopics]);
  const outletList = useMemo(() => suggestedOutlets.slice(0, 18), [suggestedOutlets]);

  useEffect(() => {
    const query = localLabel.trim();
    if (query.length < 2) {
      setGeoResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        geoAbortRef.current?.abort();
        const controller = new AbortController();
        geoAbortRef.current = controller;
        setGeoLoading(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { cache: "no-store", signal: controller.signal });
        const data = (await res.json()) as { results?: GeoResult[] };
        setGeoResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setGeoResults([]);
      } finally {
        setGeoLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [localLabel]);

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
      window.localStorage.setItem(LOCAL_LABEL_KEY, localLabel.trim());
      if (localLat != null && localLon != null) {
        window.localStorage.setItem(LOCAL_LAT_KEY, String(localLat));
        window.localStorage.setItem(LOCAL_LON_KEY, String(localLon));
      }
      document.cookie = `ogn_local_label=${encodeURIComponent(localLabel.trim())}; Path=/; Max-Age=31536000; SameSite=Lax`;
      if (localLat != null && localLon != null) {
        document.cookie = `ogn_local_lat=${encodeURIComponent(String(localLat))}; Path=/; Max-Age=31536000; SameSite=Lax`;
        document.cookie = `ogn_local_lon=${encodeURIComponent(String(localLon))}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }

      if (signedIn) {
        await postJson("/api/me/prefs", {
          edition,
          theme,
          localLabel: localLabel.trim() || undefined,
          localLat: localLat ?? undefined,
          localLon: localLon ?? undefined,
          notifyDailyBriefing,
          notifyBlindspot,
          notifyFollowed,
        });
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
        <div style={{ display: "grid", gap: "0.25rem" }}>
          <h2 style={{ margin: 0 }}>Get Started</h2>
          <span className="story-meta">Step {step} of 5</span>
        </div>
      </div>

      <div className="wizard-stepper" aria-label="Progress">
        <div className="wizard-stepper-bar" style={{ ["--step" as any]: step }}>
          <span className="wizard-stepper-fill" />
        </div>
        <div className="wizard-stepper-steps">
          {[
            { n: 1, label: "Basics" },
            { n: 2, label: "Location" },
            { n: 3, label: "Topics" },
            { n: 4, label: "Sources" },
            { n: 5, label: "Alerts" },
          ].map((s) => (
            <div key={s.n} className={`wizard-step ${step >= (s.n as any) ? "is-done" : ""}`}>
              <span className="wizard-step-dot" aria-hidden="true" />
              <span className="wizard-step-label">{s.label}</span>
            </div>
          ))}
        </div>
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
            <div className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
              Theme
              <div className="theme-toggle">
                {(["light", "dark", "auto"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`theme-link ${theme === t ? "is-active" : ""}`}
                    onClick={() => setTheme(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
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
            Set your location to personalize Local and enable the Weather forecast.
          </p>
          <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
            Location
            <input
              className="input-control"
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              placeholder="Search for a city (e.g., Seattle, WA)"
            />
          </label>
          {geoLoading ? <div className="story-meta">Searching locations...</div> : null}
          {geoResults.length ? (
            <div className="panel" style={{ padding: "0.7rem", display: "grid", gap: "0.45rem" }}>
              <div className="story-meta">Suggestions</div>
              <div style={{ display: "grid", gap: "0.35rem" }}>
                {geoResults.slice(0, 6).map((r) => {
                  const label = labelForResult(r);
                  const lat = Number(r.latitude);
                  const lon = Number(r.longitude);
                  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
                  return (
                    <button
                      key={`${label}-${lat}-${lon}`}
                      type="button"
                      className="btn"
                      onClick={() => {
                        setLocalLabel(label);
                        setGeoResults([]);
                        if (hasCoords) {
                          setLocalLat(lat);
                          setLocalLon(lon);
                        } else {
                          setLocalLat(null);
                          setLocalLon(null);
                        }
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="chip-row">
            <button
              className="btn"
              type="button"
              onClick={() => {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
                    setLocalLat(lat);
                    setLocalLon(lon);
                    if (!localLabel.trim()) setLocalLabel("Current location");
                  },
                  () => {},
                  { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 },
                );
              }}
            >
              Use my location
            </button>
            <Link className="btn" href="/local">
              Preview Local
            </Link>
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
            Follow topics to tune your feed.
          </p>
          <div className="chip-row">
            {topicList.map((t) => (
              <button
                key={t.slug}
                type="button"
                className={`wizard-chip ${selectedTopics.has(t.slug) ? "is-selected" : ""}`}
                onClick={() => toggle("topic", t.slug)}
              >
                <span className="wizard-chip-check" aria-hidden="true">{selectedTopics.has(t.slug) ? "✓" : "+"}</span>
                {t.label}
              </button>
            ))}
          </div>
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
            Follow sources you trust (or want to monitor).
          </p>
          <div className="chip-row">
            {outletList.map((o) => (
              <button
                key={o.slug}
                type="button"
                className={`wizard-chip ${selectedOutlets.has(o.slug) ? "is-selected" : ""}`}
                onClick={() => toggle("outlet", o.slug)}
              >
                <span className="wizard-chip-check" aria-hidden="true">{selectedOutlets.has(o.slug) ? "✓" : "+"}</span>
                {o.label}
              </button>
            ))}
          </div>
          <p className="note" style={{ margin: 0 }}>
            {signedIn ? "These will sync to your account." : "Sign in to sync these picks across devices."}
          </p>
          <div className="chip-row">
            <button className="btn btn-secondary" type="button" onClick={() => setStep(3)} disabled={busy}>
              Back
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => setStep(5)}
              disabled={busy}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 5 ? (
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
            <button className="btn btn-secondary" type="button" onClick={() => setStep(4)} disabled={busy}>
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
