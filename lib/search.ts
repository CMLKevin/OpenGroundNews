import { Story } from "@/lib/types";
import { readStore } from "@/lib/store";
import { outletSlug, topicSlug } from "@/lib/lookup";
import { db } from "@/lib/db";
import { normalizeStory } from "@/lib/format";

function normalize(value: string) {
  return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function dominantBiasBucket(story: Story): "left" | "center" | "right" {
  const l = Number(story.bias?.left || 0) || 0;
  const c = Number(story.bias?.center || 0) || 0;
  const r = Number(story.bias?.right || 0) || 0;
  if (l >= c && l >= r) return "left";
  if (c >= l && c >= r) return "center";
  return "right";
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 12);
}

function scoreHaystack(haystack: string, tokens: string[]): number {
  if (!haystack) return 0;
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (haystack.includes(token)) score += 1;
  }
  return score;
}

function storyScore(story: Story, tokens: string[], q: string): number {
  const title = normalize(story.title);
  const summary = normalize(story.summary);
  const dek = normalize(story.dek || "");
  const topic = normalize(story.topic);
  const tags = normalize((story.tags || []).join(" "));
  const outlets = normalize((story.sources || []).map((s) => s.outlet).join(" "));

  let score = 0;
  const phrase = normalize(q);
  if (phrase && title.includes(phrase)) score += 60;
  if (phrase && summary.includes(phrase)) score += 35;

  score += scoreHaystack(title, tokens) * 12;
  score += scoreHaystack(summary, tokens) * 8;
  score += scoreHaystack(dek, tokens) * 7;
  score += scoreHaystack(topic, tokens) * 10;
  score += scoreHaystack(tags, tokens) * 5;
  score += scoreHaystack(outlets, tokens) * 4;

  // Mild recency boost: newer stories float up among ties.
  const updated = +new Date(story.updatedAt || 0);
  if (Number.isFinite(updated) && updated > 0) score += Math.min(10, Math.floor((Date.now() - updated) / -86400000));

  return score;
}

