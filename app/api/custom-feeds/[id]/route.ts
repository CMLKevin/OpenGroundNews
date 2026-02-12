import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const feed = await db.customFeed.findUnique({ where: { id } }).catch(() => null);
  if (!feed || feed.userId !== user.id) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  await db.customFeed.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const feed = await db.customFeed.findUnique({ where: { id } }).catch(() => null);
  if (!feed || feed.userId !== user.id) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  try {
    const body = (await request.json()) as { name?: string; description?: string; rules?: any };
    const name = body.name != null ? String(body.name).trim().slice(0, 80) : undefined;
    const description = body.description != null ? String(body.description).trim().slice(0, 220) : undefined;
    const rules = body.rules && typeof body.rules === "object" ? body.rules : undefined;

    const updated = await db.customFeed.update({
      where: { id },
      data: {
        ...(name != null ? { name } : {}),
        ...(description != null ? { description } : {}),
        ...(rules != null ? { rules } : {}),
      },
    });

    return NextResponse.json({ ok: true, feed: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

