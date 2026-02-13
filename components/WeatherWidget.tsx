"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type WeatherResponse =
  | {
      ok: true;
      current: {
        temperatureC: number;
        apparentTemperatureC: number;
        windSpeedKph: number;
        weatherCode?: number;
        label: string;
        time?: string;
      };
      daily: Array<{
        date: string;
        weatherCode: number | null;
        label: string;
        maxC: number | null;
        minC: number | null;
      }>;
      timezone?: string;
    }
  | { ok: false; error: string };

export function WeatherWidget() {
  const searchParams = useSearchParams();
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  const enabled = useMemo(() => Number.isFinite(lat) && Number.isFinite(lon), [lat, lon]);
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const daily = data && "ok" in data && data.ok ? data.daily || [] : [];

  function iconForCode(code: number | null | undefined) {
    if (code == null) return "·";
    if (code === 0) return "☀";
    if (code === 1 || code === 2) return "⛅";
    if (code === 3) return "☁";
    if (code === 45 || code === 48) return "🌫";
    if (code === 51 || code === 53 || code === 55) return "🌦";
    if (code === 61 || code === 63 || code === 65) return "🌧";
    if (code === 66 || code === 67) return "🌧";
    if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) return "❄";
    if (code === 80 || code === 81 || code === 82) return "🌧";
    if (code === 95 || code === 96 || code === 99) return "⛈";
    return "☁";
  }

  function dayLabel(value: string) {
    const ts = Date.parse(value);
    if (!Number.isFinite(ts)) return value;
    return new Date(ts).toLocaleDateString("en-US", { weekday: "short" });
  }

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
    <section className="panel u-grid u-grid-gap-055">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Weather</h2>
        <span className="story-meta">{loading ? "Loading..." : enabled ? "Local conditions" : "Pick a city"}</span>
      </div>

      {!enabled ? (
        <p className="story-meta u-m0">
          Select a suggested location to show current conditions.
        </p>
      ) : loading && !data ? (
        <p className="story-meta u-m0">Loading local weather...</p>
      ) : data?.ok ? (
        <div className="u-grid u-grid-gap-075">
          <div className="kpi-strip">
            <div className="kpi">
              <span>Now</span>
              <strong>{Math.round(data.current.temperatureC)}°C</strong>
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
              <strong className="u-text-105">{iconForCode(data.current.weatherCode)} {data.current.label}</strong>
            </div>
          </div>

          {daily.length ? (
            <div className="weather-forecast" aria-label="7-day forecast">
              {daily.slice(0, 7).map((d) => (
                <div className="weather-day" key={d.date}>
                  <div className="weather-day-name">{dayLabel(d.date)}</div>
                  <div className="weather-day-sky">
                    <span className="weather-day-icon" aria-hidden="true">{iconForCode(d.weatherCode)}</span> {d.label}
                  </div>
                  <div className="weather-day-temps">
                    <span className="weather-temp-max">{d.maxC == null ? "—" : `${Math.round(d.maxC)}°`}</span>
                    <span className="weather-temp-min">{d.minC == null ? "—" : `${Math.round(d.minC)}°`}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="story-meta u-m0">
          Weather unavailable.
        </p>
      )}
    </section>
  );
}
