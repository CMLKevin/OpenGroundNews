import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authStore";
import { isWebPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PushSubscriptionBody = {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  userAgent?: string;
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  if (!isWebPushConfigured()) {
    return NextResponse.json({ ok: false, error: "Web Push not configured" }, { status: 503 });
  }

  let body: PushSubscriptionBody;
  try {
    body = (await request.json()) as PushSubscriptionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = String(body.subscription?.endpoint || "").trim();
  const p256dh = String(body.subscription?.keys?.p256dh || "").trim();
  const auth = String(body.subscription?.keys?.auth || "").trim();
  const userAgent = body.userAgent ? String(body.userAgent).slice(0, 240) : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ ok: false, error: "Missing subscription fields" }, { status: 400 });
  }

  // Upsert by endpoint so repeated subscribes are idempotent across devices.
  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh, auth, userAgent },
    create: {
      id: `push_${crypto.randomBytes(16).toString("hex")}`,
      userId: user.id,
      endpoint,
      p256dh,
      auth,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}
