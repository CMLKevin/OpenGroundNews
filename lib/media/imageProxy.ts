import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { validateExternalUrl } from "@/lib/security";
import { getObject, isObjectStoreEnabled, putObject } from "@/lib/media/objectStore";

const IMAGE_TTL_SEC = Math.max(60, Number(process.env.IMAGE_PROXY_TTL_SEC || 60 * 60 * 24 * 3));
const IMAGE_TIMEOUT_MS = Math.max(1000, Number(process.env.IMAGE_PROXY_TIMEOUT_MS || 12_000));
const IMAGE_MAX_BYTES = Math.max(10_000, Number(process.env.IMAGE_PROXY_MAX_BYTES || 6_000_000));
const CACHE_DIR = path.join(process.cwd(), "output", "cache", "images");

const BLOCKED_HOSTS = new Set(["ground.news", "www.ground.news"]);

function cacheKeyForUrl(url: string) {
  const hash = createHash("sha256").update(url).digest("hex");
  return `img/${hash.slice(0, 2)}/${hash.slice(2)}.bin`;
}

function contentTypeAllowed(contentType: string) {
  const clean = String(contentType || "").toLowerCase();
  return clean.startsWith("image/");
}

function blockedHost(hostname: string) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  return BLOCKED_HOSTS.has(host) || host.endsWith(".internal") || host.endsWith(".local");
}

async function readFileCache(key: string) {
  const filePath = path.join(CACHE_DIR, key.replace(/^img\//, ""));
  try {
    const metaPath = `${filePath}.json`;
    const [metaRaw, body] = await Promise.all([fs.readFile(metaPath, "utf8"), fs.readFile(filePath)]);
    const meta = JSON.parse(metaRaw) as { contentType?: string; createdAt?: number };
    if (!meta?.createdAt || Date.now() - meta.createdAt > IMAGE_TTL_SEC * 1000) return null;
    return {
      body,
      contentType: String(meta.contentType || "application/octet-stream"),
      cacheControl: `public, max-age=${IMAGE_TTL_SEC}`,
    };
  } catch {
    return null;
  }
}

async function writeFileCache(key: string, body: Buffer, contentType: string) {
  const filePath = path.join(CACHE_DIR, key.replace(/^img\//, ""));
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const metaPath = `${filePath}.json`;
  await Promise.all([
    fs.writeFile(filePath, body),
    fs.writeFile(
      metaPath,
      JSON.stringify({ contentType, createdAt: Date.now() }),
      "utf8",
    ),
  ]);
}

export async function fetchProxiedImage(rawUrl: string) {
  const validated = validateExternalUrl(rawUrl);
  if (!validated.ok) return { ok: false as const, status: 400, error: validated.reason };

  const parsed = new URL(validated.url);
  if (blockedHost(parsed.hostname)) {
    return { ok: false as const, status: 403, error: "Host blocked" };
  }

  const key = cacheKeyForUrl(validated.url);

  const remoteCached = await getObject({ key });
  if (remoteCached) {
    return {
      ok: true as const,
      body: Buffer.from(remoteCached.body),
      contentType: remoteCached.contentType,
      cacheControl: remoteCached.cacheControl || `public, max-age=${IMAGE_TTL_SEC}`,
      cacheHit: true,
    };
  }

  const localCached = await readFileCache(key);
  if (localCached) {
    return {
      ok: true as const,
      body: localCached.body,
      contentType: localCached.contentType,
      cacheControl: localCached.cacheControl,
      cacheHit: true,
    };
  }

  const response = await fetch(validated.url, {
    cache: "no-store",
    signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      referer: "https://ground.news/",
    },
  });

  if (!response.ok) {
    return { ok: false as const, status: response.status, error: `Upstream image fetch failed (${response.status})` };
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!contentTypeAllowed(contentType)) {
    return { ok: false as const, status: 415, error: "Unsupported image content type" };
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > IMAGE_MAX_BYTES) {
    return { ok: false as const, status: 413, error: "Image too large" };
  }

  const cacheControl = `public, max-age=${IMAGE_TTL_SEC}, stale-while-revalidate=86400`;
  await Promise.all([
    writeFileCache(key, bytes, contentType).catch(() => {}),
    (isObjectStoreEnabled()
      ? putObject({ key, body: bytes, contentType, cacheControl }).catch(() => false)
      : Promise.resolve(false)),
  ]);

  return {
    ok: true as const,
    body: bytes,
    contentType,
    cacheControl,
    cacheHit: false,
  };
}
