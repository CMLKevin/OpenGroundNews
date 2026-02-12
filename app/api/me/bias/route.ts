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
  const r = Math.max(0, 100 - l - c);
  return { left: l, center: c, right: r };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = Math.max(1, Math.min(365, Number(searchParams.get("days") || 30) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await db.readingEvent.findMany({
    where: { userId: user.id, readAt: { gte: since } },
    include: { story: true },
    orderBy: { readAt: "desc" },
    take: 500,
  });

  let left = 0;
  let center = 0;
  let right = 0;
  let weight = 0;

  for (const ev of events) {
    const w = ev.dwellMs && ev.dwellMs > 0 ? Math.max(1, Math.min(10, Math.round(ev.dwellMs / 15000))) : 1;
    left += (ev.story.biasLeft || 0) * w;
    center += (ev.story.biasCenter || 0) * w;
    right += (ev.story.biasRight || 0) * w;
    weight += w;
  }

  const pct = normalizeTriplet(left, center, right);
  return NextResponse.json({
    ok: true,
    days,
    reads: events.length,
    bias: pct,
  });
}

