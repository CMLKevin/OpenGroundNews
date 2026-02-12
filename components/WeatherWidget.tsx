"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type WeatherResponse =
  | { ok: true; current: { temperatureC: number; apparentTemperatureC: number; windSpeedKph: number; label: string; time?: string }; timezone?: string }
  | { ok: false; error: string };

export function WeatherWidget() {
  const searchParams = useSearchParams();
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  const enabled = useMemo(() => Number.isFinite(lat) && Number.isFinite(lon), [lat, lon]);
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/weather?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as WeatherResponse;
        if (alive) setData(json);
      } catch {
        if (alive) setData({ ok: false, error: "Weather lookup failed" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled, lat, lon]);

  return (
    <section className="panel" style={{ display: "grid", gap: "0.55rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>Weather</h2>
        <span className="story-meta">{loading ? "Loading..." : enabled ? "Local conditions" : "Pick a city"}</span>
      </div>

      {!enabled ? (
        <p className="story-meta" style={{ margin: 0 }}>
          Select a suggested location to show current conditions.
        </p>
      ) : data?.ok ? (
        <div className="kpi-strip">
          <div className="kpi">
            <span>Now</span>
            <strong>
              {Math.round(data.current.temperatureC)}°C
            </strong>
          </div>
          <div className="kpi">
            <span>Feels like</span>
            <strong>{Math.round(data.current.apparentTemperatureC)}°C</strong>
          </div>
          <div className="kpi">
            <span>Wind</span>
            <strong>{Math.round(data.current.windSpeedKph)} kph</strong>
          </div>
          <div className="kpi">
            <span>Sky</span>
            <strong style={{ fontSize: "1.05rem" }}>{data.current.label}</strong>
          </div>
        </div>
      ) : (
        <p className="story-meta" style={{ margin: 0 }}>
          Weather unavailable.
        </p>
      )}
    </section>
  );
}

