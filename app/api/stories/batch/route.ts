import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { slugs?: string[] };
    const slugs = Array.isArray(body.slugs)
      ? Array.from(
          new Set(
            body.slugs
              .map((slug) => String(slug || "").trim())
              .filter(Boolean)
              .slice(0, 60),
          ),
        )
      : [];
    if (slugs.length === 0) return NextResponse.json({ ok: true, stories: [] });

    const stories = await db.story.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, title: true },
    });

    return NextResponse.json({ ok: true, stories });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load stories", stories: [] },
      { status: 400 },
    );
  }
}

