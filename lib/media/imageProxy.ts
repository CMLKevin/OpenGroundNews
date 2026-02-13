import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { validateExternalUrl } from "@/lib/security";
import { getObject, isObjectStoreEnabled, putObject } from "@/lib/media/objectStore";

const IMAGE_TTL_SEC = Math.max(60, Number(process.env.IMAGE_PROXY_TTL_SEC || 60 * 60 * 24 * 3));
const IMAGE_TIMEOUT_MS = Math.max(1000, Number(process.env.IMAGE_PROXY_TIMEOUT_MS || 12_000));
const IMAGE_MAX_BYTES = Math.max(10_000, Number(process.env.IMAGE_PROXY_MAX_BYTES || 6_000_000));
const CACHE_DIR = path.join(process.cwd(), "output", "cache", "images");
const FALLBACK_TTL_SEC = Math.max(300, Number(process.env.IMAGE_PROXY_FALLBACK_TTL_SEC || 60 * 60 * 6));

const BLOCKED_HOSTS = new Set<string>();
const RETRYABLE_STATUS = new Set([400, 401, 403, 404, 406, 408, 409, 410, 413, 415, 429, 500, 502, 503, 504]);

export type ProxiedImageKind = "generic" | "logo" | "story";

type FetchProxiedImageOptions = {
  kind?: ProxiedImageKind;
  failOpen?: boolean;
};

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

function likelyGroundCdnIcon(url: string) {
  const lower = String(url || "").toLowerCase();
  return lower.includes("groundnews.b-cdn.net/interests/");
}

function normalizeUrlVariants(rawUrl: string) {
  const clean = String(rawUrl || "").trim();
  if (!clean) return [];
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return [clean];
  }

  const variants: string[] = [parsed.toString()];
  const host = parsed.hostname.toLowerCase();

  if (host === "groundnews.b-cdn.net" && parsed.pathname.includes("/interests/")) {
    const cleanedPath = parsed.pathname.replace(/\/\[[^\]/]+\]\//g, "/");
    if (cleanedPath !== parsed.pathname) {
      const next = new URL(parsed.toString());
      next.pathname = cleanedPath;
      variants.push(next.toString());
    }
    const stripped = new URL(parsed.toString());
    ["width", "height", "format", "auto", "fit", "dpr", "quality", "q"].forEach((key) => stripped.searchParams.delete(key));
    variants.push(stripped.toString());
    if (stripped.pathname !== parsed.pathname) variants.push(`https://groundnews.b-cdn.net${stripped.pathname}`);
    variants.push(`https://groundnews.b-cdn.net${cleanedPath}`);
  }

  if ((host === "ground.news" || host === "www.ground.news") && parsed.pathname.startsWith("/images/cache/")) {
    variants.push(`https://ground.news${parsed.pathname}`);
    variants.push(`https://www.ground.news${parsed.pathname}`);
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const value of variants) {
    const key = String(value || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(key);
  }
  return deduped;
}

function localGroundCachePath(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host !== "ground.news" && host !== "www.ground.news") return "";
    if (!parsed.pathname.startsWith("/images/cache/")) return "";
    return path.join(process.cwd(), "public", parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
}

function guessContentTypeFromPath(filePath: string) {
  const lower = String(filePath || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

async function tryReadGroundCacheLocal(rawUrl: string) {
  const filePath = localGroundCachePath(rawUrl);
  if (!filePath) return null;
  try {
    const body = await fs.readFile(filePath);
    if (!body.length) return null;
    return {
      body,
      contentType: guessContentTypeFromPath(filePath),
      cacheControl: `public, max-age=${IMAGE_TTL_SEC}`,
    };
  } catch {
    return null;
  }
}

function hostLabel(rawUrl: string) {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./i, "");
    const token = host.split(".")[0] || "";
    return token.slice(0, 2).toUpperCase() || "OG";
  } catch {
    return "OG";
  }
}

