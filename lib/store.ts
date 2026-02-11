import fs from "node:fs/promises";
import path from "node:path";
import { ArchiveEntry, SourceArticle, StoreShape, Story } from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
let writeLock: Promise<void> = Promise.resolve();

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
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2) + "\n", "utf8");
  }
}

export async function readStore(): Promise<StoreShape> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw) as StoreShape;
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

export async function writeStore(next: StoreShape): Promise<void> {
  writeLock = writeLock.then(async () => {
    await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  });
  return writeLock;
}

export async function listStories(params?: {
  topic?: string;
  view?: "all" | "blindspot" | "local" | "trending";
  limit?: number;
}): Promise<Story[]> {
  const store = await readStore();
  let stories = [...store.stories].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  if (params?.view === "blindspot") stories = stories.filter((s) => s.blindspot);
  if (params?.view === "local") stories = stories.filter((s) => s.local);
  if (params?.view === "trending") stories = stories.filter((s) => s.trending);
  if (params?.topic) stories = stories.filter((s) => s.topic.toLowerCase() === params.topic?.toLowerCase());
  if (params?.limit) stories = stories.slice(0, params.limit);

  return stories;
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const store = await readStore();
  return store.stories.find((s) => s.slug === slug) ?? null;
}

export async function upsertStories(stories: Story[], ingestionNote: Partial<StoreShape["ingestion"]> = {}) {
  const store = await readStore();
  const bySlug = new Map(store.stories.map((s) => [s.slug, s]));
  for (const story of stories) {
    bySlug.set(story.slug, story);
  }
  store.stories = Array.from(bySlug.values());
  store.ingestion = {
    ...store.ingestion,
    ...ingestionNote,
    lastRunAt: new Date().toISOString(),
    storyCount: store.stories.length,
  };
  await writeStore(store);
  return store;
}

export async function getArchiveEntry(url: string): Promise<ArchiveEntry | null> {
  const store = await readStore();
  return store.archiveCache[url] ?? null;
}

export async function setArchiveEntry(url: string, entry: ArchiveEntry): Promise<ArchiveEntry> {
  const store = await readStore();
  store.archiveCache[url] = entry;
  await writeStore(store);
  return entry;
}

export async function getDashboardStats() {
  const store = await readStore();
  const sourceCount = new Set(
    store.stories.flatMap((s) => s.sources.map((src: SourceArticle) => src.outlet.toLowerCase())),
  ).size;

  return {
    storyCount: store.stories.length,
    sourceCount,
    archiveCacheCount: Object.keys(store.archiveCache).length,
    ingestion: store.ingestion,
  };
}
