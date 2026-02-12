import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/dbAuth";
import { sanitizeServerErrorMessage } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as any;
    const token = String(body?.token || "");
    const password = String(body?.password || "");
    const result = await resetPassword({ token, password });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: sanitizeServerErrorMessage(err) }, { status: 200 });
  }
}
