import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: true, user: null });
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
}

