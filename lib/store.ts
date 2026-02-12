import fs from "node:fs/promises";
import path from "node:path";
import { ArchiveEntry, SourceArticle, StoreShape, Story } from "@/lib/types";
import { normalizeStory } from "@/lib/format";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const STORE_LOCK_PATH = path.join(process.cwd(), "data", "store.lock");
const LOCK_STALE_MS = 120000;
const LOCK_WAIT_STEP_MS = 80;
const LOCK_TIMEOUT_MS = 15000;
let processQueue: Promise<unknown> = Promise.resolve();

const EMPTY_STORE: StoreShape = {
  stories: [],
  archiveCache: {},
  ingestion: {
    lastRunAt: null,
    lastMode: null,
    storyCount: 0,
    routeCount: 0,
    notes: "",
  },
};

async function ensureStore() {
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await writeStoreAtomic(EMPTY_STORE);
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withStoreFileLock<T>(run: () => Promise<T>): Promise<T> {
  const start = Date.now();
  let lockHandle: fs.FileHandle | null = null;

  while (!lockHandle) {
    try {
      lockHandle = await fs.open(STORE_LOCK_PATH, "wx");
      await lockHandle.writeFile(
        JSON.stringify(
          {
            pid: process.pid,
            acquiredAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        "utf8",
      );
    } catch (error) {
      const isExists = error instanceof Error && "code" in error && error.code === "EEXIST";
      if (!isExists) throw error;

      try {
        const stat = await fs.stat(STORE_LOCK_PATH);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          await fs.rm(STORE_LOCK_PATH, { force: true });
          continue;
        }
      } catch {
        continue;
      }

      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        throw new Error("Timed out while waiting for store lock.");
      }
      await sleep(LOCK_WAIT_STEP_MS);
    }
  }

  try {
    return await run();
  } finally {
    await lockHandle.close().catch(() => {});
    await fs.rm(STORE_LOCK_PATH, { force: true }).catch(() => {});
  }
}

async function queueStoreOp<T>(run: () => Promise<T>): Promise<T> {
  const chained = processQueue.then(() => run());
  processQueue = chained.catch(() => undefined);
  return chained;
}

async function writeStoreAtomic(next: StoreShape): Promise<void> {
  const tempPath = `${STORE_PATH}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  await fs.rename(tempPath, STORE_PATH);
}

function buildSafeStoreShape(parsed: Partial<StoreShape>): StoreShape {
  return {
    ...EMPTY_STORE,
    ...parsed,
    stories: parsed.stories ?? [],
    archiveCache: parsed.archiveCache ?? {},
    ingestion: {
      ...EMPTY_STORE.ingestion,
      ...(parsed.ingestion ?? {}),
    },
  };
}

async function readStoreUnsafe(): Promise<StoreShape> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return buildSafeStoreShape(parsed);
  } catch {
    const corruptedPath = `${STORE_PATH}.corrupt-${Date.now()}.json`;
    await fs.rename(STORE_PATH, corruptedPath).catch(() => {});
    await writeStoreAtomic(EMPTY_STORE);
    return { ...EMPTY_STORE };
  }
}

function dedupeStories(stories: Story[]): Story[] {
  const bySlug = new Map<string, Story>();
  const byCanonical = new Map<string, Story>();
  const byTitle = new Map<string, Story>();

  for (const story of stories) {
    const normalized = normalizeStory(story);
    const canonical = (normalized.canonicalUrl || "").toLowerCase();
    const titleKey = normalized.title.trim().toLowerCase();
    const existingByCanonical = canonical ? byCanonical.get(canonical) : undefined;
    const existingByTitle = byTitle.get(titleKey);
    const incumbent = existingByCanonical ?? existingByTitle;

    if (incumbent) {
      const newer =
        +new Date(normalized.updatedAt || 0) >= +new Date(incumbent.updatedAt || 0) ? normalized : incumbent;
      const older = newer === normalized ? incumbent : normalized;
      bySlug.delete(older.slug);
      bySlug.set(newer.slug, newer);
      if (canonical) byCanonical.set(canonical, newer);
      byTitle.set(titleKey, newer);
      continue;
    }

    bySlug.set(normalized.slug, normalized);
    if (canonical) byCanonical.set(canonical, normalized);
    byTitle.set(titleKey, normalized);
  }

  return Array.from(bySlug.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

async function mutateStore<T>(mutator: (store: StoreShape) => Promise<T> | T): Promise<T> {
  return queueStoreOp(async () =>
    withStoreFileLock(async () => {
      const store = await readStoreUnsafe();
      const result = await mutator(store);
      await writeStoreAtomic(store);
      return result;
    }),
  );
}

export async function readStore(): Promise<StoreShape> {
  const store = await readStoreUnsafe();
  return {
    ...store,
    stories: dedupeStories(store.stories),
  };
}

export async function writeStore(next: StoreShape): Promise<void> {
  await queueStoreOp(() =>
    withStoreFileLock(async () => {
      const normalized: StoreShape = {
        ...next,
        stories: dedupeStories(next.stories),
      };
      await writeStoreAtomic(normalized);
    }),
  );
}

export async function listStories(params?: {
  topic?: string;
  view?: "all" | "blindspot" | "local" | "trending";
  limit?: number;
  edition?: string;
  location?: string;
}): Promise<Story[]> {
  const store = await readStore();
  let stories = [...store.stories].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  if (params?.view === "blindspot") stories = stories.filter((s) => s.blindspot);
  if (params?.view === "local") stories = stories.filter((s) => s.local);
  if (params?.view === "trending") stories = stories.filter((s) => s.trending);
  if (params?.topic) stories = stories.filter((s) => s.topic.toLowerCase() === params.topic?.toLowerCase());
  if (params?.edition && params.edition.toLowerCase() !== "all") {
    const edition = params.edition.trim().toLowerCase();
    stories = stories.filter((story) => story.location.trim().toLowerCase() === edition);
  }
  if (params?.location) {
    const needle = params.location.trim().toLowerCase();
    stories = stories.filter((story) => {
      const haystack = `${story.location} ${story.topic} ${story.title} ${story.summary} ${story.tags.join(" ")}`
        .toLowerCase()
        .replace(/\s+/g, " ");
      return haystack.includes(needle);
    });
  }
  if (params?.limit) stories = stories.slice(0, params.limit);

  return stories;
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const store = await readStore();
  const story = store.stories.find((s) => s.slug === slug) ?? null;
  return story ?? null;
}

export async function upsertStories(stories: Story[], ingestionNote: Partial<StoreShape["ingestion"]> = {}) {
  return mutateStore(async (store) => {
    store.stories = dedupeStories([...store.stories, ...stories]);
    store.ingestion = {
      ...store.ingestion,
      ...ingestionNote,
      lastRunAt: new Date().toISOString(),
      storyCount: store.stories.length,
    };
    return store;
  });
}

export async function getArchiveEntry(url: string): Promise<ArchiveEntry | null> {
  const store = await readStore();
  return store.archiveCache[url] ?? null;
}

export async function setArchiveEntry(url: string, entry: ArchiveEntry): Promise<ArchiveEntry> {
  return mutateStore(async (store) => {
    store.archiveCache[url] = entry;
    return entry;
  });
}

export async function getDashboardStats() {
  const store = await readStore();
  const uniqueOutletCount = new Set(
    store.stories.flatMap((s) => s.sources.map((src: SourceArticle) => src.outlet.toLowerCase())),
  ).size;
  const sourceArticleCount = store.stories.reduce((acc, story) => acc + story.sources.length, 0);

  return {
    storyCount: store.stories.length,
    uniqueOutletCount,
    sourceArticleCount,
    archiveCacheCount: Object.keys(store.archiveCache).length,
    ingestion: store.ingestion,
  };
}
