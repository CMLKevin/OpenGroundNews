import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/authStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  if (token) await destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("ogn_session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

