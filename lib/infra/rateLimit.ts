import { createHash } from "node:crypto";

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

function toSafeId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function upstashIncr(key: string, ttlSec: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (!url || !token) return null;

  const base = url.replace(/\/$/, "");
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };

  const incrRes = await fetch(`${base}/incr/${encodeURIComponent(key)}`, {
    method: "POST",
    headers,
    cache: "no-store",
  });
  if (!incrRes.ok) return null;
  const incrJson = (await incrRes.json()) as { result?: number };
  const count = Number(incrJson.result || 0);

  if (count === 1) {
    await fetch(`${base}/expire/${encodeURIComponent(key)}/${Math.max(1, Math.round(ttlSec))}`, {
      method: "POST",
      headers,
      cache: "no-store",
    }).catch(() => {});
  }

  return count;
}

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

function memoryIncr(key: string, ttlSec: number) {
  const now = nowSec();
  const prev = memoryCounters.get(key);
  if (!prev || now >= prev.resetAt) {
    const next = { count: 1, resetAt: now + ttlSec };
    memoryCounters.set(key, next);
    return next;
  }
  prev.count += 1;
  memoryCounters.set(key, prev);
  return prev;
}

export async function applyRateLimit(params: {
  namespace: string;
  identifier: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const namespace = (params.namespace || "global").trim().toLowerCase();
  const limit = Math.max(1, Math.round(params.limit || 1));
  const windowSec = Math.max(1, Math.round(params.windowSec || 60));
  const id = toSafeId(`${namespace}:${params.identifier || "anon"}`);
  const slot = Math.floor(nowSec() / windowSec);
  const key = `ogn:rl:${namespace}:${slot}:${id}`;

  const redisCount = await upstashIncr(key, windowSec).catch(() => null);
  const memory = memoryIncr(key, windowSec);
  const count = Number.isFinite(redisCount as number) ? Number(redisCount) : memory.count;
  const resetAt = (slot + 1) * windowSec;

  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    limit,
  };
}
