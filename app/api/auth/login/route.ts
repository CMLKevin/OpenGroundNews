import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/authStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const { user, session } = await createSession({ email: body.email || "", password: body.password || "" });
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
    res.cookies.set("ogn_session", session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 14 * 24 * 60 * 60,
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

