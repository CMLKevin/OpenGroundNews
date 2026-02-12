import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/authStore";
import { readArchiveForUrl } from "@/lib/archive";
import { sanitizeServerErrorMessage, validateExternalUrl } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { url?: string; force?: boolean };
  const url = String(body.url || "").trim();
  if (!url) return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });

  const validated = validateExternalUrl(url);
  if (!validated.ok) return NextResponse.json({ ok: false, error: validated.reason }, { status: 400 });

  try {
    const entry = await readArchiveForUrl(validated.url, Boolean(body.force));
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    return NextResponse.json({ ok: false, error: sanitizeServerErrorMessage(e) }, { status: 500 });
  }
}