function escapeHtml(text: string) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fallbackSvg(rawUrl: string, kind: ProxiedImageKind = "generic") {
  const label = escapeHtml(hostLabel(rawUrl));
  if (kind === "logo") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="60" fill="url(#g)" />
  <circle cx="64" cy="64" r="59" fill="none" stroke="#e5e7eb" stroke-width="2" />
  <text x="64" y="78" text-anchor="middle" fill="#f8fafc" font-size="42" font-family="Arial, Helvetica, sans-serif" font-weight="700">${label}</text>
</svg>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="Image unavailable">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dbeafe"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)" />
  <text x="600" y="320" text-anchor="middle" fill="#1f2937" font-size="40" font-family="Arial, Helvetica, sans-serif" font-weight="700">Image unavailable</text>
  <text x="600" y="368" text-anchor="middle" fill="#334155" font-size="24" font-family="Arial, Helvetica, sans-serif">${label}</text>
</svg>`;
}

function fallbackImage(rawUrl: string, kind: ProxiedImageKind = "generic") {
  const svg = fallbackSvg(rawUrl, kind);
  return {
    body: Buffer.from(svg, "utf8"),
    contentType: "image/svg+xml",
    cacheControl: `public, max-age=${FALLBACK_TTL_SEC}, stale-while-revalidate=86400`,
  };
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

export async function fetchProxiedImage(rawUrl: string, options: FetchProxiedImageOptions = {}) {
  const kind: ProxiedImageKind = options.kind || "generic";
  const failOpen = options.failOpen !== false;
  const validated = validateExternalUrl(rawUrl);
  if (!validated.ok) {
    if (!failOpen) return { ok: false as const, status: 400, error: validated.reason };
    const fallback = fallbackImage(rawUrl, kind);
    return { ok: true as const, ...fallback, cacheHit: false };
  }

  const parsed = new URL(validated.url);
  if (blockedHost(parsed.hostname)) {
    if (!failOpen) return { ok: false as const, status: 403, error: "Host blocked" };
    const fallback = fallbackImage(validated.url, kind);
    return { ok: true as const, ...fallback, cacheHit: false };
  }

  const normalizedCandidates = normalizeUrlVariants(validated.url);
  const key = cacheKeyForUrl(`${validated.url}|kind:${kind}`);

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

  let lastStatus = 0;
  let lastError = "";

  for (const candidateUrl of normalizedCandidates) {
    const localGroundCache = await tryReadGroundCacheLocal(candidateUrl);
    if (localGroundCache) {
      await Promise.all([
        writeFileCache(key, localGroundCache.body, localGroundCache.contentType).catch(() => {}),
        (isObjectStoreEnabled()
          ? putObject({
              key,
              body: localGroundCache.body,
              contentType: localGroundCache.contentType,
              cacheControl: localGroundCache.cacheControl,
            }).catch(() => false)
          : Promise.resolve(false)),
      ]);
      return {
        ok: true as const,
        body: localGroundCache.body,
        contentType: localGroundCache.contentType,
        cacheControl: localGroundCache.cacheControl,
        cacheHit: false,
      };
    }

    try {
      const response = await fetch(candidateUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          referer: "https://ground.news/",
        },
      });
      if (!response.ok) {
        lastStatus = response.status;
        lastError = `Upstream image fetch failed (${response.status})`;
        if (RETRYABLE_STATUS.has(response.status)) continue;
        break;
      }

      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (!contentTypeAllowed(contentType)) {
        lastStatus = 415;
        lastError = "Unsupported image content type";
        continue;
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > IMAGE_MAX_BYTES) {
        lastStatus = 413;
        lastError = "Image too large";
        continue;
      }

      const cacheControl = `public, max-age=${IMAGE_TTL_SEC}, stale-while-revalidate=86400`;
      await Promise.all([
        writeFileCache(key, bytes, contentType).catch(() => {}),
        (isObjectStoreEnabled() ? putObject({ key, body: bytes, contentType, cacheControl }).catch(() => false) : Promise.resolve(false)),
      ]);

      return {
        ok: true as const,
        body: bytes,
        contentType,
        cacheControl,
        cacheHit: false,
      };
    } catch (error) {
      lastStatus = 0;
      lastError = error instanceof Error ? error.message : "Image fetch failed";
      continue;
    }
  }

  if (!failOpen) {
    return {
      ok: false as const,
      status: lastStatus || 502,
      error: lastError || "Image fetch failed",
    };
  }

  const fallback = fallbackImage(validated.url, kind);
  await Promise.all([
    writeFileCache(key, fallback.body, fallback.contentType).catch(() => {}),
    (isObjectStoreEnabled()
      ? putObject({ key, body: fallback.body, contentType: fallback.contentType, cacheControl: fallback.cacheControl }).catch(() => false)
      : Promise.resolve(false)),
  ]);

  return {
    ok: true as const,
    body: fallback.body,
    contentType: fallback.contentType,
    cacheControl: fallback.cacheControl,
    cacheHit: false,
    fallback: true,
    fallbackReason: lastError || (likelyGroundCdnIcon(validated.url) ? "ground-cdn-icon-unavailable" : "upstream-unavailable"),
  };
}
