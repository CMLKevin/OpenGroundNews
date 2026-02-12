import { NextRequest, NextResponse } from "next/server";
import { addFollowsBatch, getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      follows?: Array<{ kind?: "topic" | "outlet"; slug?: string }>;
    };
    const follows = Array.isArray(body.follows) ? body.follows : [];
    const clean = follows
      .map((item) => ({
        kind: item.kind === "topic" || item.kind === "outlet" ? item.kind : null,
        slug: String(item.slug || "").trim().toLowerCase(),
      }))
      .filter((item): item is { kind: "topic" | "outlet"; slug: string } => Boolean(item.kind && item.slug));

    const result = await addFollowsBatch(user.id, clean);
    return NextResponse.json({ ok: true, prefs: result.prefs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

