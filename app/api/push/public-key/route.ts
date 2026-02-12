import { NextResponse } from "next/server";
import { getWebPushKeys } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const keys = getWebPushKeys();
  if (!keys) {
    return NextResponse.json(
      { ok: false, error: "Web Push not configured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  return NextResponse.json(
    { ok: true, publicKey: keys.publicKey },
    { headers: { "cache-control": "no-store" } },
  );
}

