import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const feeds = await db.customFeed.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    feeds: feeds.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      rules: f.rules,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { name?: string; description?: string; rules?: any };
    const name = String(body.name || "").trim().slice(0, 80);
    if (name.length < 2) return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
    const description = body.description ? String(body.description).trim().slice(0, 220) : null;
    const rules = body.rules && typeof body.rules === "object" ? body.rules : { topics: [], outlets: [] };

    const feed = await db.customFeed.create({
      data: {
        id: `cf_${Math.random().toString(16).slice(2)}_${Date.now()}`,
        userId: user.id,
        name,
        description,
        rules,
      },
    });

    return NextResponse.json({
      ok: true,
      feed: { id: feed.id, name: feed.name, description: feed.description, rules: feed.rules },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

