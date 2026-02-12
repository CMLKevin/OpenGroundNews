import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeEmail(value: string) {
  return (value || "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; list?: string };
    const email = normalizeEmail(body.email || "");
    if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    const list = String(body.list || "blindspot").trim().toLowerCase().slice(0, 32) || "blindspot";

    await db.newsletterSignup.create({
      data: {
        id: `nl_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        list,
        email,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

