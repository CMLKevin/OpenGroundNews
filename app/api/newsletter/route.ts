import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeEmail(value: string) {
  return (value || "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      list?: string;
      frequency?: "daily" | "weekly";
      timezone?: string;
      verified?: boolean;
    };
    const email = normalizeEmail(body.email || "");
    if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    const list = String(body.list || "blindspot").trim().toLowerCase().slice(0, 32) || "blindspot";
    const frequency = String(body.frequency || "weekly").toLowerCase();
    const timezone = String(body.timezone || "UTC").trim().slice(0, 80);
    const verified = Boolean(body.verified);

    await db.newsletterSignup.create({
      data: {
        id: `nl_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        list: `${list}:${frequency}:${verified ? "verified" : "pending"}:${timezone}`,
        email,
      },
    });

    return NextResponse.json({
      ok: true,
      subscription: {
        email,
        list,
        frequency,
        timezone,
        verified,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const email = normalizeEmail(new URL(request.url).searchParams.get("email") || "");
  if (!email) return NextResponse.json({ ok: true, subscriptions: [] });

  const rows = await db.newsletterSignup.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const subscriptions = rows.map((row) => {
    const [list, frequency, verification, timezone] = String(row.list || "").split(":");
    return {
      id: row.id,
      list: list || "blindspot",
      frequency: frequency || "weekly",
      verified: verification === "verified",
      timezone: timezone || "UTC",
      createdAt: row.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ ok: true, subscriptions });
}
