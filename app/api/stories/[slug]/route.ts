import { NextResponse } from "next/server";
import { getStoryBySlug } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const story = await getStoryBySlug(slug);
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  return NextResponse.json({ story });
}
