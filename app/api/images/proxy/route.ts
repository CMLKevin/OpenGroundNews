import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/infra/rateLimit";
import { fetchProxiedImage } from "@/lib/media/imageProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function requestIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon"
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = (searchParams.get("url") || "").trim();
  if (!url) {
    return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
  }

  const rl = await applyRateLimit({
    namespace: "image-proxy",
    identifier: requestIp(request),
    limit: Number(process.env.IMAGE_PROXY_RATE_LIMIT || 200),
    windowSec: Number(process.env.IMAGE_PROXY_RATE_WINDOW_SEC || 60),
  });

  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Rate limit exceeded",
        retryAfterSec: Math.max(1, rl.resetAt - Math.floor(Date.now() / 1000)),
      },
      {
        status: 429,
        headers: {
          "retry-after": String(Math.max(1, rl.resetAt - Math.floor(Date.now() / 1000))),
          "x-ratelimit-limit": String(rl.limit),
          "x-ratelimit-remaining": String(rl.remaining),
          "x-ratelimit-reset": String(rl.resetAt),
        },
      },
    );
  }

  const image = await fetchProxiedImage(url).catch((error) => ({
    ok: false as const,
    status: 500,
    error: error instanceof Error ? error.message : "Image fetch failed",
  }));

  if (!image.ok) {
    return NextResponse.json({ ok: false, error: image.error }, { status: image.status });
  }

  return new NextResponse(image.body, {
    status: 200,
    headers: {
      "content-type": image.contentType,
      "cache-control": image.cacheControl,
      "x-image-cache": image.cacheHit ? "hit" : "miss",
      "x-ratelimit-limit": String(rl.limit),
      "x-ratelimit-remaining": String(rl.remaining),
      "x-ratelimit-reset": String(rl.resetAt),
    },
  });
}
