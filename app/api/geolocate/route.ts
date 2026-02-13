import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function requestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || real || "";
  if (!ip || ip === "::1" || ip === "127.0.0.1") return "";
  return ip;
}

function normalizeLabel(city: string, region: string, country: string) {
  const parts = [city, region, country].map((value) => String(value || "").trim()).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.join(", ");
}

export async function GET(request: NextRequest) {
  const ip = requestIp(request);

  const endpoints = [
    ip ? `https://ipapi.co/${encodeURIComponent(ip)}/json/` : "https://ipapi.co/json/",
    ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : "https://ipwho.is/",
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        cache: "no-store",
        headers: {
          "user-agent": "OpenGroundNews/1.0",
          accept: "application/json",
        },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as any;

      const city = String(data?.city || data?.city_name || "").trim();
      const region = String(data?.region || data?.region_name || "").trim();
      const country = String(data?.country_name || data?.country || "").trim();
      const latitude = Number(data?.latitude ?? data?.lat);
      const longitude = Number(data?.longitude ?? data?.lon);
      const label = normalizeLabel(city, region, country);

      if (!label || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      return NextResponse.json(
        {
          ok: true,
          label,
          city,
          region,
          country,
          lat: latitude,
          lon: longitude,
        },
        {
          headers: {
            "cache-control": "public, s-maxage=3600, stale-while-revalidate=43200",
          },
        },
      );
    } catch {
      // continue to fallback provider
    }
  }

  return NextResponse.json({ ok: false, error: "Unable to geolocate" }, { status: 200 });
}
