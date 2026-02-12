import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const includeStories = new URL(request.url).searchParams.get("include") === "stories";

  if (!includeStories) {
    const rows = await db.savedStory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      ok: true,
      saved: rows.map((r) => ({
        id: r.id,
        storySlug: undefined,
        storyId: r.storyId,
        createdAt: r.createdAt.toISOString(),
        story: undefined,
      })),
    });
  }

  const rows = await db.savedStory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { story: true },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    saved: rows.map((r) => ({
      id: r.id,
      storySlug: r.story.slug,
      storyId: r.storyId,
      createdAt: r.createdAt.toISOString(),
      story: {
        slug: r.story.slug,
        title: r.story.title,
        updatedAt: r.story.updatedAt.toISOString(),
      },
    })),
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { storySlug?: string };
    const slug = String(body.storySlug || "").trim();
    if (!slug) return NextResponse.json({ ok: false, error: "Missing story slug" }, { status: 400 });

    const story = await db.story.findUnique({ where: { slug }, select: { id: true } });
    if (!story) return NextResponse.json({ ok: false, error: "Story not found" }, { status: 404 });

    const existing = await db.savedStory
      .findUnique({ where: { userId_storyId: { userId: user.id, storyId: story.id } } })
      .catch(() => null);

    if (existing) {
      await db.savedStory.delete({ where: { id: existing.id } });
    } else {
      await db.savedStory.create({
        data: {
          id: `ss_${Math.random().toString(16).slice(2)}_${Date.now()}`,
          userId: user.id,
          storyId: story.id,
        },
      });
    }

    const rows = await db.savedStory.findMany({ where: { userId: user.id }, include: { story: true }, orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({ ok: true, savedSlugs: rows.map((r) => r.story.slug) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
