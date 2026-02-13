import { SourceArticle, Story } from "@/lib/types";

export const STORY_IMAGE_FALLBACK = "/images/story-fallback.svg";
export const STORY_IMAGE_FALLBACK_THUMB = "/images/story-fallback-thumb.svg";
export const STORY_IMAGE_FALLBACK_VARIANTS = [
  "/images/fallbacks/story-fallback-1.svg",
  "/images/fallbacks/story-fallback-2.svg",
  "/images/fallbacks/story-fallback-3.svg",
  "/images/fallbacks/story-fallback-4.svg",
  "/images/fallbacks/story-fallback-5.svg",
  "/images/fallbacks/story-fallback-6.svg",
] as const;

function stableHash32(input: string): number {
  // Small, deterministic hash to pick fallback variants.
  // (Not crypto; just stable across runtimes.)
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickStoryFallbackImage(seed: string, opts?: { kind?: "thumb" | "story" }) {
  const kind = opts?.kind ?? "story";
  if (kind === "thumb") return STORY_IMAGE_FALLBACK_THUMB;
  const key = (seed || "story").trim().toLowerCase() || "story";
  const idx = stableHash32(key) % STORY_IMAGE_FALLBACK_VARIANTS.length;
  return STORY_IMAGE_FALLBACK_VARIANTS[idx] || STORY_IMAGE_FALLBACK;
}
const BIAS_TAG_PATTERN = /\b(lean left|lean right|far left|far right|left|right|center)\b/i;
const DOMAIN_PATTERN = /[a-z0-9-]+\.[a-z]{2,}/i;
const PLACEHOLDER_EXCERPT_PATTERN = /^coverage excerpt from /i;
const UUID_SLUG_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMMON_TOPIC_WHITELIST = new Set(
  [
    "Politics",
    "US Politics",
    "World",
    "Business",
    "Business & Markets",
    "Markets",
    "Economy",
    "Technology",
    "Science",
    "Health",
    "Health & Medicine",
    "Sports",
    "Entertainment",
    "Climate",
    "Education",
    "Law",
    "Immigration",
    "Elections",
    "Top Stories",
    "News",
    "United States",
    "Canada",
    "United Kingdom",
    "Europe",
  ].map((v) => v.toLowerCase()),
);

export function prettyDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function prettyRelativeDate(value: string, nowTs = Date.now()) {
  const ts = Date.parse(String(value || ""));
  if (!Number.isFinite(ts)) return "Unknown";
  const deltaMs = ts - nowTs;
  const absMs = Math.abs(deltaMs);

  const units: Array<{ limit: number; unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
    { limit: 60 * 1000, unit: "second", ms: 1000 },
    { limit: 60 * 60 * 1000, unit: "minute", ms: 60 * 1000 },
    { limit: 24 * 60 * 60 * 1000, unit: "hour", ms: 60 * 60 * 1000 },
    { limit: 7 * 24 * 60 * 60 * 1000, unit: "day", ms: 24 * 60 * 60 * 1000 },
    { limit: 30 * 24 * 60 * 60 * 1000, unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
    { limit: 365 * 24 * 60 * 60 * 1000, unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
    { limit: Number.POSITIVE_INFINITY, unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  ];

  const selected = units.find((entry) => absMs < entry.limit) || units[units.length - 1];
  const valueForUnit = Math.round(deltaMs / selected.ms);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  return rtf.format(valueForUnit, selected.unit);
}

export function biasLabel(story: Story) {
  if (story.bias.left + story.bias.center + story.bias.right <= 0) {
    return "No bias data";
  }
  const entries: Array<[string, number]> = [
    ["Left", story.bias.left],
    ["Center", story.bias.center],
    ["Right", story.bias.right],
  ];
  const [side, value] = entries.sort((a, b) => b[1] - a[1])[0];
  return `${value}% ${side}`;
}

export function formatSourceCount(story: Story): { tracked: number; total: number } {
  const tracked = Array.isArray(story.sources) ? story.sources.length : 0;
  const totalCandidate = story.coverage?.totalSources ?? story.sourceCount;
  const total = typeof totalCandidate === "number" && Number.isFinite(totalCandidate) ? Math.max(tracked, totalCandidate) : tracked;
  return { tracked, total };
}

export function sourceCountLabel(story: Story): string {
  const { tracked, total } = formatSourceCount(story);
  if (tracked > 0 && total > tracked) return `${tracked} of ${total} sources`;
  if (total > 0) return `${total} sources`;
  return `${tracked} sources`;
}

export function compactHost(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

export function estimateReadTimeMinutes(text: string, opts?: { wpm?: number; min?: number; max?: number }) {
  const wpm = opts?.wpm ?? 220;
  const min = opts?.min ?? 1;
  const max = opts?.max ?? 25;
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return min;
  const words = clean.split(" ").filter(Boolean).length;
  const minutes = Math.ceil(words / Math.max(120, wpm));
  return Math.max(min, Math.min(max, minutes));
}

export function storyReadTimeMinutes(story: Story) {
  const excerptBlob = (story.sources || [])
    .slice(0, 12)
    .map((source) => source.excerpt || "")
    .join(" ");
  const blob = `${story.title} ${story.dek || ""} ${story.summary || ""} ${excerptBlob}`.trim();
  const base = estimateReadTimeMinutes(blob);
  const sourceCandidate = story.coverage?.totalSources ?? story.sourceCount ?? (story.sources || []).length;
  const sourceCount = Number.isFinite(sourceCandidate) ? Math.max(0, Math.round(sourceCandidate as number)) : 0;
  const sourceBoost = sourceCount > 1 ? Math.min(6, Math.floor(Math.log2(sourceCount))) : 0;
  return Math.max(1, Math.min(30, base + sourceBoost));
}

function clampInt(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export function normalizeBiasPercentages(input: { left: number; center: number; right: number }) {
  const values = [clampInt(input.left), clampInt(input.center), clampInt(input.right)];
  const sum = values.reduce((acc, v) => acc + v, 0);
  if (sum <= 0) {
    return { left: 0, center: 0, right: 0 };
  }

  const scaled = values.map((v) => (v / sum) * 100);
  const floors = scaled.map((v) => Math.floor(v));
  let remainder = 100 - floors.reduce((acc, v) => acc + v, 0);

  const order = scaled
    .map((value, index) => ({ index, fractional: value - floors[index] }))
    .sort((a, b) => b.fractional - a.fractional);

  for (let i = 0; i < order.length && remainder > 0; i += 1) {
    floors[order[i].index] += 1;
    remainder -= 1;
  }

  return {
    left: floors[0],
    center: floors[1],
    right: floors[2],
  };
}

export function sanitizeStoryImageUrl(rawUrl?: string, fallback = STORY_IMAGE_FALLBACK): string {
  if (!rawUrl || !rawUrl.trim()) return fallback;
  let value = rawUrl.trim();

  const unwrapNextImage = (input: string): string | null => {
    const clean = (input || "").trim();
    if (!clean) return null;
    try {
      const parsed = clean.startsWith("/_next/image") ? new URL(`https://ground.news${clean}`) : new URL(clean);
      if (parsed.pathname !== "/_next/image") return null;
      const nested = parsed.searchParams.get("url");
      if (!nested) return null;
      try {
        return decodeURIComponent(nested);
      } catch {
        return nested;
      }
    } catch {
      return null;
    }
  };

  // Ground News sometimes emits internal proxy image links like /_next/image?url=...
  // Those break cross-origin (403) on our domain, so unwrap them.
  const unwrapped = unwrapNextImage(value);
  if (unwrapped) return sanitizeStoryImageUrl(unwrapped, fallback);

  if (value.startsWith("//")) value = `https:${value}`;
  if (value.startsWith("/images/cache/")) return value;
  if (value.startsWith("/images/fallbacks/story-fallback-")) return value;
  if (value === STORY_IMAGE_FALLBACK || value === STORY_IMAGE_FALLBACK_THUMB) return value;
  if (value.startsWith("/")) return fallback;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;

    // Ignore tiny flag/icon assets that are not story art.
    if (/groundnews\.b-cdn\.net$/i.test(parsed.hostname) && /\/assets\/flags\//i.test(parsed.pathname)) {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function sanitizeAssetUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || !rawUrl.trim()) return undefined;
  let value = rawUrl.trim();
  if (value.startsWith("//")) value = `https:${value}`;
  const unwrapNextImage = (input: string): string | null => {
    const clean = (input || "").trim();
    if (!clean) return null;
    try {
      const parsed = clean.startsWith("/_next/image") ? new URL(`https://ground.news${clean}`) : new URL(clean);
      if (parsed.pathname !== "/_next/image") return null;
      const nested = parsed.searchParams.get("url");
      if (!nested) return null;
      try {
        return decodeURIComponent(nested);
      } catch {
        return nested;
      }
    } catch {
      return null;
    }
  };

  const unwrapped = unwrapNextImage(value);
  if (unwrapped) return sanitizeAssetUrl(unwrapped);

  try {
    const repaired = value
      .replace(/\/\[[^\]]+\]\//g, "/")
      .replace(/%5B[^\]]*%5D/gi, "");
    const parsed = new URL(repaired);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 110) || "story";
}

function sanitizeTag(tag: string): string | null {
  const clean = tag.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  if (clean.length < 2 || clean.length > 60) return null;
  if (BIAS_TAG_PATTERN.test(clean)) return null;
  if (DOMAIN_PATTERN.test(clean)) return null;
  return clean;
}

function canonicalizeLooseLabel(value: string): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\.[a-z]{2,}$/i, "") // drop simple TLDs (best-effort)
    .replace(/[^a-z0-9]+/g, "");
}

function extractKeywordTokens(value: string): string[] {
  const stop = new Set(["the", "and", "for", "with", "from", "into", "over", "under", "about", "your", "news"]);
  return (value || "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !stop.has(t));
}

function tagSeemsRelevant(tag: string, storyText: string): boolean {
  const clean = tag.trim();
  if (!clean) return false;
  const key = clean.toLowerCase();
  if (COMMON_TOPIC_WHITELIST.has(key)) return true;
  const tokens = extractKeywordTokens(clean);
  if (tokens.length === 0) return false;
  return tokens.some((t) => storyText.includes(t));
}

export function sanitizeStoryTags(tags: string[]): string[] {
  const dedupKeys = new Set<string>();
  const dedup: string[] = [];
  for (const tag of tags) {
    const normalized = sanitizeTag(tag);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (dedupKeys.has(key)) continue;
    dedupKeys.add(key);
    dedup.push(normalized);
    if (dedup.length >= 8) break;
  }
  return dedup;
}

export function isPlaceholderExcerpt(value: string): boolean {
  return PLACEHOLDER_EXCERPT_PATTERN.test((value || "").trim());
}

export function normalizeStory(story: Story): Story {
  const normalizedSources: SourceArticle[] = (Array.isArray(story.sources) ? story.sources : []).map((source) => {
    const normalizedLogo = sanitizeAssetUrl(source.logoUrl);
    if (!isPlaceholderExcerpt(source.excerpt)) {
      return {
        ...source,
        logoUrl: normalizedLogo,
      };
    }

    // If the excerpt we saved is a known placeholder, keep whatever metadata we already have
    // (bias/factuality/ownership/etc.) but replace just the excerpt text.
    return {
      ...source,
      logoUrl: normalizedLogo,
      excerpt: "Excerpt unavailable from publisher metadata.",
    };
  });

  const knownBias = normalizedSources.filter((src) => src.bias !== "unknown");
  const counted = {
    left: knownBias.filter((src) => src.bias === "left").length,
    center: knownBias.filter((src) => src.bias === "center").length,
    right: knownBias.filter((src) => src.bias === "right").length,
  };
  const derivedBias =
    knownBias.length > 0
      ? normalizeBiasPercentages({
          left: Math.round((counted.left / knownBias.length) * 100),
          center: Math.round((counted.center / knownBias.length) * 100),
          right: Math.round((counted.right / knownBias.length) * 100),
        })
      : { left: 0, center: 0, right: 0 };

  const hasBias = story.bias.left + story.bias.center + story.bias.right > 0;
  const normalizedBias = hasBias ? normalizeBiasPercentages(story.bias) : derivedBias;

  const normalizedSlug = UUID_SLUG_PATTERN.test(story.slug) ? slugify(story.title) : story.slug;
  const outletNames = new Set(
    normalizedSources.map((source) => source.outlet.trim().toLowerCase()).filter(Boolean),
  );
  const outletLooseKeys = new Set(
    normalizedSources
      .flatMap((source) => {
        const host = compactHost(source.url || "");
        const outlet = source.outlet || "";
        return [canonicalizeLooseLabel(outlet), canonicalizeLooseLabel(host)];
      })
      .filter(Boolean),
  );

  const rawTags = Array.isArray(story.tags) ? story.tags : [];
  const storyTextForRelevance = `${story.title || ""} ${story.summary || ""} ${story.dek || ""}`.toLowerCase();
  const filteredTagsBase = rawTags
    .filter((tag) => {
      const clean = (tag || "").trim().toLowerCase();
      if (!clean) return false;
      if (outletNames.has(clean)) return false;
      const loose = canonicalizeLooseLabel(clean);
      if (loose && outletLooseKeys.has(loose)) return false;
      return true;
    });

  const relevantTags = filteredTagsBase.filter((tag) => tagSeemsRelevant(String(tag), storyTextForRelevance));
  const filteredTags = relevantTags.length >= 2 ? relevantTags : filteredTagsBase;

  const tags = sanitizeStoryTags(filteredTags);
  const coverage = story.coverage ?? {};
  const safeCoverage = {
    totalSources: typeof coverage.totalSources === "number" && Number.isFinite(coverage.totalSources) ? Math.max(0, Math.round(coverage.totalSources)) : undefined,
    leaningLeft: typeof coverage.leaningLeft === "number" && Number.isFinite(coverage.leaningLeft) ? Math.max(0, Math.round(coverage.leaningLeft)) : undefined,
    center: typeof coverage.center === "number" && Number.isFinite(coverage.center) ? Math.max(0, Math.round(coverage.center)) : undefined,
    leaningRight: typeof coverage.leaningRight === "number" && Number.isFinite(coverage.leaningRight) ? Math.max(0, Math.round(coverage.leaningRight)) : undefined,
  };
  const readerLinks = Array.isArray(story.readerLinks)
    ? Array.from(new Set(story.readerLinks.map((url) => (url || "").trim()).filter(Boolean))).slice(0, 12)
    : [];
  const timelineHeaders = Array.isArray(story.timelineHeaders)
    ? Array.from(new Set(story.timelineHeaders.map((item) => item.trim()).filter(Boolean))).slice(0, 12)
    : [];
  const podcastReferences = Array.isArray(story.podcastReferences)
    ? Array.from(new Set(story.podcastReferences.map((item) => item.trim()).filter(Boolean))).slice(0, 12)
    : [];
  const cleanDek = (story.dek || "").trim();
  const cleanAuthor = (story.author || "").trim();
  const cleanSummary = (story.summary || "").trim();
  const dedupedDek = cleanDek && cleanSummary && cleanDek === cleanSummary ? "" : cleanDek;

  const cleanTopic = (story.topic || "").trim() || "Top Stories";
  const topicKey = cleanTopic.toLowerCase();
  const topicLooksRelevant =
    COMMON_TOPIC_WHITELIST.has(topicKey) || extractKeywordTokens(cleanTopic).some((t) => storyTextForRelevance.includes(t));
  const topicCandidate = topicLooksRelevant ? cleanTopic : (tags[0] || cleanTopic);

  return {
    ...story,
    slug: normalizedSlug,
    dek: dedupedDek || undefined,
    author: cleanAuthor || undefined,
    summary: cleanSummary || story.summary,
    topic: topicCandidate,
    bias: normalizedBias,
    sourceCount: Math.max(
      normalizedSources.length,
      typeof safeCoverage.totalSources === "number" ? safeCoverage.totalSources : 0,
      Number.isFinite(story.sourceCount) ? Math.max(0, Math.round(story.sourceCount)) : 0,
    ),
    imageUrl: sanitizeStoryImageUrl(story.imageUrl),
    sources: normalizedSources,
    tags: tags.length > 0 ? tags : ["News"],
    coverage: safeCoverage,
    readerLinks,
    timelineHeaders,
    podcastReferences,
  };
}
