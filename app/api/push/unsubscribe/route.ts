import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { endpoint?: string };
  try {
    body = (await request.json()) as { endpoint?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = String(body.endpoint || "").trim();
  if (!endpoint) return NextResponse.json({ ok: false, error: "Missing endpoint" }, { status: 400 });

  await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });

  return NextResponse.json({ ok: true });
}
