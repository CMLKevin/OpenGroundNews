import { NextRequest, NextResponse } from "next/server";
import { searchStories } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const edition = searchParams.get("edition") || undefined;
  const bias = (searchParams.get("bias") || "all") as any;
  const time = (searchParams.get("time") || "all") as any;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const result = await searchStories({ q, edition, limit, bias, time });
  return NextResponse.json(result);
}
