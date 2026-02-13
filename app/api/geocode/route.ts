import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function normalize(value: string) {
  return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function featureRank(code: string) {
  const c = String(code || "").toUpperCase();
  if (c === "PCLI") return 1000; // country
  if (c.startsWith("PCL")) return 900; // political entity
  if (c === "ADM1") return 850; // region/state
  if (c === "ADM2") return 820;
  if (c.startsWith("ADM")) return 780;
  if (c.startsWith("PPLA")) return 720; // seats of adm divisions
  if (c.startsWith("PPL")) return 650; // populated place
  return 400;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });
  const qNorm = normalize(q);

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
    const results = Array.isArray(data.results) ? (data.results as any[]) : [];

    const scored = results
      .map((r) => {
        const name = normalize(r?.name || "");
        const country = normalize(r?.country || "");
        const pop = Number(r?.population || 0) || 0;
        let score = 0;
        if (name === qNorm) score += 1200;
        if (country === qNorm) score += 900;
        if (name.includes(qNorm)) score += 150;
        score += featureRank(r?.feature_code) || 0;
        score += Math.min(400, Math.log10(Math.max(1, pop)) * 120);
        return { r, score };
      })
      .sort((a, b) => b.score - a.score);

    // If the query is a clean country match, de-emphasize tiny towns.
    const top = scored[0]?.r;
    const topIsCountry = normalize(top?.name || "") === qNorm && String(top?.feature_code || "").toUpperCase() === "PCLI";

    const filtered = topIsCountry
      ? scored
          .map((s) => s.r)
          .filter((r) => {
            const fc = String(r?.feature_code || "").toUpperCase();
            const pop = Number(r?.population || 0) || 0;
            if (fc === "PCLI" || fc.startsWith("PCL") || fc.startsWith("ADM")) return true;
            // Keep only major cities when searching by country name.
            return fc.startsWith("PPL") && pop >= 1_000_000;
          })
          .slice(0, 10)
      : scored.map((s) => s.r).slice(0, 10);

    return NextResponse.json(
      { results: filtered },
      { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
