import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createSessionForUserId, getUserBySessionToken, upsertOAuthUserByEmail } from "@/lib/authStore";
import { authOptions } from "@/lib/authOptions";
import { sessionCookieOptions } from "@/lib/authCookies";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (user) return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });

  const oauth = await getServerSession(authOptions);
  if (!oauth?.user?.email) return NextResponse.json({ ok: true, user: null });

  const dbUser = await upsertOAuthUserByEmail(String(oauth.user.email));
  const created = await createSessionForUserId(dbUser.id);
  const res = NextResponse.json({
    ok: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    },
  });
  res.cookies.set("ogn_session", created.session.token, sessionCookieOptions());
  return res;
}
