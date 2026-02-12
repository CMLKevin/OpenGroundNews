"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const KEY = "ogn_local_location";
const KEY_LAT = "ogn_local_lat";
const KEY_LON = "ogn_local_lon";
const DEFAULT_LOCATION = "United States";

type GeoResult = {
  id?: number;
  name?: string;
  admin1?: string;
  admin2?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

function labelForResult(result: GeoResult) {
  const parts = [result.name, result.admin1, result.country].filter(Boolean);
  return parts.join(", ") || "Unknown location";
}

export function LocalFeedControls() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromQuery = searchParams.get("location");
    const qLat = searchParams.get("lat");
    const qLon = searchParams.get("lon");
    if (fromQuery) {
      setLocation(fromQuery);
      window.localStorage.setItem(KEY, fromQuery);
      const parsedLat = qLat ? Number(qLat) : Number(window.localStorage.getItem(KEY_LAT));
      const parsedLon = qLon ? Number(qLon) : Number(window.localStorage.getItem(KEY_LON));
      if (Number.isFinite(parsedLat) && Number.isFinite(parsedLon)) {
        setLat(parsedLat);
        setLon(parsedLon);
        window.localStorage.setItem(KEY_LAT, String(parsedLat));
        window.localStorage.setItem(KEY_LON, String(parsedLon));
      }
      return;
    }
    const saved = window.localStorage.getItem(KEY);
    if (saved) setLocation(saved);
    const savedLat = Number(window.localStorage.getItem(KEY_LAT));
    const savedLon = Number(window.localStorage.getItem(KEY_LON));
    if (Number.isFinite(savedLat) && Number.isFinite(savedLon)) {
      setLat(savedLat);
      setLon(savedLon);
    }
  }, [searchParams]);

  const canGeocode = useMemo(() => location.trim().length >= 2, [location]);

  function updateQuery(nextLocation?: string, coords?: { lat: number; lon: number } | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextLocation && nextLocation.trim()) params.set("location", nextLocation.trim());
    else params.delete("location");
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)) {
      params.set("lat", String(coords.lat));
      params.set("lon", String(coords.lon));
    } else {
      params.delete("lat");
      params.delete("lon");
    }
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

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
        setLoading(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(location.trim())}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as { results?: GeoResult[] };
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [location, canGeocode]);

  return (
    <div className="panel" style={{ marginBottom: "1rem", display: "grid", gap: "0.6rem" }}>
      <h2 style={{ margin: 0 }}>Local Feed Settings</h2>
      <label className="story-meta">
        Region / City
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="input-control"
          placeholder="Search for a city (e.g., Seattle, WA)"
          aria-autocomplete="list"
        />
      </label>
      {loading ? <div className="story-meta">Searching locations...</div> : null}
      {results.length > 0 ? (
        <div className="panel" style={{ padding: "0.6rem", display: "grid", gap: "0.45rem" }}>
          <div className="story-meta">Suggestions</div>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            {results.slice(0, 6).map((result) => {
              const label = labelForResult(result);
              const rLat = Number(result.latitude);
              const rLon = Number(result.longitude);
              const hasCoords = Number.isFinite(rLat) && Number.isFinite(rLon);
              return (
                <button
                  key={`${label}-${rLat}-${rLon}`}
                  type="button"
                  className="btn"
                  onClick={() => {
                    setLocation(label);
                    window.localStorage.setItem(KEY, label);
                    if (hasCoords) {
                      setLat(rLat);
                      setLon(rLon);
                      window.localStorage.setItem(KEY_LAT, String(rLat));
                      window.localStorage.setItem(KEY_LON, String(rLon));
                      updateQuery(label, { lat: rLat, lon: rLon });
                    } else {
                      setLat(null);
                      setLon(null);
                      updateQuery(label, null);
                    }
                    setResults([]);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className="btn"
          onClick={() => {
            const next = location.trim() || DEFAULT_LOCATION;
            setLocation(next);
            window.localStorage.setItem(KEY, next);
            if (lat != null && lon != null) updateQuery(next, { lat, lon });
            else updateQuery(next, null);
          }}
        >
          Save Location
        </button>
        <button
          className="btn"
          onClick={() => {
            setLocation(DEFAULT_LOCATION);
            window.localStorage.setItem(KEY, DEFAULT_LOCATION);
            window.localStorage.removeItem(KEY_LAT);
            window.localStorage.removeItem(KEY_LON);
            setLat(null);
            setLon(null);
            updateQuery(undefined, null);
          }}
        >
          Reset
        </button>
      </div>
      {lat != null && lon != null ? (
        <div className="story-meta">
          Coordinates: {lat.toFixed(3)}, {lon.toFixed(3)}
        </div>
      ) : (
        <div className="story-meta">Tip: pick a suggestion to enable weather.</div>
      )}
    </div>
  );
}
