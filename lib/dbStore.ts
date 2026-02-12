import { db } from "@/lib/db";
import type { ArchiveEntry, SourceArticle, StoreShape, Story } from "@/lib/types";
import { outletSlug, storyHasTopicSlug } from "@/lib/lookup";
import { normalizeStory } from "@/lib/format";

function toStory(row: any): Story {
  const tags = (row.tags || []).map((t: any) => t.tag);
  const sources: SourceArticle[] = (row.sources || []).map((s: any) => ({
    id: s.id,
    outlet: s.outlet?.name || "Unknown outlet",
    url: s.url,
    excerpt: s.excerpt || "",
    logoUrl: s.outlet?.logoUrl || undefined,
    bias: s.outlet?.bias || "unknown",
    biasRating: (s.outlet?.biasRating || "unknown").replace(/_/g, "-"),
    factuality: (s.outlet?.factuality || "unknown").replace("_", "-"),
    ownership: s.outlet?.ownership || "Unlabeled",
    publishedAt: s.publishedAt ? new Date(s.publishedAt).toISOString() : undefined,
    paywall: s.paywall || undefined,
    locality: s.locality || undefined,
  }));

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
  };

  return normalizeStory(story);
}

export async function readStore(): Promise<StoreShape> {
  const stories = await db.story.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      tags: true,
      sources: { include: { outlet: true } },
    },
    take: 2000,
  });

  // Archive cache is DB-backed now; we only keep a minimal surface in this shim.
  return {
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
}

export async function listStories(params?: {
  topic?: string;
  view?: "all" | "blindspot" | "local" | "trending";
  limit?: number;
  edition?: string;
  location?: string;
}): Promise<Story[]> {
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
    include: {
      tags: true,
      sources: { include: { outlet: true } },
    },
    take: Math.max(1, Math.min(2000, params?.limit ?? 500)),
  });

  let stories = rows.map(toStory);

  if (params?.topic) {
    const needle = params.topic.trim().toLowerCase();
    stories = stories.filter((s) => s.topic.toLowerCase() === needle);
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

  return stories;
}

export async function listStoriesByTopicSlug(slug: string, params?: { limit?: number; edition?: string }): Promise<Story[]> {
  const base = await listStories({ view: "all", limit: 2000, edition: params?.edition });
  const filtered = base.filter((story) => storyHasTopicSlug(story, slug));
  return filtered.slice(0, params?.limit ?? 2000);
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
    include: { tags: true, sources: { include: { outlet: true } } },
  });
  if (!row) return null;
  return toStory(row);
}

export async function getArchiveEntry(url: string): Promise<ArchiveEntry | null> {
  const originalUrl = (url || "").trim();
  if (!originalUrl) return null;
  const row = await db.archiveEntry.findUnique({ where: { originalUrl } });
  if (!row) return null;
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
