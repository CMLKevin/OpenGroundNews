import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthorizedApiRequest, sanitizeServerErrorMessage } from "@/lib/security";
import { sendWebPush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = isAuthorizedApiRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status });

  try {
    const users = await db.userPrefs.findMany({
      where: { notifyDailyBriefing: true },
      select: { userId: true, edition: true },
      take: 200,
    });

    let sent = 0;
    let failed = 0;

    for (const u of users) {
      const subs = await db.pushSubscription.findMany({ where: { userId: u.userId }, take: 10 });
      if (subs.length === 0) continue;

      const story = await db.story.findFirst({
        where: { location: u.edition },
        orderBy: { updatedAt: "desc" },
        select: { slug: true, title: true, sourceCount: true, biasLeft: true, biasCenter: true, biasRight: true },
      });
      if (!story) continue;

      const url = `/story/${story.slug}`;
      const snippet = `${story.sourceCount} sources • ${story.biasLeft}% L • ${story.biasCenter}% C • ${story.biasRight}% R`;

      for (const sub of subs) {
        try {
          await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            { title: `Daily Briefing (${u.edition})`, body: `${story.title} (${snippet})`, url, tag: "ogn-daily" },
          );
          sent += 1;
        } catch (e) {
          failed += 1;
          // Prune dead endpoints.
          if (/410|Gone/i.test(String(e instanceof Error ? e.message : ""))) {
            await db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, sent, failed });
  } catch (e) {
    return NextResponse.json({ ok: false, error: sanitizeServerErrorMessage(e) }, { status: 500 });
  }
}