function toStoryFromDbRow(row: any): Story {
  const story: Story = {
    id: row.id,
    slug: row.slug,
    canonicalUrl: row.canonicalUrl || undefined,
    title: row.title,
    dek: row.dek || undefined,
    author: row.author || undefined,
    summary: row.summary,
    topic: row.topic,
    location: row.location,
    tags: (row.tags || []).map((t: any) => t.tag),
    imageUrl: row.imageUrl,
    publishedAt: new Date(row.publishedAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    sourceCount: row.sourceCount,
    originalReportingPct: typeof row.originalReportingPct === "number" ? row.originalReportingPct : undefined,
    bias: {
      left: row.biasLeft,
      center: row.biasCenter,
      right: row.biasRight,
    },
    blindspot: Boolean(row.isBlindspot),
    local: Boolean(row.isLocal),
    trending: Boolean(row.isTrending),
    sources: (row.sources || []).map((s: any) => ({
      id: s.id,
      outlet: s.outlet?.name || "Unknown outlet",
      url: s.url,
      excerpt: s.excerpt || "",
      logoUrl: s.outlet?.logoUrl || undefined,
      bias: s.outlet?.bias || "unknown",
      biasRating: (s.outlet?.biasRating || "unknown").replace(/_/g, "-"),
      factuality: (s.outlet?.factuality || "unknown").replace(/_/g, "-"),
      ownership: s.outlet?.ownership || "Unlabeled",
      publishedAt: s.publishedAt ? new Date(s.publishedAt).toISOString() : undefined,
      repostedBy: typeof s.repostedBy === "number" ? s.repostedBy : undefined,
      paywall: s.paywall || undefined,
      locality: s.locality || undefined,
    })),
    coverage: row.coverageTotal
      ? {
          totalSources: row.coverageTotal ?? undefined,
          leaningLeft: row.coverageLeft ?? undefined,
          center: row.coverageCenter ?? undefined,
          leaningRight: row.coverageRight ?? undefined,
        }
      : undefined,
  };
  return normalizeStory(story);
}

async function queryStoriesFromDb(params: {
  q: string;
  edition?: string;
  time?: "all" | "24h" | "7d" | "30d";
}) {
  const query = params.q.trim();
  if (!query) return [];

  const where: any = {
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { summary: { contains: query, mode: "insensitive" } },
      { topic: { contains: query, mode: "insensitive" } },
      { tags: { some: { tag: { contains: query, mode: "insensitive" } } } },
      { sources: { some: { outlet: { name: { contains: query, mode: "insensitive" } } } } },
    ],
  };

  if (params.edition && params.edition.toLowerCase() !== "all") {
    where.location = params.edition;
  }

  if (params.time && params.time !== "all") {
    const now = Date.now();
    const windowMs =
      params.time === "24h"
        ? 24 * 60 * 60 * 1000
        : params.time === "7d"
          ? 7 * 24 * 60 * 60 * 1000
          : params.time === "30d"
            ? 30 * 24 * 60 * 60 * 1000
            : 0;
    if (windowMs > 0) {
      where.publishedAt = { gte: new Date(now - windowMs) };
    }
  }

  const rows = await db.story.findMany({
    where,
    include: {
      tags: true,
      sources: { include: { outlet: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 600,
  });

  return rows.map(toStoryFromDbRow);
}

export async function searchStories(params: {
  q: string;
  edition?: string;
  limit?: number;
  bias?: "all" | "left" | "center" | "right";
  time?: "all" | "24h" | "7d" | "30d";
}) {
  const q = (params.q || "").trim();
  const limit = Math.max(1, Math.min(200, params.limit ?? 60));
  const tokens = tokenize(q);

  if (!q) {
    return {
      q,
      count: 0,
      stories: [] as Story[],
      facets: { topics: [], outlets: [] } as const,
    };
  }

  let stories: Story[] = [];
  try {
    stories = await queryStoriesFromDb({ q, edition: params.edition, time: params.time });
  } catch {
    const store = await readStore();
    stories = store.stories;
    if (params.edition && params.edition.toLowerCase() !== "all") {
      const edition = params.edition.trim().toLowerCase();
      stories = stories.filter((story) => story.location.trim().toLowerCase() === edition);
    }
    if (params.time && params.time !== "all") {
      const now = Date.now();
      const windowMs =
        params.time === "24h"
          ? 24 * 60 * 60 * 1000
          : params.time === "7d"
            ? 7 * 24 * 60 * 60 * 1000
            : params.time === "30d"
              ? 30 * 24 * 60 * 60 * 1000
              : 0;
      if (windowMs > 0) {
        const cutoff = now - windowMs;
        stories = stories.filter((s) => {
          const ts = Date.parse(s.publishedAt || s.updatedAt || "");
          return Number.isFinite(ts) && ts >= cutoff;
        });
      }
    }
  }

  if (params.bias && params.bias !== "all") {
    const b = params.bias;
    stories = stories.filter((s) => dominantBiasBucket(s) === b);
  }

  const scored = stories
    .map((story) => ({ story, score: storyScore(story, tokens, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || +new Date(b.story.updatedAt) - +new Date(a.story.updatedAt));

  const top = scored.slice(0, limit).map((item) => item.story);

  const topicCounts = new Map<string, { slug: string; label: string; count: number }>();
  const outletCounts = new Map<string, { slug: string; label: string; count: number }>();
  for (const story of top) {
    const tSlug = topicSlug(story.topic);
    const t = topicCounts.get(tSlug) || { slug: tSlug, label: story.topic, count: 0 };
    t.count += 1;
    topicCounts.set(tSlug, t);

    for (const src of story.sources || []) {
      const oSlug = outletSlug(src.outlet);
      const o = outletCounts.get(oSlug) || { slug: oSlug, label: src.outlet, count: 0 };
      o.count += 1;
      outletCounts.set(oSlug, o);
    }
  }

  return {
    q,
    count: scored.length,
    stories: top,
    facets: {
      topics: Array.from(topicCounts.values()).sort((a, b) => b.count - a.count).slice(0, 12),
      outlets: Array.from(outletCounts.values()).sort((a, b) => b.count - a.count).slice(0, 12),
    },
  };
}
