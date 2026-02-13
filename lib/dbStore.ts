import { db } from "@/lib/db";
import type { ArchiveEntry, SourceArticle, StoreShape, Story } from "@/lib/types";
import { outletSlug, storyHasTopicSlug } from "@/lib/lookup";
import { normalizeStory } from "@/lib/format";
import { inferTopicSlugFromText, topicMatchesSlug } from "@/lib/topics";

const CACHE_TTL_MS = Number(process.env.OGN_STORE_CACHE_TTL_MS || 45_000);

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const storeCache = new Map<string, CacheEntry<any>>();

function normalizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cacheGet<T>(key: string): T | null {
  const item = storeCache.get(key);
  if (!item) return null;
  if (Date.now() >= item.expiresAt) {
    storeCache.delete(key);
    return null;
  }
  return item.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs = CACHE_TTL_MS) {
  storeCache.set(key, { value, expiresAt: Date.now() + Math.max(5_000, ttlMs) });
}

const STORY_INCLUDE_BASE: any = {
  tags: true,
  sources: { include: { outlet: true } },
};

const STORY_INCLUDE_DETAIL: any = {
  ...STORY_INCLUDE_BASE,
  timelineEvents: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
  podcastReferences: true,
  readerLinks: true,
  relatedFrom: {
    include: {
      relatedStory: {
        select: { id: true, slug: true, title: true, imageUrl: true, publishedAt: true, topic: true },
      },
    },
  },
  snapshots: { orderBy: { createdAt: "desc" }, take: 6 },
  geo: true,
  brokeTheNewsSource: { include: { outlet: true } },
};

function toStory(row: any): Story {
  const tags = (row.tags || []).map((t: any) => t.tag);
  const sources: SourceArticle[] = (row.sources || []).map((s: any) => ({
    id: s.id,
    outlet: s.outlet?.name || "Unknown outlet",
    url: s.url,
    excerpt: s.excerpt || "",
    headline: s.headline || undefined,
    byline: s.byline || undefined,
    imageUrl: s.imageUrl || undefined,
    language: s.language || undefined,
    canonicalHash: s.canonicalHash || undefined,
    logoUrl: s.outlet?.logoUrl || undefined,
    bias: s.outlet?.bias || "unknown",
    biasRating: (s.outlet?.biasRating || "unknown").replace(/_/g, "-"),
    factuality: (s.outlet?.factuality || "unknown").replace("_", "-"),
    ownership: s.outlet?.ownership || "Unlabeled",
    publishedAt: s.publishedAt ? new Date(s.publishedAt).toISOString() : undefined,
    repostedBy: typeof s.repostedBy === "number" ? s.repostedBy : undefined,
    paywall: s.paywall || undefined,
    locality: s.locality || undefined,
  }));

  const timeline = (row.timelineEvents || []).map((event: any) => ({
    id: event.id,
    label: event.label,
    detail: event.detail || undefined,
    eventAt: event.eventAt ? new Date(event.eventAt).toISOString() : undefined,
    order: Number(event.order || 0) || 0,
  }));

  const podcasts = (row.podcastReferences || []).map((entry: any) => ({
    id: entry.id,
    label: entry.label || "Podcast",
    url: entry.url || undefined,
    provider: entry.provider || undefined,
  }));

  const readerLinkItems = (row.readerLinks || []).map((entry: any) => ({
    id: entry.id,
    label: entry.label || undefined,
    url: entry.url,
  }));

  const relatedStories = (row.relatedFrom || [])
    .map((edge: any) => ({
      id: edge.relatedStory?.id,
      slug: edge.relatedStory?.slug,
      title: edge.relatedStory?.title,
      imageUrl: edge.relatedStory?.imageUrl || undefined,
      publishedAt: edge.relatedStory?.publishedAt ? new Date(edge.relatedStory.publishedAt).toISOString() : undefined,
      topic: edge.relatedStory?.topic || undefined,
      reason: edge.reason || undefined,
    }))
    .filter((item: any) => item.id && item.slug && item.title);

  const snapshots = (row.snapshots || []).map((entry: any) => ({
    id: entry.id,
    sourceUrl: entry.sourceUrl || undefined,
    title: entry.title || undefined,
    body: entry.body || "",
    createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : undefined,
    metadata: entry.metadata || undefined,
  }));

  const refreshedAt = row.lastRefreshedAt ? new Date(row.lastRefreshedAt) : new Date(row.updatedAt);
  const staleAt = row.staleAt ? new Date(row.staleAt) : new Date(refreshedAt.getTime() + 7 * 86400000);
  const freshness = {
    lastRefreshedAt: refreshedAt.toISOString(),
    staleAt: staleAt.toISOString(),
    isStale: staleAt.getTime() <= Date.now(),
  };

  const fallbackBrokeTheNews = sources
    .filter((s) => s.publishedAt)
    .sort((a, b) => +new Date(String(a.publishedAt)) - +new Date(String(b.publishedAt)))[0];

  const brokeTheNews = row.brokeTheNewsSource
    ? {
        sourceId: row.brokeTheNewsSource.id,
        outlet: row.brokeTheNewsSource.outlet?.name || "Unknown outlet",
        publishedAt: row.brokeTheNewsSource.publishedAt
          ? new Date(row.brokeTheNewsSource.publishedAt).toISOString()
          : undefined,
      }
    : fallbackBrokeTheNews
      ? {
          sourceId: fallbackBrokeTheNews.id,
          outlet: fallbackBrokeTheNews.outlet,
          publishedAt: fallbackBrokeTheNews.publishedAt,
        }
      : null;

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
    tags,
    imageUrl: row.imageUrl,
    publishedAt: new Date(row.publishedAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    sourceCount: row.sourceCount,
    originalReportingPct:
      typeof row.originalReportingPct === "number" ? row.originalReportingPct : undefined,
    readTimeMinutes: typeof row.readTimeMinutes === "number" ? row.readTimeMinutes : undefined,
    lastRefreshedAt: row.lastRefreshedAt ? new Date(row.lastRefreshedAt).toISOString() : undefined,
    staleAt: row.staleAt ? new Date(row.staleAt).toISOString() : undefined,
    freshness,
    imageAssetKey: row.imageAssetKey || undefined,
    brokeTheNewsSourceId: row.brokeTheNewsSourceId || undefined,
    brokeTheNews,
    bias: { left: row.biasLeft, center: row.biasCenter, right: row.biasRight },
    blindspot: Boolean(row.isBlindspot),
    local: Boolean(row.isLocal),
    trending: Boolean(row.isTrending),
    sources,
    coverage: row.coverageTotal
      ? {
          totalSources: row.coverageTotal ?? undefined,
          leaningLeft: row.coverageLeft ?? undefined,
          center: row.coverageCenter ?? undefined,
          leaningRight: row.coverageRight ?? undefined,
        }
      : undefined,
    readerLinks: readerLinkItems.map((entry: any) => entry.url),
    timelineHeaders: timeline.map((entry: any) => entry.label).filter(Boolean),
    podcastReferences: podcasts.map((entry: any) => entry.label).filter(Boolean),
    timeline,
    podcasts,
    readerLinkItems,
    relatedStories,
    snapshots,
    geo:
      row.geo && typeof row.geo.lat === "number" && typeof row.geo.lon === "number"
        ? {
            lat: row.geo.lat,
            lon: row.geo.lon,
            locality: row.geo.locality || undefined,
            country: row.geo.country || undefined,
          }
        : undefined,
  };

  return normalizeStory(story);
}

