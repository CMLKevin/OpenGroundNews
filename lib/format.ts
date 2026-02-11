import { Story } from "@/lib/types";

export const STORY_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1600&q=80";

export function prettyDate(value: string) {
  const d = new Date(value);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function biasLabel(story: Story) {
  const entries: Array<[string, number]> = [
    ["Left", story.bias.left],
    ["Center", story.bias.center],
    ["Right", story.bias.right],
  ];
  const [side, value] = entries.sort((a, b) => b[1] - a[1])[0];
  return `${value}% ${side}`;
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

  // Ground News sometimes emits internal proxy image links like /_next/image?url=...
  if (value.startsWith("/_next/image")) {
    try {
      const parsed = new URL(`https://ground.news${value}`);
      const nested = parsed.searchParams.get("url");
      if (nested) {
        return sanitizeStoryImageUrl(decodeURIComponent(nested), fallback);
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

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

export function normalizeStory(story: Story): Story {
  const normalizedBias = normalizeBiasPercentages(story.bias);
  const normalizedSources = Array.isArray(story.sources) ? story.sources : [];

  return {
    ...story,
    bias: normalizedBias,
    sourceCount: normalizedSources.length > 0 ? normalizedSources.length : Math.max(0, story.sourceCount || 0),
    imageUrl: sanitizeStoryImageUrl(story.imageUrl),
    sources: normalizedSources,
  };
}
