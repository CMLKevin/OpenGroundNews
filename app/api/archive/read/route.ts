import { NextRequest, NextResponse } from "next/server";
import { readArchiveForUrl } from "@/lib/archive";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { url?: string; force?: boolean };
  if (!body.url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const entry = await readArchiveForUrl(body.url, Boolean(body.force));
  return NextResponse.json({ entry });
}
