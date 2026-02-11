"use client";

import { useEffect, useState } from "react";

const KEY = "ogn_local_location";

export function LocalFeedControls() {
  const [location, setLocation] = useState("United States");

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved) setLocation(saved);
  }, []);

  return (
    <div className="panel" style={{ marginBottom: "1rem", display: "grid", gap: "0.6rem" }}>
      <h2 style={{ margin: 0 }}>Local Feed Settings</h2>
      <label className="story-meta">
        Region / City
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="btn"
          style={{ width: "100%", textAlign: "left", background: "#fff" }}
          placeholder="Set location"
        />
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className="btn"
          onClick={() => {
            window.localStorage.setItem(KEY, location);
          }}
        >
          Save Location
        </button>
        <button
          className="btn"
          onClick={() => {
            setLocation("United States");
            window.localStorage.setItem(KEY, "United States");
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
