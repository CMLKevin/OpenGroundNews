import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function weatherLabel(code: number): string {
  // Open-Meteo weather codes (subset).
  if (code === 0) return "Clear";
  if (code === 1 || code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code === 51 || code === 53 || code === 55) return "Drizzle";
  if (code === 61 || code === 63 || code === 65) return "Rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code === 71 || code === 73 || code === 75) return "Snow";
  if (code === 77) return "Snow grains";
  if (code === 80 || code === 81 || code === 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with hail";
  return "Unknown";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ ok: false, error: "Missing lat/lon" }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
  url.searchParams.set("timezone", "auto");

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "user-agent": "OpenGroundNews/1.0",
        accept: "application/json",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "Weather lookup failed" }, { status: 200 });
    }
    const data = (await res.json()) as any;
    const current = data?.current;
    const code = Number(current?.weather_code);

    return NextResponse.json({
      ok: true,
      current: {
        temperatureC: current?.temperature_2m,
        apparentTemperatureC: current?.apparent_temperature,
        windSpeedKph: current?.wind_speed_10m,
        weatherCode: code,
        label: Number.isFinite(code) ? weatherLabel(code) : "Unknown",
        time: current?.time,
      },
      timezone: data?.timezone,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Weather lookup failed" }, { status: 200 });
  }
}

