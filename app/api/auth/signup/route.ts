import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      ok: false,
      error: "Password sign-up is disabled. Use Continue with Google.",
    },
    { status: 410 },
  );
}
