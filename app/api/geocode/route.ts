import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "user-agent": "OpenGroundNews/1.0",
        accept: "application/json",
      },
    });
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 200 });
    const data = (await res.json()) as { results?: unknown[] };
    return NextResponse.json({ results: Array.isArray(data.results) ? data.results : [] });
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}

