import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function randomToken(bytes = 10) {
  return crypto.randomBytes(bytes).toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("ogn_session")?.value || "";
    const user = token ? await getUserBySessionToken(token) : null;

    const body = (await request.json()) as {
      kind?: "summary" | "story" | "bug" | "other";
      message?: string;
      email?: string;
      storySlug?: string;
      url?: string;
      userAgent?: string;
    };

    const kind =
      body.kind === "summary" || body.kind === "story" || body.kind === "bug" || body.kind === "other"
        ? body.kind
        : "summary";
    const message = String(body.message || "").trim().slice(0, 2000);
    if (!message || message.length < 3) {
      return NextResponse.json({ ok: false, error: "Please add a short message." }, { status: 400 });
    }
    const email = body.email ? String(body.email).trim().slice(0, 160) : undefined;
    const storySlug = body.storySlug ? String(body.storySlug).trim().slice(0, 180) : undefined;
    const url = body.url ? String(body.url).trim().slice(0, 500) : undefined;
    const userAgent = body.userAgent ? String(body.userAgent).trim().slice(0, 300) : request.headers.get("user-agent")?.slice(0, 300);

    const story = storySlug ? await db.story.findUnique({ where: { slug: storySlug }, select: { id: true } }).catch(() => null) : null;

    const created = await db.feedback.create({
      data: {
        id: `fb_${randomToken(10)}`,
        kind,
        message,
        email: email || null,
        url: url || null,
        userAgent: userAgent || null,
        userId: user?.id || null,
        storyId: story?.id || null,
      },
    });

    return NextResponse.json({ ok: true, feedbackId: created.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

