"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Prefs = {
  edition: string;
  localLabel?: string | null;
  localLat?: number | null;
  localLon?: number | null;
  theme: "light" | "dark" | "auto";
  notifyDailyBriefing?: boolean;
  notifyBlindspot?: boolean;
  notifyFollowed?: boolean;
};

type Me = { user: { id: string; email: string } | null };

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

function setCookie(name: string, value: string, maxAgeDays = 365) {
  try {
    const maxAge = maxAgeDays * 24 * 60 * 60;
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function ManageAccountClient() {
  const [me, setMe] = useState<Me>({ user: null });
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [status, setStatus] = useState<string>("");

  const [location, setLocation] = useState<string>("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const signedIn = Boolean(me.user);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meJson = (await meRes.json()) as Me;
        if (!alive) return;
        setMe(meJson);
        if (meJson.user) {
          const prefsRes = await fetch("/api/me/prefs", { cache: "no-store" });
          const prefsJson = (await prefsRes.json()) as any;
          if (!alive) return;
          setPrefs(prefsJson?.prefs || null);
          const label = String(prefsJson?.prefs?.localLabel || "").trim();
          if (label) setLocation(label);
        } else {
          const label = (window.localStorage.getItem("ogn_local_location") || "").trim();
          if (label) setLocation(label);
        }
      } catch {
        if (!alive) return;
        setMe({ user: null });
        setPrefs(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canGeocode = useMemo(() => location.trim().length >= 2, [location]);

  useEffect(() => {
    if (!canGeocode) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoadingGeo(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(location.trim())}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as { results?: GeoResult[] };
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setLoadingGeo(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [location, canGeocode]);

  async function savePrefs(partial: Partial<Prefs>) {
    setStatus("");
    try {
      // Always persist locally for guest-like parity.
      if (partial.theme) {
        window.localStorage.setItem("ogn_theme", partial.theme);
        setCookie("ogn_theme", partial.theme);
      }
      if (partial.edition) window.localStorage.setItem("ogn_edition", partial.edition);
      if (partial.localLabel != null) {
        window.localStorage.setItem("ogn_local_location", String(partial.localLabel || ""));
        setCookie("ogn_local_label", String(partial.localLabel || ""));
      }
      if (partial.localLat != null && partial.localLon != null) {
        window.localStorage.setItem("ogn_local_lat", String(partial.localLat));
        window.localStorage.setItem("ogn_local_lon", String(partial.localLon));
        setCookie("ogn_local_lat", String(partial.localLat));
        setCookie("ogn_local_lon", String(partial.localLon));
      }

      if (!signedIn) {
        setStatus("Saved on this device.");
        return;
      }

      const res = await fetch("/api/me/prefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = (await res.json()) as any;
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "Failed");
      setPrefs(json?.prefs || prefs);
      setStatus("Saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to save.");
    }
  }

  return (
    <div className="u-grid u-grid-gap-085">
      <section className="panel">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Manage</h2>
          <span className="story-meta">{signedIn ? "Account" : "Guest mode"}</span>
        </div>
        <p className="story-meta u-m0">
          {signedIn ? `Signed in as ${me.user?.email}` : "Sign in to sync preferences across devices."}
        </p>
        {!signedIn ? (
          <div className="chip-row u-mt-065">
            <Link className="btn" href="/login?next=/my/manage">
              Sign in
            </Link>
            <Link className="btn" href="/signup?next=/my/manage">
              Create account
            </Link>
          </div>
        ) : null}
      </section>

      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Preferences</h2>
          <span className="story-meta">Edition, theme, location</span>
        </div>

        <label className="story-meta u-grid u-grid-gap-02">
          Edition
          <select
            className="select-control"
            value={prefs?.edition || window.localStorage.getItem("ogn_edition") || "International"}
            onChange={(e) => savePrefs({ edition: e.target.value })}
          >
            {["International", "United States", "Canada", "United Kingdom", "Europe"].map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>

        <div className="story-meta u-flex u-flex-gap-045 u-items-center u-wrap">
          Theme:
          {(["light", "dark", "auto"] as const).map((t) => (
            <button
              key={t}
              className={`theme-link ${((prefs?.theme || "auto") === t) ? "is-active" : ""}`}
              onClick={() => savePrefs({ theme: t })}
              type="button"
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <label className="story-meta u-grid u-grid-gap-02">
          Location (for Weather)
          <input
            className="input-control"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Search for a city (e.g., Seattle, WA)"
          />
        </label>
        {loadingGeo ? <div className="story-meta">Searching locations...</div> : null}
        {results.length ? (
          <div className="panel u-p-07 u-grid u-grid-gap-045">
            <div className="story-meta">Suggestions</div>
            <div className="u-grid u-grid-gap-035">
              {results.slice(0, 6).map((r) => {
                const label = labelForResult(r);
                const lat = Number(r.latitude);
                const lon = Number(r.longitude);
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
                return (
                  <button
                    key={`${label}-${lat}-${lon}`}
                    className="btn"
                    type="button"
                    onClick={() => {
                      setLocation(label);
                      setResults([]);
                      void savePrefs({
                        localLabel: label,
                        localLat: hasCoords ? lat : null,
                        localLon: hasCoords ? lon : null,
                      });
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {status ? (
          <p className="note u-m0">
            {status}
          </p>
        ) : null}
      </section>
    </div>
  );
}
