import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeTriplet(left: number, center: number, right: number) {
  const total = left + center + right;
  if (total <= 0) return { left: 0, center: 0, right: 0 };
  const l = Math.round((left / total) * 100);
  const c = Math.round((center / total) * 100);
  return { left: l, center: c, right: Math.max(0, 100 - l - c) };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = Math.max(1, Math.min(365, Number(searchParams.get("days") || 90) || 90));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await db.readingEvent.findMany({
    where: { userId: user.id, readAt: { gte: since } },
    include: { story: { include: { sources: { include: { outlet: true } } } } },
    orderBy: { readAt: "desc" },
    take: 4000,
  });

  let left = 0;
  let center = 0;
  let right = 0;

  const byDay = new Map<string, { left: number; center: number; right: number }>();
  const byOutlet = new Map<string, { outlet: string; reads: number; left: number; center: number; right: number }>();

  for (const ev of events) {
    const w = ev.dwellMs && ev.dwellMs > 0 ? Math.max(1, Math.min(10, Math.round(ev.dwellMs / 15_000))) : 1;
    const s = ev.story;
    left += (s.biasLeft || 0) * w;
    center += (s.biasCenter || 0) * w;
    right += (s.biasRight || 0) * w;

    const dayKey = new Date(ev.readAt).toISOString().slice(0, 10);
    const day = byDay.get(dayKey) || { left: 0, center: 0, right: 0 };
    day.left += s.biasLeft || 0;
    day.center += s.biasCenter || 0;
    day.right += s.biasRight || 0;
    byDay.set(dayKey, day);

    const outletName =
      ev.sourceOutletSlug ||
      s.sources?.[0]?.outlet?.name ||
      s.sources?.[0]?.outletId ||
      "Unknown";
    const item = byOutlet.get(outletName) || { outlet: outletName, reads: 0, left: 0, center: 0, right: 0 };
    item.reads += 1;
    item.left += s.biasLeft || 0;
    item.center += s.biasCenter || 0;
    item.right += s.biasRight || 0;
    byOutlet.set(outletName, item);
  }

  const overall = normalizeTriplet(left, center, right);

  const timeline = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, bucket]) => ({ date, ...normalizeTriplet(bucket.left, bucket.center, bucket.right) }));

  const topOutlets = Array.from(byOutlet.values())
    .sort((a, b) => b.reads - a.reads)
    .slice(0, 15)
    .map((o) => ({
      outlet: o.outlet,
      reads: o.reads,
      bias: normalizeTriplet(o.left, o.center, o.right),
    }));

  const blindspot = overall.left >= overall.right
    ? {
        likelyMissing: "Right-leaning sources",
        recommendation: "Add more right and center-right outlets to reduce blindspots.",
      }
    : {
        likelyMissing: "Left-leaning sources",
        recommendation: "Add more left and center-left outlets to reduce blindspots.",
      };

  return NextResponse.json({
    ok: true,
    version: "v1",
    days,
    reads: events.length,
    overall,
    timeline,
    topOutlets,
    blindspot,
    factuality: {
      veryHigh: topOutlets.length,
      high: 0,
      mixed: 0,
      low: 0,
      veryLow: 0,
      unknown: 0,
    },
  });
}