export async function readStore(): Promise<StoreShape> {
  const cached = cacheGet<StoreShape>("readStore");
  if (cached) return cached;

  const stories = await db.story.findMany({
    orderBy: { updatedAt: "desc" },
    include: STORY_INCLUDE_BASE,
    take: 2000,
  });

  // Archive cache is DB-backed now; we only keep a minimal surface in this shim.
  const store = {
    stories: stories.map(toStory),
    archiveCache: {},
    ingestion: {
      lastRunAt: null,
      lastMode: null,
      storyCount: stories.length,
      routeCount: 0,
      notes: "",
    },
  };
  cacheSet("readStore", store);
  return store;
}

export async function listStories(params?: {
  topic?: string;
  view?: "all" | "blindspot" | "local" | "trending";
  limit?: number;
  edition?: string;
  location?: string;
}): Promise<Story[]> {
  const cacheKey = `listStories:${JSON.stringify({
    topic: params?.topic || "",
    view: params?.view || "all",
    limit: params?.limit ?? 500,
    edition: params?.edition || "",
    location: params?.location || "",
  })}`;
  const cached = cacheGet<Story[]>(cacheKey);
  if (cached) return cached;

  const where: any = {};
  if (params?.view === "blindspot") where.isBlindspot = true;
  if (params?.view === "local") where.isLocal = true;
  if (params?.view === "trending") where.isTrending = true;
  if (params?.edition && params.edition.toLowerCase() !== "all") {
    where.location = params.edition;
  }

  const rows = await db.story.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: STORY_INCLUDE_BASE,
    take: Math.max(1, Math.min(2000, params?.limit ?? 500)),
  });

  let stories = rows.map(toStory);

  if (params?.topic) {
    const needle = params.topic.trim().toLowerCase();
    stories = stories.filter((story) => {
      if (topicMatchesSlug(story.topic, needle)) return true;
      if (story.tags.some((tag) => topicMatchesSlug(tag, needle))) return true;
      const text = `${story.title} ${story.dek || ""} ${story.summary || ""} ${(story.tags || []).join(" ")}`;
      return inferTopicSlugFromText(text, story.topic) === needle;
    });
  }

  // Tag filtering in old store was slug-based via storyHasTopicSlug; preserve it where needed.
  if (params?.location) {
    const needle = params.location.trim().toLowerCase();
    stories = stories.filter((story) => {
      const haystack = `${story.location} ${story.topic} ${story.title} ${story.summary} ${story.tags.join(" ")}`
        .toLowerCase()
        .replace(/\s+/g, " ");
      return haystack.includes(needle);
    });
  }

  cacheSet(cacheKey, stories);
  return stories;
}

