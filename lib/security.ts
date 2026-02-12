import net from "node:net";

const API_KEY_HEADER = "x-ogn-api-key";

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;

  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const value = hostname.toLowerCase();
  if (value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")) {
    return true;
  }
  return false;
}

function isPrivateHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (normalized.endsWith(".local")) return true;

  const ipType = net.isIP(normalized);
  if (ipType === 4) return isPrivateIpv4(normalized);
  if (ipType === 6) return isPrivateIpv6(normalized);
  return false;
}

export function validateExternalUrl(value: string): { ok: true; url: string } | { ok: false; reason: string } {
  const raw = value.trim();
  if (!raw) return { ok: false, reason: "Missing URL" };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid URL format" };
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    return { ok: false, reason: "Only http/https URLs are supported" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "Credentialed URLs are not allowed" };
  }
  if (isPrivateHost(parsed.hostname)) {
    return { ok: false, reason: "Private or local network URLs are not allowed" };
  }

  return { ok: true, url: parsed.toString() };
}

export function getApiKeyFromRequest(request: Request): string | null {
  const direct = request.headers.get(API_KEY_HEADER);
  if (direct) return direct;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function isAuthorizedApiRequest(request: Request): { ok: true } | { ok: false; reason: string; status: number } {
  const expected = process.env.OGN_API_KEY || process.env.OPEN_GROUND_NEWS_API_KEY;
  if (!expected) {
    return {
      ok: false,
      reason: "Server API key is not configured",
      status: 503,
    };
  }

  const provided = getApiKeyFromRequest(request);
  if (!provided || provided !== expected) {
    return {
      ok: false,
      reason: `Unauthorized. Provide ${API_KEY_HEADER} header.`,
      status: 401,
    };
  }
  return { ok: true };
}

export function sanitizeServerErrorMessage(error: unknown): string {
  const fallback = "Operation failed";
  if (!(error instanceof Error)) return fallback;
  const cwd = process.cwd().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutCwd = error.message.replace(new RegExp(cwd, "g"), "[workspace]");
  return withoutCwd
    .replace(/\/[^\s]*\/[^/\s]+\.(?:mjs|ts|tsx|js|json)(?::\d+:\d+)?/g, "[path]")
    .replace(/[A-Za-z]:\\[^:\n]+/g, "[path]");
}
