"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const KEY = "ogn_local_location";
const DEFAULT_LOCATION = "United States";

export function LocalFeedControls() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromQuery = searchParams.get("location");
    if (fromQuery) {
      setLocation(fromQuery);
      window.localStorage.setItem(KEY, fromQuery);
      return;
    }
    const saved = window.localStorage.getItem(KEY);
    if (saved) setLocation(saved);
  }, [searchParams]);

  function updateQuery(nextLocation?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextLocation && nextLocation.trim()) params.set("location", nextLocation.trim());
    else params.delete("location");
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="panel" style={{ marginBottom: "1rem", display: "grid", gap: "0.6rem" }}>
      <h2 style={{ margin: 0 }}>Local Feed Settings</h2>
      <label className="story-meta">
        Region / City
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="input-control"
          placeholder="Set location"
        />
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className="btn"
          onClick={() => {
            const next = location.trim() || DEFAULT_LOCATION;
            setLocation(next);
            window.localStorage.setItem(KEY, next);
            updateQuery(next);
          }}
        >
          Save Location
        </button>
        <button
          className="btn"
          onClick={() => {
            setLocation(DEFAULT_LOCATION);
            window.localStorage.setItem(KEY, DEFAULT_LOCATION);
            updateQuery(undefined);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