export async function listStoriesByTopicSlug(slug: string, params?: { limit?: number; edition?: string }): Promise<Story[]> {
  const base = await listStories({ view: "all", limit: 2000, edition: params?.edition });
  const needle = (slug || "").trim().toLowerCase();
  let filtered = base.filter((story) => storyHasTopicSlug(story, needle));

  // Fallback: if canonical topic tags are sparse in the dataset, infer topic from title/dek/summary text
  // so high-traffic hubs like US News/World/Science do not end up empty.
  if (filtered.length === 0 && needle) {
    filtered = base.filter((story) => {
      const text = `${story.title} ${story.dek || ""} ${story.summary || ""} ${(story.tags || []).join(" ")}`;
      return inferTopicSlugFromText(text, story.topic) === needle;
    });
  }
  const deduped = Array.from(
    filtered.reduce((acc, story) => {
      const canonical = normalizeText(story.canonicalUrl || "").toLowerCase();
      const title = normalizeText(story.title || "").toLowerCase();
      const key = canonical || `${story.slug}|${title}`;
      const prev = acc.get(key);
      if (!prev || +new Date(story.updatedAt) > +new Date(prev.updatedAt)) {
        acc.set(key, story);
      }
      return acc;
    }, new Map<string, Story>()).values(),
  );
  return deduped.slice(0, params?.limit ?? 2000);
}

export async function listStoriesByOutletSlug(slug: string, params?: { limit?: number; edition?: string }): Promise<Story[]> {
  const base = await listStories({ view: "all", limit: 2000, edition: params?.edition });
  const needle = (slug || "").trim().toLowerCase();
  const filtered = base.filter((story) => story.sources.some((source) => outletSlug(source.outlet).toLowerCase() === needle));
  return filtered.slice(0, params?.limit ?? 2000);
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const row = await db.story.findUnique({
    where: { slug },
    include: STORY_INCLUDE_DETAIL,
  });
  if (!row) return null;
  return toStory(row);
}

export async function getArchiveEntry(url: string): Promise<ArchiveEntry | null> {
  const originalUrl = (url || "").trim();
  if (!originalUrl) return null;
  const row = await db.archiveEntry.findUnique({ where: { originalUrl } });
  if (!row) return null;
  const ageMs = Date.now() - +new Date(row.checkedAt);
  if (row.status === "not_found" && ageMs > 24 * 60 * 60 * 1000) return null;
  return {
    originalUrl: row.originalUrl,
    status: row.status as any,
    archiveUrl: row.archiveUrl,
    title: row.title,
    notes: row.notes,
    paragraphs: Array.isArray(row.paragraphs) ? (row.paragraphs as any) : (row.paragraphs as any) || [],
    checkedAt: row.checkedAt.toISOString(),
  };
}

export async function setArchiveEntry(url: string, entry: ArchiveEntry): Promise<ArchiveEntry> {
  const originalUrl = (url || "").trim();
  if (!originalUrl) return entry;

  await db.archiveEntry.upsert({
    where: { originalUrl },
    update: {
      status: entry.status as any,
      archiveUrl: entry.archiveUrl,
      title: entry.title,
      notes: entry.notes,
      paragraphs: entry.paragraphs,
      checkedAt: new Date(entry.checkedAt),
    },
    create: {
      id: `arch_${originalUrl.slice(0, 64).replace(/[^a-z0-9]+/gi, "_")}_${Date.now()}`,
      originalUrl,
      status: entry.status as any,
      archiveUrl: entry.archiveUrl,
      title: entry.title,
      notes: entry.notes,
      paragraphs: entry.paragraphs,
      checkedAt: new Date(entry.checkedAt),
    },
  });

  return entry;
}

export async function getDashboardStats() {
  const storyCount = await db.story.count();
  const sourceArticleCount = await db.sourceArticle.count();
  const uniqueOutletCount = await db.outlet.count();
  const archiveCacheCount = await db.archiveEntry.count();
  const lastRun = await db.ingestionRun.findFirst({ orderBy: { startedAt: "desc" } });

  return {
    storyCount,
    uniqueOutletCount,
    sourceArticleCount,
    archiveCacheCount,
    ingestion: {
      lastRunAt: lastRun?.startedAt ? lastRun.startedAt.toISOString() : null,
      lastMode: "groundnews",
      status: lastRun?.status ?? null,
      storyCount,
      routeCount: lastRun?.routeCount ?? 0,
      uniqueStoryLinks: lastRun?.uniqueStoryLinks ?? 0,
      ingestedStories: lastRun?.ingestedStories ?? 0,
      finishedAt: lastRun?.finishedAt ? lastRun.finishedAt.toISOString() : null,
    },
  };
}
