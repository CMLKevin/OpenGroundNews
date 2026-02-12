import { NextRequest, NextResponse } from "next/server";
import { readArchiveForUrl } from "@/lib/archive";
import { isAuthorizedApiRequest, validateExternalUrl } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = isAuthorizedApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const body = (await request.json()) as { url?: string; force?: boolean };
  if (!body.url || !body.url.trim()) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const validated = validateExternalUrl(body.url);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 400 });
  }

  const entry = await readArchiveForUrl(validated.url, Boolean(body.force));
  return NextResponse.json({ entry });
}
