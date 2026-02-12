import { SourceArticle, Story } from "@/lib/types";

export const STORY_IMAGE_FALLBACK = "/images/story-fallback.svg";
const BIAS_TAG_PATTERN = /\b(lean left|lean right|far left|far right|left|right|center)\b/i;
const DOMAIN_PATTERN = /[a-z0-9-]+\.[a-z]{2,}/i;
const PLACEHOLDER_EXCERPT_PATTERN = /^coverage excerpt from /i;
const UUID_SLUG_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const parsed = new URL(value);
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
  const tags = sanitizeStoryTags(
    (Array.isArray(story.tags) ? story.tags : []).filter((tag) => !outletNames.has(tag.trim().toLowerCase())),
  );
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

  return {
    ...story,
    slug: normalizedSlug,
    dek: dedupedDek || undefined,
    author: cleanAuthor || undefined,
    summary: cleanSummary || story.summary,
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
