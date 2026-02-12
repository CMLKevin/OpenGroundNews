import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authStore";
import { sendWebPush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { title?: string; body?: string; url?: string; all?: boolean };

  const title = String(body.title || "OpenGroundNews").slice(0, 80);
  const msg = String(body.body || "Push notifications are enabled.").slice(0, 180);
  const url = String(body.url || "/").slice(0, 400);
  const sendAll = Boolean(body.all);

  const subs = await db.pushSubscription.findMany({
    where: sendAll ? {} : { userId: user.id },
    take: 200,
  });

  const results: Array<{ endpoint: string; ok: boolean; error?: string }> = [];
  for (const sub of subs) {
    try {
      await sendWebPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { title, body: msg, url, tag: "ogn-test" });
      results.push({ endpoint: sub.endpoint, ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed";
      results.push({ endpoint: sub.endpoint, ok: false, error: message });
    }
  }

  // Optionally prune dead endpoints (410 Gone).
  for (const r of results) {
    if (!r.ok && /410|Gone/i.test(String(r.error || ""))) {
      await db.pushSubscription.deleteMany({ where: { endpoint: r.endpoint } });
    }
  }

  return NextResponse.json({ ok: true, sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
}

