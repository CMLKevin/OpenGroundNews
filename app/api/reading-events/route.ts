import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { storySlug?: string; dwellMs?: number; sourceOutletSlug?: string };
    const slug = String(body.storySlug || "").trim();
    if (!slug) return NextResponse.json({ ok: false, error: "Missing storySlug" }, { status: 400 });

    const story = await db.story.findUnique({ where: { slug } });
    if (!story) return NextResponse.json({ ok: false, error: "Unknown story" }, { status: 404 });

    const dwell = Number(body.dwellMs);
    const dwellMs = Number.isFinite(dwell) && dwell > 0 ? Math.min(60 * 60 * 1000, Math.round(dwell)) : null;
    const sourceOutletSlug = body.sourceOutletSlug ? String(body.sourceOutletSlug).trim().toLowerCase() : null;

    const ev = await db.readingEvent.create({
      data: {
        id: `read_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        userId: user.id,
        storyId: story.id,
        dwellMs,
        sourceOutletSlug,
      },
    });

    return NextResponse.json({ ok: true, event: { id: ev.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

