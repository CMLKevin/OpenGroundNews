import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const groups = await db.storyTag.groupBy({
      by: ["tag"],
      _count: { tag: true },
      orderBy: { _count: { tag: "desc" } },
      take: 16,
    });
    return NextResponse.json({
      ok: true,
      tags: groups.map((g) => ({ tag: g.tag, count: g._count.tag })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load trending tags", tags: [] },
      { status: 200 },
    );
  }
}

