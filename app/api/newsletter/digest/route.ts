import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { listStories } from "@/lib/store";
import { isAuthorizedApiRequest } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseList(raw: string) {
  const [list, frequency, verification] = String(raw || "").split(":");
  return {
    list: list || "blindspot",
    frequency: frequency || "weekly",
    verified: verification === "verified" || verification === "pending",
  };
}

export async function POST(request: NextRequest) {
  const auth = isAuthorizedApiRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status });

  const resendKey = process.env.RESEND_API_KEY || "";
  const emailFrom = process.env.EMAIL_FROM || "OpenGroundNews <no-reply@example.com>";
  if (!resendKey) return NextResponse.json({ ok: false, error: "RESEND_API_KEY is not configured" }, { status: 503 });

  const resend = new Resend(resendKey);

  const [subs, stories] = await Promise.all([
    db.newsletterSignup.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    listStories({ view: "all", limit: 12 }),
  ]);

  const byEmail = new Map<string, ReturnType<typeof parseList>[]>();
  for (const sub of subs) {
    const key = String(sub.email || "").trim().toLowerCase();
    if (!key) continue;
    const arr = byEmail.get(key) || [];
    arr.push(parseList(sub.list));
    byEmail.set(key, arr);
  }

  const deliveries: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const [email, prefs] of byEmail.entries()) {
    const uniqueLists = Array.from(new Set(prefs.map((p) => p.list)));
    const html = `
      <div>
        <h1>OpenGroundNews Digest</h1>
        <p>Lists: ${uniqueLists.join(", ")}</p>
        <ul>
          ${stories
            .slice(0, 8)
            .map((s) => `<li><a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/story/${encodeURIComponent(s.slug)}">${s.title}</a> (${s.bias.left}% L / ${s.bias.center}% C / ${s.bias.right}% R)</li>`)
            .join("")}
        </ul>
      </div>
    `;

    try {
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: "Your OpenGroundNews Digest",
        html,
      });
      deliveries.push({ email, ok: true });
    } catch (error) {
      deliveries.push({ email, ok: false, error: error instanceof Error ? error.message : "send failed" });
    }
  }

  return NextResponse.json({ ok: true, deliveries, sent: deliveries.filter((d) => d.ok).length });
}
