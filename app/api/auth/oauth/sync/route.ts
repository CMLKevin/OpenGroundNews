import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createSessionForUserId, destroySession, getUserBySessionToken, upsertOAuthUserByEmail } from "@/lib/authStore";
import { sessionCookieOptions } from "@/lib/authCookies";

export const dynamic = "force-dynamic";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  if (!host) return false;
  return origin === `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  const email = String(session?.user?.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "OAuth session missing" }, { status: 401 });

  const user = await upsertOAuthUserByEmail(email);
  const existingToken = request.cookies.get("ogn_session")?.value || "";
  if (existingToken) {
    const existingUser = await getUserBySessionToken(existingToken);
    if (existingUser?.id === user.id) {
      return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role }, reused: true });
    }
    await destroySession(existingToken);
  }

  const created = await createSessionForUserId(user.id);

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
  res.cookies.set("ogn_session", created.session.token, sessionCookieOptions());
  return res;
}
