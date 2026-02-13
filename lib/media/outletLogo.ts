import { buildImageProxyUrl } from "@/lib/media/imageProxyUrl";

function normalizeText(value?: string | null) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function outletInitials(outlet: string) {
  const words = normalizeText(outlet)
    .replace(/\.[a-z]{2,}$/i, "")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function normalizeHost(rawUrl?: string | null) {
  const clean = normalizeText(rawUrl);
  if (!clean) return "";
  try {
    return new URL(clean).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function normalizeExternalUrl(rawUrl?: string | null) {
  const clean = normalizeText(rawUrl);
  if (!clean) return "";
  try {
    const parsed = new URL(clean);
    if (!/^https?:$/i.test(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function isLikelyWeakLogoUrl(rawUrl: string) {
  const lower = rawUrl.toLowerCase();
  if (!lower) return true;
  if (lower.includes("ground.news/images/story-fallback")) return true;
  if (lower.includes("/images/story-fallback")) return true;
  if (lower.includes("/images/fallbacks/story-fallback")) return true;
  if (lower.includes("groundnews.b-cdn.net/interests/")) return true;
  if (lower.includes("ground.news/images/cache/")) return true;
  if (lower.includes("/assets/flags/")) return true;
  return false;
}

export function outletLogoCandidates(opts: {
  logoUrl?: string | null;
  websiteUrl?: string | null;
  sourceUrl?: string | null;
}) {
  const rawCandidates: string[] = [];
  const host = normalizeHost(opts.websiteUrl || "") || normalizeHost(opts.sourceUrl || "");
  if (host) {
    rawCandidates.push(`https://www.google.com/s2/favicons?domain=${host}&sz=128`);
    rawCandidates.push(`https://logo.clearbit.com/${host}`);
    rawCandidates.push(`https://${host}/favicon.ico`);
  }

  const providedLogo = normalizeExternalUrl(opts.logoUrl || "");
  if (providedLogo && !isLikelyWeakLogoUrl(providedLogo)) rawCandidates.push(providedLogo);

  const deduped = Array.from(new Set(rawCandidates.filter(Boolean)));
  return deduped.map((url) => buildImageProxyUrl(url, { kind: "logo" }));
}
