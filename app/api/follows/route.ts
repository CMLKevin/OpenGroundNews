import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, getPrefsForUser, toggleFollow } from "@/lib/authStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const prefs = await getPrefsForUser(user.id);
  return NextResponse.json({ ok: true, prefs });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { kind?: "topic" | "outlet"; slug?: string };
    const kind = body.kind === "topic" || body.kind === "outlet" ? body.kind : null;
    if (!kind) return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
    const result = await toggleFollow(user.id, { kind, slug: body.slug || "" });
    return NextResponse.json({ ok: true, prefs: result.prefs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

