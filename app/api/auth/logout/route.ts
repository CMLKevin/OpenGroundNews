import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/authStore";
import { expireCookieOptions } from "@/lib/authCookies";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  if (token) await destroySession(token);
  const res = NextResponse.json({ ok: true });
  const expired = expireCookieOptions();
  res.cookies.set("ogn_session", "", expired);
  res.cookies.set("authjs.session-token", "", expired);
  res.cookies.set("__Secure-authjs.session-token", "", expired);
  res.cookies.set("next-auth.session-token", "", expired);
  res.cookies.set("__Secure-next-auth.session-token", "", expired);
  return res;
}
