#!/usr/bin/env node
/* eslint-disable no-console */
import "./lib/load_env.mjs";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { chromium } from "playwright-core";
import { runGroundNewsScrape } from "./groundnews_scrape_cdp.mjs";
import { createBrowserSession, stopBrowserSession, requireApiKey } from "./lib/browser_use_cdp.mjs";
import { persistIngestionRun, persistStoriesToDb } from "./lib/gn/persist_db.mjs";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const STORE_LOCK_PATH = path.join(process.cwd(), "data", "store.lock");
const DEFAULT_OUT = "output/browser_use/groundnews_cdp/ingest_scrape.json";
const DEFAULT_ARTICLE_AUDIT_DIR = "output/browser_use/groundnews_cdp/article_audit";
const FALLBACK_IMAGE = "/images/story-fallback.svg";
const FALLBACK_IMAGE_VARIANTS = [
  "/images/fallbacks/story-fallback-1.svg",
  "/images/fallbacks/story-fallback-2.svg",
  "/images/fallbacks/story-fallback-3.svg",
  "/images/fallbacks/story-fallback-4.svg",
  "/images/fallbacks/story-fallback-5.svg",
];
const IMAGE_CACHE_DIR = path.join(process.cwd(), "public", "images", "cache");
const IMAGE_CACHE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_CACHE_TIMEOUT_MS = 15000;
const LOCK_TIMEOUT_MS = 15000;
const LOCK_STALE_MS = 120000;
const LOCK_WAIT_STEP_MS = 80;
const SOURCE_FETCH_TIMEOUT_MS = 12000;
const SOURCE_FETCH_CONCURRENCY = 4;

const TOPIC_ALIAS_RULES = [
  { slug: "us-news", label: "US News", aliases: ["us politics", "u.s. politics", "united states", "washington", "congress", "white house", "american politics"] },
  { slug: "world", label: "World", aliases: ["international", "global", "world news", "foreign affairs", "geopolitics"] },
  { slug: "science", label: "Science", aliases: ["science & technology", "research", "space", "biology", "physics"] },
  { slug: "technology", label: "Technology", aliases: ["tech", "artificial intelligence", "ai", "cybersecurity", "internet"] },
  { slug: "business", label: "Business", aliases: ["markets", "economy", "finance", "business & markets"] },
  { slug: "health", label: "Health", aliases: ["health & medicine", "medicine", "public health", "healthcare"] },
  { slug: "sports", label: "Sports", aliases: ["sport", "athletics", "football", "basketball", "baseball"] },
  { slug: "climate", label: "Climate", aliases: ["environment", "climate change", "global warming"] },
  { slug: "entertainment", label: "Entertainment", aliases: ["music", "culture", "movies", "film", "television", "celebrity"] },
  { slug: "politics", label: "Politics", aliases: ["government", "election", "policy", "law"] },
];

const ENTERTAINMENT_KEYWORDS = [
  "music",
  "movie",
  "film",
  "tv",
  "television",
  "celebrity",
  "streaming",
  "box office",
  "album",
  "song",
  "artist",
  "concert",
  "super bowl halftime",
];

const POLITICS_KEYWORDS = [
  "election",
  "senate",
  "congress",
  "white house",
  "president",
  "governor",
  "lawmakers",
  "campaign",
  "policy",
  "bill",
  "legislation",
  "minister",
];

const US_NEWS_KEYWORDS = ["u.s.", "us ", "united states", "american", "washington"];

const TLD_COUNTRY_MAP = new Map([
  ["us", "United States"],
  ["uk", "United Kingdom"],
  ["ca", "Canada"],
  ["au", "Australia"],
  ["in", "India"],
  ["de", "Germany"],
  ["fr", "France"],
  ["it", "Italy"],
  ["es", "Spain"],
  ["jp", "Japan"],
  ["kr", "South Korea"],
  ["br", "Brazil"],
  ["mx", "Mexico"],
  ["za", "South Africa"],
  ["ie", "Ireland"],
  ["nz", "New Zealand"],
  ["sg", "Singapore"],
  ["hk", "Hong Kong"],
]);

const TOPIC_ALIAS_TO_RULE = new Map();
for (const rule of TOPIC_ALIAS_RULES) {
  TOPIC_ALIAS_TO_RULE.set(rule.slug, rule);
  TOPIC_ALIAS_TO_RULE.set(rule.label.toLowerCase(), rule);
  for (const alias of rule.aliases) {
    TOPIC_ALIAS_TO_RULE.set(String(alias).toLowerCase(), rule);
    TOPIC_ALIAS_TO_RULE.set(slugify(alias), rule);
  }
}

const OUTLET_REFERENCE_DATA = new Map(
  [
    {
      match: ["reuters", "reuters.com"],
      websiteUrl: "https://www.reuters.com",
      country: "United Kingdom",
      foundedYear: 1851,
      description: "International news agency headquartered in London.",
      biasRating: "center",
      factuality: "very-high",
    },
    {
      match: ["cnn", "cnn.com"],
      websiteUrl: "https://www.cnn.com",
      country: "United States",
      foundedYear: 1980,
      description: "US cable and digital news network.",
      biasRating: "left",
      factuality: "mixed",
    },
    {
      match: ["fox news", "foxnews.com"],
      websiteUrl: "https://www.foxnews.com",
      country: "United States",
      foundedYear: 1996,
      description: "US cable and digital news network.",
      biasRating: "right",
      factuality: "mixed",
    },
    {
      match: ["associated press", "apnews.com"],
      websiteUrl: "https://apnews.com",
      country: "United States",
      foundedYear: 1846,
      description: "Independent global news cooperative.",
      biasRating: "center",
      factuality: "very-high",
    },
    {
      match: ["bbc", "bbc.com", "bbc.co.uk"],
      websiteUrl: "https://www.bbc.com",
      country: "United Kingdom",
      foundedYear: 1922,
      description: "British public service broadcaster.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["new york times", "nytimes.com"],
      websiteUrl: "https://www.nytimes.com",
      country: "United States",
      foundedYear: 1851,
      description: "US newspaper focused on national and global coverage.",
      biasRating: "left",
      factuality: "high",
    },
    {
      match: ["wall street journal", "wsj.com"],
      websiteUrl: "https://www.wsj.com",
      country: "United States",
      foundedYear: 1889,
      description: "US newspaper with business and political reporting.",
      biasRating: "lean-right",
      factuality: "high",
    },
    {
      match: ["washington post", "washingtonpost.com"],
      websiteUrl: "https://www.washingtonpost.com",
      country: "United States",
      foundedYear: 1877,
      description: "US newspaper with national and international reporting.",
      biasRating: "lean-left",
      factuality: "high",
    },
    {
      match: ["npr", "npr.org"],
      websiteUrl: "https://www.npr.org",
      country: "United States",
      foundedYear: 1970,
      description: "US nonprofit public radio network and newsroom.",
      biasRating: "lean-left",
      factuality: "high",
    },
    {
      match: ["the guardian", "theguardian.com"],
      websiteUrl: "https://www.theguardian.com",
      country: "United Kingdom",
      foundedYear: 1821,
      description: "British newspaper with international digital coverage.",
      biasRating: "lean-left",
      factuality: "high",
    },
    {
      match: ["abc news", "abcnews.go.com"],
      websiteUrl: "https://abcnews.go.com",
      country: "United States",
      foundedYear: 1945,
      description: "US broadcast and digital news division.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["cbs news", "cbsnews.com"],
      websiteUrl: "https://www.cbsnews.com",
      country: "United States",
      foundedYear: 1927,
      description: "US broadcast and digital news division.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["nbc news", "nbcnews.com", "msnbc.com"],
      websiteUrl: "https://www.nbcnews.com",
      country: "United States",
      foundedYear: 1940,
      description: "US broadcast and digital news division.",
      biasRating: "lean-left",
      factuality: "high",
    },
    {
      match: ["usa today", "usatoday.com"],
      websiteUrl: "https://www.usatoday.com",
      country: "United States",
      foundedYear: 1982,
      description: "US national newspaper and digital outlet.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["bloomberg", "bloomberg.com"],
      websiteUrl: "https://www.bloomberg.com",
      country: "United States",
      foundedYear: 1990,
      description: "Global business and markets news organization.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["financial times", "ft.com"],
      websiteUrl: "https://www.ft.com",
      country: "United Kingdom",
      foundedYear: 1888,
      description: "UK-based global business newspaper.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["politico", "politico.com"],
      websiteUrl: "https://www.politico.com",
      country: "United States",
      foundedYear: 2007,
      description: "US politics and policy digital newsroom.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["axios", "axios.com"],
      websiteUrl: "https://www.axios.com",
      country: "United States",
      foundedYear: 2016,
      description: "US digital outlet focused on politics, business, and tech.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["al jazeera", "aljazeera.com"],
      websiteUrl: "https://www.aljazeera.com",
      country: "Qatar",
      foundedYear: 1996,
      description: "International news network headquartered in Doha.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["sky news", "news.sky.com"],
      websiteUrl: "https://news.sky.com",
      country: "United Kingdom",
      foundedYear: 1989,
      description: "UK television and digital news outlet.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["the hill", "thehill.com"],
      websiteUrl: "https://thehill.com",
      country: "United States",
      foundedYear: 1994,
      description: "US outlet focused on Congress and policy.",
      biasRating: "center",
      factuality: "mixed",
    },
    {
      match: ["newsweek", "newsweek.com"],
      websiteUrl: "https://www.newsweek.com",
      country: "United States",
      foundedYear: 1933,
      description: "US news magazine and digital publisher.",
      biasRating: "center",
      factuality: "mixed",
    },
    {
      match: ["time", "time.com"],
      websiteUrl: "https://time.com",
      country: "United States",
      foundedYear: 1923,
      description: "US news magazine and digital publisher.",
      biasRating: "center",
      factuality: "high",
    },
    {
      match: ["the atlantic", "theatlantic.com"],
      websiteUrl: "https://www.theatlantic.com",
      country: "United States",
      foundedYear: 1857,
      description: "US magazine focused on politics, culture, and ideas.",
      biasRating: "lean-left",
      factuality: "high",
    },
    {
      match: ["new york post", "nypost.com"],
      websiteUrl: "https://nypost.com",
      country: "United States",
      foundedYear: 1801,
      description: "US tabloid newspaper and digital outlet.",
      biasRating: "right",
      factuality: "mixed",
    },
    {
      match: ["los angeles times", "latimes.com"],
      websiteUrl: "https://www.latimes.com",
      country: "United States",
      foundedYear: 1881,
      description: "US regional newspaper with national coverage.",
      biasRating: "lean-left",
      factuality: "high",
    },
    {
      match: ["daily mail", "dailymail.co.uk"],
      websiteUrl: "https://www.dailymail.co.uk",
      country: "United Kingdom",
      foundedYear: 1896,
      description: "UK tabloid newspaper and digital outlet.",
      biasRating: "right",
      factuality: "mixed",
    },
    {
      match: ["huffpost", "huffingtonpost.com"],
      websiteUrl: "https://www.huffpost.com",
      country: "United States",
      foundedYear: 2005,
      description: "US digital news and opinion publication.",
      biasRating: "left",
      factuality: "mixed",
    },
    {
      match: ["vox", "vox.com"],
      websiteUrl: "https://www.vox.com",
      country: "United States",
      foundedYear: 2014,
      description: "US explanatory journalism outlet.",
      biasRating: "left",
      factuality: "mixed",
    },
    {
      match: ["breitbart", "breitbart.com"],
      websiteUrl: "https://www.breitbart.com",
      country: "United States",
      foundedYear: 2007,
      description: "US conservative digital news outlet.",
      biasRating: "right",
      factuality: "mixed",
    },
    {
      match: ["daily wire", "dailywire.com"],
      websiteUrl: "https://www.dailywire.com",
      country: "United States",
      foundedYear: 2015,
      description: "US conservative digital news and commentary outlet.",
      biasRating: "right",
      factuality: "mixed",
    },
    {
      match: ["washington examiner", "washingtonexaminer.com"],
      websiteUrl: "https://www.washingtonexaminer.com",
      country: "United States",
      foundedYear: 2005,
      description: "US conservative politics and policy outlet.",
      biasRating: "lean-right",
      factuality: "mixed",
    },
    {
      match: ["the independent", "independent.co.uk"],
      websiteUrl: "https://www.independent.co.uk",
      country: "United Kingdom",
      foundedYear: 1986,
      description: "UK digital newspaper with global coverage.",
      biasRating: "lean-left",
      factuality: "high",
    },
    {
      match: ["telegraph", "telegraph.co.uk"],
      websiteUrl: "https://www.telegraph.co.uk",
      country: "United Kingdom",
      foundedYear: 1855,
      description: "UK newspaper focused on national and world news.",
      biasRating: "lean-right",
      factuality: "high",
    },
    {
      match: ["cnbc", "cnbc.com"],
      websiteUrl: "https://www.cnbc.com",
      country: "United States",
      foundedYear: 1989,
      description: "US business and markets news network.",
      biasRating: "center",
      factuality: "high",
    },
  ].flatMap((entry) => entry.match.map((key) => [key, entry])),
);

function parseArgs(argv) {
  const opts = {
    routes: ["/"],
    storyLimit: 0,
    out: DEFAULT_OUT,
    articleAuditDir: DEFAULT_ARTICLE_AUDIT_DIR,
    articleAudit: true,
    refreshExisting: 0,
    sessionStoryBatchSize: 8,
    sessionMaxMs: 11 * 60 * 1000,
    silent: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--routes" && argv[i + 1]) {
      opts.routes = argv[i + 1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      i += 1;
    } else if (a === "--story-limit" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      opts.storyLimit = Number.isFinite(parsed) ? parsed : 0;
      i += 1;
    } else if (a === "--out" && argv[i + 1]) {
      opts.out = argv[i + 1];
      i += 1;
    } else if (a === "--frontpage-only") {
      opts.routes = ["/"];
    } else if (a === "--article-audit-dir" && argv[i + 1]) {
      opts.articleAuditDir = argv[i + 1];
      i += 1;
    } else if (a === "--no-article-audit") {
      opts.articleAudit = false;
    } else if (a === "--refresh-existing" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      opts.refreshExisting = Number.isFinite(parsed) && parsed > 0 ? Math.max(0, Math.round(parsed)) : 0;
      i += 1;
    } else if (a === "--session-story-batch" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      opts.sessionStoryBatchSize = Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.round(parsed)) : 8;
      i += 1;
    } else if (a === "--session-max-minutes" && argv[i + 1]) {
      const minutes = Number(argv[i + 1]);
      opts.sessionMaxMs = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60 * 1000) : 11 * 60 * 1000;
      i += 1;
    } else if (a === "--verbose") {
      opts.silent = false;
    }
  }
  return opts;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withStoreLock(run) {
  const start = Date.now();
  let lockHandle = null;

  while (!lockHandle) {
    try {
      await fs.mkdir(path.dirname(STORE_LOCK_PATH), { recursive: true });
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
      if (error?.code !== "EEXIST") throw error;
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

function buildEmptyStore() {
  return {
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
}

async function readStoreSafe() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const empty = buildEmptyStore();
    return {
      ...empty,
      ...parsed,
      stories: Array.isArray(parsed?.stories) ? parsed.stories : [],
      archiveCache: parsed?.archiveCache ?? {},
      ingestion: {
        ...empty.ingestion,
        ...(parsed?.ingestion ?? {}),
      },
    };
  } catch (error) {
    const missing = error?.code === "ENOENT";
    if (!missing) {
      const backup = `${STORE_PATH}.corrupt-${Date.now()}.json`;
      await fs.rename(STORE_PATH, backup).catch(() => {});
    }
    const store = buildEmptyStore();
    await writeStoreAtomic(store);
    return store;
  }
}

async function writeStoreAtomic(store) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const tempPath = `${STORE_PATH}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2) + "\n", "utf8");
  await fs.rename(tempPath, STORE_PATH);
}

function stableId(value, prefix) {
  const hash = crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
  return `${prefix}-${hash}`;
}

function shortHash(value, size = 8) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, size);
}

function slugForFile(value, fallback = "item", maxLength = 72) {
  const slug = slugify(value || fallback).slice(0, maxLength);
  return slug || fallback;
}

function resolveAuditDir(rawDir) {
  if (!rawDir) return path.resolve(process.cwd(), DEFAULT_ARTICLE_AUDIT_DIR);
  return path.isAbsolute(rawDir) ? rawDir : path.resolve(process.cwd(), rawDir);
}

async function writeTextFile(targetPath, content) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
}

async function writeJsonFile(targetPath, value) {
  await writeTextFile(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}

function isLikelyUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
  return slug || "story";
}

function toSlugFromUrl(url, fallbackTitle = "") {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() || "";
    if (last && !isLikelyUuid(last)) {
      const fromPath = slugify(last);
      if (fromPath.length >= 8) return fromPath;
    }
  } catch {
    // Ignore URL parse errors and fallback below.
  }
  return slugify(fallbackTitle || url);
}

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function summarizeText(input, fallback = "Summary unavailable.") {
  const clean = sanitizeSummaryText(input);
  if (!clean) return fallback;
  if (clean.length <= 260) return clean;
  return `${clean.slice(0, 257)}...`;
}

function sanitizeSummaryText(value) {
  const clean = normalizeText(value);
  if (!clean) return "";
  const withoutWire = clean
    .replace(/^\(adds?[^)]+\)\s*/i, "")
    .replace(/^\([^)]+updates?[^)]+\)\s*/i, "")
    .replace(/^[A-Z][A-Z .'-]{1,25},\s*[A-Z][a-z]{2,8}\s+\d{1,2}\s*-\s*/i, "")
    .trim();
  if (!withoutWire) return "";
  const commaParts = withoutWire.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 4 && commaParts.every((part) => part.length <= 24 && /^[A-Za-z][A-Za-z\s&'-]+$/.test(part))) {
    return "";
  }
  if (/^(breaking news|latest news|top stories|news)$/i.test(withoutWire)) return "";
  return withoutWire;
}

function sanitizeCdnPathArtifacts(value) {
  return String(value || "")
    .replace(/\/\[[^\]]+\]\//g, "/")
    .replace(/%5B[^%]+%5D/gi, "");
}

function fallbackImageForSeed(seed = "story") {
  const hashHex = shortHash(seed, 4);
  const num = Number.parseInt(hashHex, 16);
  const idx = Number.isFinite(num) ? num % FALLBACK_IMAGE_VARIANTS.length : 0;
  return FALLBACK_IMAGE_VARIANTS[idx] || FALLBACK_IMAGE;
}

function normalizeTopicRule(input) {
  const key = normalizeText(input).toLowerCase();
  if (!key) return null;
  return TOPIC_ALIAS_TO_RULE.get(key) || TOPIC_ALIAS_TO_RULE.get(slugify(key)) || null;
}

function parsePublishedAt(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function hostFromUrl(raw) {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

function containsAnyKeyword(text, keywords) {
  const hay = normalizeText(text).toLowerCase();
  if (!hay) return false;
  return keywords.some((keyword) => hay.includes(keyword.toLowerCase()));
}

function inferCountryFromUrl(rawUrl) {
  const host = normalizeText(hostFromUrl(rawUrl)).toLowerCase();
  if (!host || !host.includes(".")) return "";
  const tld = host.split(".").pop() || "";
  return TLD_COUNTRY_MAP.get(tld) || "";
}

function looksLikeWeakOutletLabel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return true;
  if (/^\d+\s+(hours?|days?|minutes?)\s+ago/.test(text)) return true;
  if (/\b(hours?|days?|minutes?)\s+ago\b/.test(text)) return true;
  if (/^[a-z .'-]{2,40},\s*[a-z .'-]{2,40}$/.test(text) && text.split(" ").length <= 5) return true;
  if (text.length > 64) return true;
  return false;
}

function looksLikeWeakExcerpt(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return true;
  if (text.length < 48) return true;
  if (/^\d+\s+(hours?|days?|minutes?)\s+ago/.test(text)) return true;
  if (/^(updated|published)\b/.test(text)) return true;
  return false;
}

function isGroundNewsUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "ground.news" || hostname.endsWith(".ground.news");
  } catch {
    return false;
  }
}

function sanitizeImageUrl(raw, baseUrl) {
  const value = sanitizeCdnPathArtifacts(normalizeText(raw));
  if (!value) return fallbackImageForSeed(baseUrl || "story");

  const unwrapNextImage = (input) => {
    const clean = normalizeText(input);
    if (!clean) return null;
    try {
      const parsed = clean.startsWith("/_next/image")
        ? new URL(clean, "https://ground.news")
        : new URL(clean);
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

  // Ground News often emits Next.js image optimizer links that break cross-origin.
  const unwrapped = unwrapNextImage(value);
  if (unwrapped) return sanitizeImageUrl(unwrapped, baseUrl);

  try {
    const parsed = new URL(value, baseUrl);
    if (!/^https?:$/i.test(parsed.protocol)) return fallbackImageForSeed(baseUrl || "story");
    if (/groundnews\.b-cdn\.net$/i.test(parsed.hostname) && /\/assets\/flags\//i.test(parsed.pathname)) {
      return fallbackImageForSeed(baseUrl || "story");
    }
    // GN "webMetaImg" endpoints bake bias bars into the image. Avoid for UI parity (we render our own).
    const lowerPath = String(parsed.pathname || "").toLowerCase();
    if (lowerPath.includes("webmetaimg") || (lowerPath.includes("webmeta") && lowerPath.includes("img"))) {
      return fallbackImageForSeed(baseUrl || "story");
    }
    if (/(\.|^)ground\.news$/i.test(parsed.hostname) && lowerPath.startsWith("/images/")) {
      return fallbackImageForSeed(baseUrl || "story");
    }
    const lowerHref = parsed.toString().toLowerCase();
    if (lowerHref.includes("webmetaimg")) return fallbackImageForSeed(baseUrl || "story");
    return parsed.toString();
  } catch {
    return fallbackImageForSeed(baseUrl || "story");
  }
}

function sanitizeTag(tag) {
  const value = normalizeText(tag);
  if (!value) return null;
  if (value.length < 2 || value.length > 60) return null;
  if (/\b(lean left|lean right|far left|far right|left|right|center)\b/i.test(value)) return null;
  if (/[a-z0-9-]+\.[a-z]{2,}/i.test(value)) return null;
  return value;
}

function sanitizeTags(tags) {
  const dedupKeys = new Set();
  const dedup = [];
  for (const tag of tags || []) {
    const clean = sanitizeTag(tag);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (dedupKeys.has(key)) continue;
    dedupKeys.add(key);
    dedup.push(clean);
    if (dedup.length >= 8) break;
  }
  return dedup;
}

function extractKeywordTokens(value) {
  const stop = new Set(["the", "and", "for", "with", "from", "into", "over", "under", "about", "your", "news"]);
  return normalizeText(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !stop.has(t));
}

function tagSeemsRelevant(tag, storyText) {
  const clean = normalizeText(tag);
  if (!clean) return false;
  const tokens = extractKeywordTokens(clean);
  if (tokens.length === 0) return false;
  return tokens.some((t) => storyText.includes(t));
}

function chooseTopic(renderedTopic, tags, storyText) {
  const normalizedStoryText = normalizeText(storyText).toLowerCase();
  const topic = normalizeText(renderedTopic) || "Top Stories";
  const tagList = Array.isArray(tags) ? tags.map((tag) => normalizeText(tag)).filter(Boolean) : [];
  const candidates = [topic, ...tagList];

  const scoredRule = candidates
    .map((candidate) => {
      const rule = normalizeTopicRule(candidate);
      if (!rule) return null;
      const score = rule.aliases.reduce((acc, alias) => acc + (normalizedStoryText.includes(alias.toLowerCase()) ? 1 : 0), 0);
      const keywordScore = rule.aliases.some((alias) => candidate.toLowerCase().includes(alias.toLowerCase())) ? 2 : 0;
      return { rule, score: score + keywordScore, candidate };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0];

  const adjustByContent = (candidateLabel) => {
    const lower = normalizeText(candidateLabel).toLowerCase();
    const entertainmentHeavy =
      containsAnyKeyword(normalizedStoryText, ENTERTAINMENT_KEYWORDS) || tagList.some((tag) => containsAnyKeyword(tag, ENTERTAINMENT_KEYWORDS));
    const politicsHeavy =
      containsAnyKeyword(normalizedStoryText, POLITICS_KEYWORDS) || tagList.some((tag) => containsAnyKeyword(tag, POLITICS_KEYWORDS));
    const usHeavy =
      containsAnyKeyword(normalizedStoryText, US_NEWS_KEYWORDS) || tagList.some((tag) => containsAnyKeyword(tag, US_NEWS_KEYWORDS));

    // Guard against common misclassifications (e.g., music/entertainment stories incorrectly tagged Politics).
    if ((lower === "politics" || lower === "us news") && entertainmentHeavy && !politicsHeavy) return "Entertainment";
    if (lower === "entertainment" && politicsHeavy && !entertainmentHeavy) return usHeavy ? "US News" : "Politics";
    if (lower === "top stories") {
      if (usHeavy && politicsHeavy) return "US News";
      if (containsAnyKeyword(normalizedStoryText, ["science", "research", "space", "scientists"])) return "Science";
      if (containsAnyKeyword(normalizedStoryText, ["global", "international", "foreign affairs", "geopolitics"])) return "World";
      if (entertainmentHeavy) return "Entertainment";
    }
    return candidateLabel;
  };

  if (scoredRule && scoredRule.rule?.label) {
    if (scoredRule.score > 0) return scoredRule.rule.label;
    const fallbackFromTags = tagList.find((tag) => {
      const rule = normalizeTopicRule(tag);
      if (!rule) return false;
      return rule.aliases.some((alias) => normalizedStoryText.includes(alias.toLowerCase()));
    });
    if (fallbackFromTags) {
      const rule = normalizeTopicRule(fallbackFromTags);
      if (rule?.label) return adjustByContent(rule.label);
    }
    return adjustByContent(scoredRule.rule.label);
  }

  const topicTokens = extractKeywordTokens(topic);
  const topicLooksRelevant = topicTokens.length > 0 ? topicTokens.some((t) => normalizedStoryText.includes(t)) : true;
  if (topicLooksRelevant) return topic;

  const tagCandidate = tagList.find((tag) => tagSeemsRelevant(tag, normalizedStoryText));
  return adjustByContent(normalizeText(tagCandidate || topic) || "Top Stories");
}

function parseBiasLabel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return "unknown";
  if (/(far\s+left|lean\s+left|center[-\s]?left|left)/.test(text)) return "left";
  if (/(far\s+right|lean\s+right|center[-\s]?right|right)/.test(text)) return "right";
  if (text.includes("center")) return "center";
  return "unknown";
}

function parseBiasRatingLabel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return "unknown";
  if (text.includes("far left")) return "far-left";
  if (text.includes("far-right") || text.includes("far right")) return "far-right";
  if (text.includes("lean left") || text.includes("center left") || text.includes("centre left")) return "lean-left";
  if (text.includes("lean right") || text.includes("center right") || text.includes("centre right")) return "lean-right";
  if (/(^|\s)left(\s|$)/.test(text)) return "left";
  if (/(^|\s)right(\s|$)/.test(text)) return "right";
  if (text.includes("center") || text.includes("centre")) return "center";
  return "unknown";
}

function bucket3FromRating(rating) {
  if (rating === "far-left" || rating === "left" || rating === "lean-left") return "left";
  if (rating === "center") return "center";
  if (rating === "lean-right" || rating === "right" || rating === "far-right") return "right";
  return "unknown";
}

function parseFactualityLabel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return "unknown";
  if (text.includes("very high")) return "very-high";
  if (text.includes("veryhigh")) return "very-high";
  if (/(^|\s)high(\s|$)/.test(text)) return "high";
  if (text.includes("mixed")) return "mixed";
  if (text.includes("very low")) return "very-low";
  if (text.includes("verylow")) return "very-low";
  if (/(^|\s)low(\s|$)/.test(text)) return "low";
  return "unknown";
}

function parsePaywallLabel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return undefined;
  if (text.includes("no paywall")) return "none";
  if (text.includes("nopaywall")) return "none";
  if (text.includes("soft")) return "soft";
  if (text.includes("hard") || text.includes("paywall")) return "hard";
  return undefined;
}

function parseLocalityLabel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return undefined;
  if (text.includes("local")) return "local";
  if (text.includes("national")) return "national";
  if (text.includes("international")) return "international";
  return undefined;
}

function normalizeExternalUrl(value) {
  const clean = normalizeText(value);
  if (!clean) return null;
  try {
    const parsed = new URL(clean);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeAssetUrl(value, baseUrl = "") {
  const clean = sanitizeCdnPathArtifacts(normalizeText(value));
  if (!clean) return undefined;

  const unwrapNextImage = (input) => {
    const raw = normalizeText(input);
    if (!raw) return null;
    try {
      const parsed = raw.startsWith("/_next/image")
        ? new URL(raw, "https://ground.news")
        : new URL(raw);
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

  const unwrapped = unwrapNextImage(clean);
  if (unwrapped) return normalizeAssetUrl(unwrapped, baseUrl || "https://ground.news");

  try {
    const parsed = new URL(clean, baseUrl || undefined);
    if (!/^https?:$/i.test(parsed.protocol)) return undefined;
    if (/(\.|^)ground\.news$/i.test(parsed.hostname) && String(parsed.pathname || "").toLowerCase().startsWith("/images/")) {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function extractNextDataFromHtml(html) {
  if (!html) return null;
  try {
    const $ = cheerio.load(html);
    const raw = $("#__NEXT_DATA__").text() || $("#__NEXT_DATA__").html() || "";
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractNextDataRawFromHtml(html) {
  if (!html) return "";
  try {
    const $ = cheerio.load(html);
    return $("#__NEXT_DATA__").text() || $("#__NEXT_DATA__").html() || "";
  } catch {
    return "";
  }
}

function maxFiniteNumber(...values) {
  const finite = values
    .map((value) => (typeof value === "string" && value.trim() ? Number(value.replace(/,/g, "")) : value))
    .filter((value) => Number.isFinite(value));
  if (finite.length === 0) return undefined;
  return Math.max(...finite.map((value) => Number(value)));
}

function normalizeHost(value) {
  const clean = normalizeText(value).toLowerCase();
  if (!clean) return "";
  return clean.replace(/^www\./, "");
}

function parseBiasFromAny(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 0) return "center";
    return value < 0 ? "left" : "right";
  }
  if (typeof value === "string") return parseBiasLabel(value);
  if (value && typeof value === "object") {
    const any = value;
    return parseBiasFromAny(any.label || any.name || any.value || "");
  }
  return "unknown";
}

function parseBiasRatingFromAny(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Numeric leans don't encode far/lean granularity; map to 3-bucket then to rating.
    const b = parseBiasFromAny(value);
    if (b === "left") return "left";
    if (b === "right") return "right";
    if (b === "center") return "center";
    return "unknown";
  }
  if (typeof value === "string") return parseBiasRatingLabel(value);
  if (value && typeof value === "object") {
    const any = value;
    return parseBiasRatingFromAny(any.label || any.name || any.value || "");
  }
  return "unknown";
}

function parseFactualityFromAny(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Map common 1-5 scales into buckets.
    if (value >= 4.5) return "very-high";
    if (value >= 3.5) return "high";
    if (value >= 2.5) return "mixed";
    if (value >= 1.5) return "low";
    return "very-low";
  }
  if (typeof value === "string") return parseFactualityLabel(value);
  if (value && typeof value === "object") {
    const any = value;
    return parseFactualityFromAny(any.label || any.name || any.value || "");
  }
  return "unknown";
}

function parsePaywallFromAny(value) {
  if (typeof value === "boolean") return value ? "hard" : "none";
  if (typeof value === "number" && Number.isFinite(value)) return value > 0 ? "hard" : "none";
  if (typeof value === "string") return parsePaywallLabel(value) || "";
  if (value && typeof value === "object") {
    const any = value;
    return parsePaywallFromAny(any.type || any.value || any.label || any.name || "");
  }
  return "";
}

function parseOwnershipFromAny(value) {
  if (typeof value === "string") return normalizeText(value);
  if (value && typeof value === "object") {
    const any = value;
    const candidate = normalizeText(any.name || any.label || any.value || any.owner || any.ownerName || "");
    return candidate;
  }
  return "";
}

function parseNextFlightPushCalls(scriptText) {
  if (!scriptText || !scriptText.includes("__next_f")) return [];
  const calls = [];
  const matcher = /(?:self\.__next_f\.push|\(self\.__next_f=self\.__next_f\|\|\[\]\)\.push)\(/g;
  let match;
  while ((match = matcher.exec(scriptText)) !== null) {
    const start = matcher.lastIndex;
    let depth = 1;
    let inString = null;
    let escaped = false;
    let end = -1;

    for (let i = start; i < scriptText.length; i += 1) {
      const ch = scriptText[i];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === inString) {
          inString = null;
        }
        continue;
      }

      if (ch === "'" || ch === '"' || ch === "`") {
        inString = ch;
        continue;
      }
      if (ch === "(") depth += 1;
      if (ch === ")") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (end <= start) continue;
    calls.push(scriptText.slice(start, end));
    matcher.lastIndex = end + 1;
  }
  return calls;
}

function evaluatePushArgExpression(expression) {
  if (!expression) return null;
  try {
    return Function(`"use strict"; return (${expression});`)();
  } catch {
    return null;
  }
}

function extractNextFlightTextBlocksFromHtml(html) {
  if (!html) return [];
  try {
    const $ = cheerio.load(html);
    const blocks = [];
    $("script").each((_, element) => {
      const script = $(element).html() || "";
      if (!script.includes("__next_f")) return;
      const calls = parseNextFlightPushCalls(script);
      for (const expression of calls) {
        const payload = evaluatePushArgExpression(expression);
        if (!Array.isArray(payload)) continue;
        if (payload.length >= 2 && typeof payload[1] === "string") {
          blocks.push(payload[1]);
          continue;
        }
        if (payload.length >= 1 && typeof payload[0] === "string") {
          blocks.push(payload[0]);
        }
      }
    });
    return blocks;
  } catch {
    return [];
  }
}

function mergeSourceCandidateRecords(base, incoming) {
  const merged = {
    ...base,
    ...incoming,
    url: incoming.url || base.url,
  };

  const baseOutlet = normalizeText(base.outlet || "");
  const incomingOutlet = normalizeText(incoming.outlet || "");
  merged.outlet = !looksLikeWeakOutletLabel(baseOutlet)
    ? baseOutlet
    : incomingOutlet || baseOutlet || hostFromUrl(merged.url || "");

  const baseExcerpt = normalizeText(base.excerpt || "");
  const incomingExcerpt = normalizeText(incoming.excerpt || "");
  merged.excerpt = !looksLikeWeakExcerpt(baseExcerpt) ? baseExcerpt : incomingExcerpt || baseExcerpt;

  merged.logoUrl = normalizeText(base.logoUrl || "") || normalizeText(incoming.logoUrl || "");
  merged.bias = base.bias && base.bias !== "unknown" ? base.bias : incoming.bias || "unknown";
  merged.biasRating =
    base.biasRating && base.biasRating !== "unknown" ? base.biasRating : incoming.biasRating || "unknown";
  merged.factuality =
    base.factuality && base.factuality !== "unknown" ? base.factuality : incoming.factuality || "unknown";
  merged.ownership = normalizeText(base.ownership || "") || normalizeText(incoming.ownership || "");
  merged.paywall = normalizeText(base.paywall || "") || normalizeText(incoming.paywall || "");
  merged.locality = normalizeText(base.locality || "") || normalizeText(incoming.locality || "");
  merged.publishedAt = normalizeText(base.publishedAt || "") || normalizeText(incoming.publishedAt || "");
  return merged;
}

function extractStructuredFromNextFlightHtml(html) {
  const blocks = extractNextFlightTextBlocksFromHtml(html);
  const coverage = {
    totalSources: undefined,
    leaningLeft: undefined,
    center: undefined,
    leaningRight: undefined,
    percentages: undefined,
  };
  // Next Flight can contain reference strings like "$85:props:children:...". We parse the
  // JSON lines we can and then resolve these pointers on demand to recover nested objects
  // (notably `sourceInfo` payloads that contain factuality/ownership/bias metadata).
  const flightNodeById = new Map();
  const sourceByUrl = new Map();
  const tagSet = new Set();
  let parsedLineCount = 0;
  const outletMetaByHost = new Map();
  const outletMetaById = new Map();
  const sourceInfoIdByHost = new Map();
  const ownerById = new Map();
  const keyHits = {};
  const keySamples = [];

  const compactValueForSample = (value) => {
    if (typeof value === "string") return value.slice(0, 160);
    if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
    if (Array.isArray(value)) {
      const first = value[0];
      if (first && typeof first === "object" && !Array.isArray(first)) {
        const head = {};
        for (const key of Object.keys(first).slice(0, 12)) {
          const v = first[key];
          if (typeof v === "string") head[key] = v.slice(0, 120);
          else if (typeof v === "number" || typeof v === "boolean" || v == null) head[key] = v;
        }
        return { type: "array", length: value.length, first: head };
      }
      return { type: "array", length: value.length, first: typeof first === "string" ? first.slice(0, 120) : first };
    }
    if (value && typeof value === "object") {
      const keys = Object.keys(value);
      const preview = {};
      for (const key of keys.slice(0, 10)) {
        const v = value[key];
        if (typeof v === "string") preview[key] = v.slice(0, 120);
        else if (typeof v === "number" || typeof v === "boolean" || v == null) preview[key] = v;
      }
      return { type: "object", keys: keys.slice(0, 16), preview };
    }
    return null;
  };

  const recordKeyHits = (node) => {
    const keys = Object.keys(node || {});
    if (keys.length === 0) return;
    const interesting = keys.filter((key) => /(factual|owner|paywall|bias|rating|vantage|tracked|untracked|lock)/i.test(key));
    if (interesting.length === 0) return;
    for (const key of interesting) {
      keyHits[key] = (keyHits[key] || 0) + 1;
    }
    const hasRegistryKeys = interesting.some((key) => /^(biasRatings|owners)$/i.test(key));
    const sampleLimit = hasRegistryKeys ? 140 : 60;
    if (keySamples.length < sampleLimit) {
      const sample = {};
      const identityKeys = [
        "id",
        "name",
        "outlet",
        "outletName",
        "publisher",
        "publisherName",
        "sourceName",
        "domain",
        "hostname",
        "host",
        "url",
        "link",
        "website",
        "site",
        "siteUrl",
        "sourceUrl",
        "canonicalUrl",
      ];
      for (const key of identityKeys) {
        if (!(key in node)) continue;
        sample[key] = compactValueForSample(node[key]);
      }
      for (const key of interesting.slice(0, 12)) {
        sample[key] = compactValueForSample(node[key]);
      }
      keySamples.push(sample);
    }
  };

  const mergeCoverageFromNode = (node) => {
    const totalSources = maxFiniteNumber(
      node.totalNewsSources,
      node.totalSources,
      node.sourceCount,
      node.total_count,
      node.totalCount,
    );
    const leaningLeft = maxFiniteNumber(node.leaningLeft, node.leftSources, node.leftCount);
    const center = maxFiniteNumber(node.center, node.centre, node.centerSources, node.centerCount);
    const leaningRight = maxFiniteNumber(node.leaningRight, node.rightSources, node.rightCount);
    coverage.totalSources = maxFiniteNumber(coverage.totalSources, totalSources);
    coverage.leaningLeft = maxFiniteNumber(coverage.leaningLeft, leaningLeft);
    coverage.center = maxFiniteNumber(coverage.center, center);
    coverage.leaningRight = maxFiniteNumber(coverage.leaningRight, leaningRight);

    const pctLeft = maxFiniteNumber(node.leftPercent, node.leftPct, node.left_percentage);
    const pctCenter = maxFiniteNumber(node.centerPercent, node.centerPct, node.center_percentage);
    const pctRight = maxFiniteNumber(node.rightPercent, node.rightPct, node.right_percentage);
    if ([pctLeft, pctCenter, pctRight].every((value) => Number.isFinite(value))) {
      coverage.percentages = {
        left: Number(pctLeft),
        center: Number(pctCenter),
        right: Number(pctRight),
      };
    }
  };

  const discoverHostFromNode = (node) => {
    const direct =
      normalizeHost(node.domain || node.hostname || node.host || node.site || node.siteHost || "") ||
      normalizeHost(node.publisherDomain || node.outletDomain || "") ||
      normalizeHost(node.website || node.siteUrl || node.sourceUrl || "");
    if (direct) return direct;

    const urlCandidate = typeof node.url === "string" ? node.url : typeof node.link === "string" ? node.link : "";
    const byUrl = normalizeHost(hostFromUrl(urlCandidate));
    if (byUrl) return byUrl;

    // Last resort: scan string-ish fields for URL/domain values.
    const values = Object.values(node)
      .filter((value) => typeof value === "string")
      .map((value) => String(value).trim())
      .filter((value) => value.length >= 4 && value.length <= 240);
    for (const value of values) {
      try {
        const parsed = new URL(value);
        const host = normalizeHost(parsed.hostname);
        if (host) return host;
      } catch {
        // ignore
      }
      const domainMatch = value.match(/([a-z0-9-]+\\.)+[a-z]{2,}/i);
      if (domainMatch) {
        const host = normalizeHost(domainMatch[0]);
        if (host) return host;
      }
    }

    return "";
  };

  const extractSourceInfoIdFromNode = (node) => {
    const candidate =
      node.sourceInfoId ||
      node.sourceInfoID ||
      node.source_info_id ||
      node.sourceInfo?.id ||
      node.sourceInfo?.sourceInfoId ||
      node.sourceInfo?.source_info_id ||
      node.source?.id ||
      node.source?.sourceInfoId ||
      node.sourceId ||
      node.source_id ||
      node.id ||
      "";
    const clean = normalizeText(String(candidate || ""));
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean) ? clean : "";
  };

  const mergeOutletMetaFromNode = (node) => {
    // Owner registries: store owner id -> display name so we can join later.
    if (Array.isArray(node.owners)) {
      for (const owner of node.owners) {
        if (!owner || typeof owner !== "object") continue;
        const id = normalizeText(String(owner.id || owner.ownerId || owner.uuid || ""));
        const name = normalizeText(owner.name || owner.label || owner.title || "");
        if (id && name) ownerById.set(id, name);
      }
    }

    // Bias rating registries: often the rich outlet metadata lives here.
    if (Array.isArray(node.biasRatings)) {
      for (const entry of node.biasRatings) {
        if (!entry || typeof entry !== "object") continue;
        const host = discoverHostFromNode(entry);
        const sourceInfoId = normalizeText(entry.sourceInfoId || entry.source_info_id || "");

        const rawBias = parseBiasFromAny(entry.bias || entry.biasRating || entry.lean || entry.politicalBias || entry.bias_label);
        const biasRating = parseBiasRatingFromAny(entry.bias || entry.biasRating || entry.lean || entry.politicalBias || entry.bias_label);
        const bias = rawBias !== "unknown" ? rawBias : bucket3FromRating(biasRating);
        const factuality = parseFactualityFromAny(
          entry.factuality || entry.factualityRating || entry.factuality_score || entry.factualityScore || entry.truthiness,
        );
        const ownerNameFromId = normalizeText(ownerById.get(normalizeText(entry.ownerId || entry.owner_id || "")) || "");
        const ownershipFromOwners = Array.isArray(entry.owners)
          ? entry.owners
              .map((owner) => (owner && typeof owner === "object" ? normalizeText(owner.name || owner.label || owner.title || "") : ""))
              .filter(Boolean)
              .join(", ")
          : "";
        const ownership =
          parseOwnershipFromAny(entry.ownership || entry.owner || entry.ownerName || entry.parentCompany || entry.parent_company) ||
          ownershipFromOwners ||
          ownerNameFromId;
        const paywall = parsePaywallFromAny(entry.paywall || entry.paywallType || entry.isPaywalled || entry.hasPaywall);
        const outletName = normalizeText(entry.outlet || entry.publisher || entry.publisherName || entry.sourceName || entry.name || "");
        const logoUrl = normalizeText(entry.logo || entry.logoUrl || entry.icon || entry.image || "");

        if (host) {
          const existing = outletMetaByHost.get(host) || {};
          outletMetaByHost.set(host, {
            host,
            outletName: existing.outletName || outletName,
            logoUrl: existing.logoUrl || logoUrl,
            bias: existing.bias && existing.bias !== "unknown" ? existing.bias : bias,
            biasRating: existing.biasRating && existing.biasRating !== "unknown" ? existing.biasRating : biasRating,
            factuality: existing.factuality && existing.factuality !== "unknown" ? existing.factuality : factuality,
            ownership: existing.ownership || ownership,
            paywall: existing.paywall || paywall,
          });
        }
        if (sourceInfoId) {
          const existing = outletMetaById.get(sourceInfoId) || {};
          outletMetaById.set(sourceInfoId, {
            id: sourceInfoId,
            outletName: existing.outletName || outletName,
            logoUrl: existing.logoUrl || logoUrl,
            bias: existing.bias && existing.bias !== "unknown" ? existing.bias : bias,
            biasRating: existing.biasRating && existing.biasRating !== "unknown" ? existing.biasRating : biasRating,
            factuality: existing.factuality && existing.factuality !== "unknown" ? existing.factuality : factuality,
            ownership: existing.ownership || ownership,
            paywall: existing.paywall || paywall,
          });
        }
      }
    }

    const host = discoverHostFromNode(node);
    const nodeId = normalizeText(node.id || node.sourceInfoId || node.sourceInfoID || "");
    if (!host && !nodeId) return;

    const rawBias = parseBiasFromAny(node.bias || node.biasRating || node.lean || node.politicalBias || node.bias_label);
    const biasRating = parseBiasRatingFromAny(node.bias || node.biasRating || node.lean || node.politicalBias || node.bias_label);
    const bias = rawBias !== "unknown" ? rawBias : bucket3FromRating(biasRating);
    const factuality = parseFactualityFromAny(
      node.factuality || node.factualityRating || node.factuality_score || node.factualityScore || node.truthiness,
    );
    const ownershipFromOwners = Array.isArray(node.owners)
      ? node.owners
          .map((owner) => (owner && typeof owner === "object" ? normalizeText(owner.name || owner.label || owner.title || "") : ""))
          .filter(Boolean)
          .join(", ")
      : "";
    const ownership =
      parseOwnershipFromAny(node.ownership || node.owner || node.ownerName || node.parentCompany || node.parent_company) ||
      ownershipFromOwners;
    const paywall = parsePaywallFromAny(node.paywall || node.paywallType || node.isPaywalled || node.hasPaywall);
    const outletName = normalizeText(node.outlet || node.publisher || node.publisherName || node.sourceName || node.name || "");
    const logoUrl = normalizeText(node.logo || node.logoUrl || node.icon || node.image || "");

    const hasAnything =
      (bias && bias !== "unknown") ||
      (biasRating && biasRating !== "unknown") ||
      (factuality && factuality !== "unknown") ||
      Boolean(ownership) ||
      Boolean(paywall) ||
      Boolean(outletName) ||
      Boolean(logoUrl);
    if (!hasAnything) return;

    if (host) {
      const existing = outletMetaByHost.get(host) || {};
      outletMetaByHost.set(host, {
        host,
        outletName: existing.outletName || outletName,
        logoUrl: existing.logoUrl || logoUrl,
        bias: existing.bias && existing.bias !== "unknown" ? existing.bias : bias,
        biasRating: existing.biasRating && existing.biasRating !== "unknown" ? existing.biasRating : biasRating,
        factuality: existing.factuality && existing.factuality !== "unknown" ? existing.factuality : factuality,
        ownership: existing.ownership || ownership,
        paywall: existing.paywall || paywall,
      });
    }
    if (nodeId) {
      const existing = outletMetaById.get(nodeId) || {};
      outletMetaById.set(nodeId, {
        id: nodeId,
        outletName: existing.outletName || outletName,
        logoUrl: existing.logoUrl || logoUrl,
        bias: existing.bias && existing.bias !== "unknown" ? existing.bias : bias,
        biasRating: existing.biasRating && existing.biasRating !== "unknown" ? existing.biasRating : biasRating,
        factuality: existing.factuality && existing.factuality !== "unknown" ? existing.factuality : factuality,
        ownership: existing.ownership || ownership,
        paywall: existing.paywall || paywall,
      });
    }
  };

  const mergeSourceFromNode = (node) => {
    const rawUrl = typeof node.url === "string" ? node.url : typeof node.link === "string" ? node.link : "";
    const url = normalizeExternalUrl(rawUrl);
    if (!url || isGroundNewsUrl(url)) return;
    const host = normalizeHost(hostFromUrl(url));
    const resolveFlightRef = (ref, visited) => {
      if (typeof ref !== "string") return null;
      if (!ref.startsWith("$") || !ref.includes(":")) return null;
      const match = ref.match(/^\$([0-9a-zA-Z]+):(.+)$/);
      if (!match) return null;
      const baseId = match[1];
      const path = match[2];
      const key = `${baseId}:${path}`;
      if (visited.has(key)) return null;
      visited.add(key);
      const base = flightNodeById.get(baseId);
      if (!base) return null;
      const parts = path.split(":").filter(Boolean);
      let cur = base;
      for (const part of parts) {
        if (cur == null) return null;
        if (/^\d+$/.test(part)) {
          const idx = Number(part);
          if (!Array.isArray(cur)) return null;
          cur = cur[idx];
          continue;
        }
        if (typeof cur !== "object") return null;
        cur = cur[part];
      }
      return cur;
    };

    const sourceInfoCandidate = node.sourceInfo || node.source_info || null;
    const resolvedSourceInfo =
      sourceInfoCandidate && typeof sourceInfoCandidate === "object"
        ? sourceInfoCandidate
        : resolveFlightRef(sourceInfoCandidate, new Set());

    const sourceInfoId = normalizeText(
      node.sourceInfoId ||
        node.sourceInfoID ||
        node.source_info_id ||
        resolvedSourceInfo?.id ||
        resolvedSourceInfo?.sourceInfoId ||
        "",
    );
    const resolvedSourceInfoId = sourceInfoId || (host ? sourceInfoIdByHost.get(host) : "");
    const outletMeta =
      (resolvedSourceInfoId && outletMetaById.get(resolvedSourceInfoId)) || (host ? outletMetaByHost.get(host) : null);
    const rawBias =
      parseBiasFromAny(node.bias || node.biasRating || node.lean || "") || parseBiasFromAny(outletMeta?.bias);
    const biasRating =
      parseBiasRatingFromAny(node.bias || node.biasRating || node.lean || "") ||
      parseBiasRatingFromAny(outletMeta?.biasRating || outletMeta?.bias);
    const bias = rawBias !== "unknown" ? rawBias : bucket3FromRating(biasRating);
    const incoming = {
      url,
      sourceInfoId: resolvedSourceInfoId,
      sourceInfoSlug: normalizeText(resolvedSourceInfo?.slug || ""),
      outlet:
        normalizeText(node.outlet || node.publisher || node.publisherName || node.sourceName || resolvedSourceInfo?.name || "") ||
        normalizeText(outletMeta?.outletName || ""),
      excerpt: normalizeText(node.excerpt || node.summary || node.description || ""),
      logoUrl:
        normalizeText(node.logo || node.logoUrl || node.icon || node.image || resolvedSourceInfo?.icon || "") ||
        normalizeText(outletMeta?.logoUrl || ""),
      bias,
      biasRating,
      factuality:
        parseFactualityFromAny(node.factuality || node.factualityRating || node.factualityScore || resolvedSourceInfo?.factuality || "") ||
        parseFactualityFromAny(outletMeta?.factuality),
      ownership:
        normalizeText(node.ownership || "") ||
        normalizeText(
          Array.isArray(resolvedSourceInfo?.owners)
            ? resolvedSourceInfo.owners
                .map((o) => (o && typeof o === "object" ? normalizeText(o.name || o.label || o.title || "") : normalizeText(String(o || ""))))
                .filter(Boolean)
                .join(", ")
            : "",
        ) ||
        normalizeText(outletMeta?.ownership || ""),
      paywall: parsePaywallFromAny(node.paywall || node.paywallType || node.isPaywalled || node.hasPaywall) || normalizeText(outletMeta?.paywall || ""),
      locality: parseLocalityLabel(node.locality || "") || "",
      publishedAt: normalizeText(node.publishedAt || node.publishDate || node.date || ""),
    };
    const existing = sourceByUrl.get(url);
    sourceByUrl.set(url, existing ? mergeSourceCandidateRecords(existing, incoming) : incoming);
  };

  const maybeAddTag = (node) => {
    const rawHref = normalizeText(node.href || node.url || node.link || "");
    if (!rawHref || (!rawHref.includes("/interest/") && !rawHref.includes("/topic/"))) return;
    const name = normalizeText(node.name || node.label || node.title || "");
    if (!name || name.length < 2 || name.length > 60) return;
    tagSet.add(name);
  };

  const walk = (root) => {
    const stack = [root];
    const seenPointers = new Set();

    const tryResolvePointer = (value) => {
      if (typeof value !== "string") return null;
      if (!value.startsWith("$") || !value.includes(":")) return null;
      const match = value.match(/^\$([0-9a-zA-Z]+):(.+)$/);
      if (!match) return null;
      const baseId = match[1];
      const path = match[2];
      const key = `${baseId}:${path}`;
      if (seenPointers.has(key)) return null;
      seenPointers.add(key);
      const base = flightNodeById.get(baseId);
      if (!base) return null;
      const parts = path.split(":").filter(Boolean);
      let cur = base;
      for (const part of parts) {
        if (cur == null) return null;
        if (/^\d+$/.test(part)) {
          const idx = Number(part);
          if (!Array.isArray(cur)) return null;
          cur = cur[idx];
          continue;
        }
        if (typeof cur !== "object") return null;
        cur = cur[part];
      }
      return cur;
    };

    while (stack.length > 0) {
      const node = stack.pop();
      if (typeof node === "string") {
        const resolved = tryResolvePointer(node);
        if (resolved && typeof resolved === "object") {
          stack.push(resolved);
        }
        continue;
      }
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) {
        for (const child of node) stack.push(child);
        continue;
      }

      {
        const host = discoverHostFromNode(node);
        const id = extractSourceInfoIdFromNode(node);
        if (host && id && !sourceInfoIdByHost.has(host)) {
          sourceInfoIdByHost.set(host, id);
        }
      }

      recordKeyHits(node);
      mergeCoverageFromNode(node);
      mergeOutletMetaFromNode(node);
      mergeSourceFromNode(node);
      maybeAddTag(node);
      for (const value of Object.values(node)) {
        if (value && typeof value === "object") stack.push(value);
        else if (typeof value === "string" && value.startsWith("$") && value.includes(":")) {
          // Pointers into earlier flight nodes; resolve so we can see nested sourceInfo/registry objects.
          stack.push(value);
        }
      }
    }
  };

  for (const block of blocks) {
    const lines = String(block)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^([0-9a-zA-Z]+):(.+)$/);
      if (!match) continue;
      const flightId = match[1];
      const payload = match[2].trim().replace(/,$/, "");
      if (!(payload.startsWith("{") || payload.startsWith("["))) continue;
      try {
        const parsed = JSON.parse(payload);
        parsedLineCount += 1;
        flightNodeById.set(flightId, parsed);
        walk(parsed);
      } catch {
        // Not strict JSON or not a payload that we can parse directly.
      }
    }
  }

  const finalSources = Array.from(sourceByUrl.values()).map((source) => {
    const host = normalizeHost(hostFromUrl(source.url || ""));
    const id = normalizeText(source.sourceInfoId || "") || (host ? sourceInfoIdByHost.get(host) || "" : "");
    const meta = (id && outletMetaById.get(id)) || (host ? outletMetaByHost.get(host) : null);
    if (!meta) return source;

    const next = { ...source };
    if (id && !next.sourceInfoId) next.sourceInfoId = id;
    if (looksLikeWeakOutletLabel(next.outlet) && normalizeText(meta.outletName)) next.outlet = normalizeText(meta.outletName);
    if ((!next.logoUrl || !normalizeText(next.logoUrl)) && normalizeText(meta.logoUrl)) next.logoUrl = normalizeText(meta.logoUrl);
    if ((!next.biasRating || next.biasRating === "unknown") && meta.biasRating && meta.biasRating !== "unknown") {
      next.biasRating = meta.biasRating;
    }
    if ((!next.bias || next.bias === "unknown") && meta.bias && meta.bias !== "unknown") next.bias = meta.bias;
    if ((!next.bias || next.bias === "unknown") && next.biasRating && next.biasRating !== "unknown") {
      next.bias = bucket3FromRating(next.biasRating);
    }
    if ((!next.factuality || next.factuality === "unknown") && meta.factuality && meta.factuality !== "unknown") {
      next.factuality = meta.factuality;
    }
    if (!normalizeText(next.ownership) && normalizeText(meta.ownership)) next.ownership = normalizeText(meta.ownership);
    if (!normalizeText(next.paywall) && normalizeText(meta.paywall)) next.paywall = normalizeText(meta.paywall);
    return next;
  });

  return {
    chunkCount: blocks.length,
    parsedLineCount,
    coverage,
    tags: Array.from(tagSet).slice(0, 24),
    sources: finalSources,
    outletMetaCount: outletMetaByHost.size,
    outletMetaIdCount: outletMetaById.size,
    hostMapCount: sourceInfoIdByHost.size,
    keyHits,
    keySamples,
  };
}

async function clickIfVisible(locator, options = {}) {
  const { force = false } = options;
  try {
    const count = await locator.count();
    if (count === 0) return false;
    const first = locator.first();
    const visible = await first.isVisible().catch(() => false);
    if (!visible && !force) return false;
    await first.click({ timeout: 2500, force });
    await first.page().waitForTimeout(250);
    return true;
  } catch {
    return false;
  }
}

async function dismissGroundNewsCookies(page) {
  const cookieTargets = [
    page.getByRole("button", { name: /Reject Non-Essential/i }),
    page.getByRole("button", { name: /Accept All/i }),
    page.getByRole("button", { name: /^Save$/i }),
  ];

  for (const target of cookieTargets) {
    const clicked = await clickIfVisible(target);
    if (clicked) return true;
  }
  return false;
}

async function clickTopProceedToStory(page) {
  const proceedTargets = [
    page.getByRole("button", { name: /Proceed to/i }),
    page.getByRole("link", { name: /Proceed to/i }),
    page.getByRole("button", { name: /Your Story/i }),
    page.getByRole("link", { name: /Your Story/i }),
    page.locator("a:has-text('Your Story')"),
    page.getByText(/Proceed to\s+Your Story/i),
  ];
  for (const target of proceedTargets) {
    const clicked = (await clickIfVisible(target)) || (await clickIfVisible(target, { force: true }));
    if (!clicked) continue;
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    return true;
  }

  // Fallback for variants where ARIA roles are unreliable. We only click controls near the top.
  const clickedViaDom = await page.evaluate(() => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim().toLowerCase();
    const candidates = Array.from(document.querySelectorAll("a,button,[role='button']")).filter((node) => {
      const text = normalize(node.textContent || "");
      if (!text) return false;
      return (
        text.includes("proceed to your story") ||
        text === "your story" ||
        text.includes("proceed to ground news homepage") ||
        text.includes("ground news homepage")
      );
    });

    if (candidates.length === 0) return false;

    const visibleNearTop = candidates
      .map((node) => ({ node, box: node.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 12 && box.height > 10 && box.top >= -8 && box.top <= 180)
      .sort((a, b) => a.box.top - b.box.top);

    const target = visibleNearTop[0]?.node;
    if (!target) return false;

    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  });

  if (clickedViaDom) {
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    return true;
  }

  return false;
}

async function inspectStoryPageState(page, expectedStoryUrl) {
  return page.evaluate((rawExpected) => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim().toLowerCase();
    const bodyText = normalize(document.body?.innerText || "");
    const href = window.location.href;

    let expectedPath = "";
    try {
      expectedPath = new URL(rawExpected, window.location.origin).pathname.toLowerCase();
    } catch {
      expectedPath = "";
    }

    let currentPath = "";
    try {
      currentPath = new URL(href).pathname.toLowerCase();
    } catch {
      currentPath = "";
    }
    const onArticlePath = currentPath.includes("/article/");

    const headline = normalize(document.querySelector("main article h1, article h1, h1")?.textContent || "");
    const hasCoverageDetails = bodyText.includes("coverage details");
    const hasBiasDistribution = bodyText.includes("bias distribution");
    const hasReadFullArticle = bodyText.includes("read full article");
    const hasPodcastSection = bodyText.includes("podcasts") || bodyText.includes("opinions");
    const hasSimilarTopics = bodyText.includes("similar news topics");
    const hasCoverageSnapshot = bodyText.includes("coverage snapshot");
    const hasSourceFilters = bodyText.includes("full coverage sources") || bodyText.includes("sort") || bodyText.includes("paywall");
    const hasArticleSections = hasPodcastSection || hasSimilarTopics || hasCoverageSnapshot || hasSourceFilters;
    const hasExternalSourceLink = Array.from(document.querySelectorAll("a[href]")).some((node) => {
      const href = (node.getAttribute("href") || "").trim();
      if (!href) return false;
      try {
        const absolute = new URL(href, window.location.origin);
        return /^https?:$/i.test(absolute.protocol) && !/(\.|^)ground\.news$/i.test(absolute.hostname);
      } catch {
        return false;
      }
    });
    const hasArticleMarkers =
      headline.length >= 12 && (hasCoverageDetails || hasBiasDistribution || hasReadFullArticle || hasArticleSections || hasExternalSourceLink);

    const hasTopProceedControl = Array.from(document.querySelectorAll("a,button,[role='button']")).some((node) => {
      const text = normalize(node.textContent || "");
      if (!text) return false;
      const rect = node.getBoundingClientRect();
      if (!(rect.width > 12 && rect.height > 10 && rect.top >= -8 && rect.top <= 180)) return false;
      return (
        text.includes("proceed to your story") ||
        text === "your story" ||
        text.includes("proceed to ground news homepage") ||
        text.includes("ground news homepage")
      );
    });

    const looksLikePromoInterstitial =
      !hasArticleMarkers &&
      hasTopProceedControl &&
      (bodyText.includes("see every side of every story") || bodyText.includes("see every side of every news story")) &&
      bodyText.includes("subscribe");

    const samePath = expectedPath ? currentPath === expectedPath : true;

    return {
      href,
      headline,
      hasArticleMarkers,
      hasExternalSourceLink,
      hasTopProceedControl,
      looksLikePromoInterstitial,
      samePath,
      onArticlePath,
    };
  }, expectedStoryUrl);
}

async function ensureStoryPageLoaded(page, storyUrl) {
  await dismissGroundNewsCookies(page);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const state = await inspectStoryPageState(page, storyUrl);
    if (state.hasArticleMarkers) {
      return;
    }

    await dismissGroundNewsCookies(page);
    if (state.hasTopProceedControl || state.looksLikePromoInterstitial) {
      const progressed = await clickTopProceedToStory(page);
      if (progressed) continue;
    }

    // If we're still on the same article path, give hydration a short window before the next attempt.
    if (state.samePath || state.onArticlePath) {
      await page.waitForTimeout(1200);
      continue;
    }
    break;
  }

  const finalState = await inspectStoryPageState(page, storyUrl);
  if (!finalState.hasArticleMarkers) {
    if (finalState.onArticlePath || (finalState.samePath && (finalState.headline.length >= 10 || finalState.hasExternalSourceLink))) {
      return;
    }
    throw new Error(`Unable to reach story content (no article markers): ${finalState.href}`);
  }
}

async function expandSourceCards(page, maxClicks = 8) {
  for (let i = 0; i < maxClicks; i += 1) {
    const moreButtons = [
      page.getByRole("button", { name: /More articles/i }),
      page.locator("button:has-text('More articles')"),
      page.getByRole("button", { name: /Show all/i }),
      page.locator("button:has-text('Show all')"),
      page.getByRole("button", { name: /More sources/i }),
      page.locator("button:has-text('More sources')"),
    ];

    let clicked = false;
    for (const button of moreButtons) {
      try {
        const count = await button.count();
        if (count === 0) continue;
        const first = button.first();
        await first.scrollIntoViewIfNeeded().catch(() => {});
        clicked = (await clickIfVisible(first)) || (await clickIfVisible(first, { force: true }));
        if (clicked) break;
      } catch {
        // noop
      }
    }

    if (!clicked) break;
    await page.waitForTimeout(650);
  }
}

async function collectHomepageSnapshot(page, options, auditState) {
  const homepageUrl = "https://ground.news/";
  await page.goto(homepageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(900);
  await dismissGroundNewsCookies(page);
  await clickTopProceedToStory(page);
  await dismissGroundNewsCookies(page);

  for (let i = 0; i < 6; i += 1) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);
    await dismissGroundNewsCookies(page);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);

  const featureData = await page.evaluate(() => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
    const toAbs = (raw) => {
      try {
        return new URL(raw, window.location.origin).toString();
      } catch {
        return null;
      }
    };
    const dedup = (list) => Array.from(new Set(list.filter(Boolean)));
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    const hrefs = dedup(anchors.map((a) => toAbs(a.getAttribute("href") || a.href)));
    const storyLinks = hrefs.filter((href) => href.includes("/article/"));
    const topicLinks = hrefs.filter((href) => href.includes("/interest/"));
    const outletLinks = hrefs.filter((href) => href.includes("/my/discover/source"));

    const cards = [];
    const seen = new Set();
    for (const anchor of anchors) {
      const href = toAbs(anchor.getAttribute("href") || anchor.href);
      if (!href || !href.includes("/article/")) continue;
      if (seen.has(href)) continue;
      const text = normalize(anchor.textContent || "");
      if (text.length < 16) continue;
      seen.add(href);
      cards.push({
        href,
        title: text.slice(0, 240),
      });
    }

    const bodyText = normalize(document.body?.innerText || "");
    const headings = dedup(
      Array.from(document.querySelectorAll("h1,h2,h3"))
        .map((node) => normalize(node.textContent || ""))
        .filter((text) => text.length >= 3),
    ).slice(0, 80);

    const topicPills = dedup(
      Array.from(document.querySelectorAll("a[href*='/interest/'], button"))
        .map((node) => normalize(node.textContent || ""))
        .filter((text) => text.length >= 2 && text.length <= 48),
    ).slice(0, 80);

    return {
      url: window.location.href,
      title: normalize(document.title),
      storyLinks,
      topicLinks,
      outletLinks,
      topStoryCards: cards.slice(0, 120),
      headings,
      topicPills,
      moduleFlags: {
        hasPipelineSnapshot: bodyText.toLowerCase().includes("pipeline snapshot"),
        hasDailyBriefing: bodyText.toLowerCase().includes("daily briefing"),
        hasBlindspotWatch: bodyText.toLowerCase().includes("blindspot watch"),
        hasCompareFraming: bodyText.toLowerCase().includes("compare framing"),
      },
      counts: {
        anchors: anchors.length,
        storyLinks: storyLinks.length,
        topicLinks: topicLinks.length,
        outletLinks: outletLinks.length,
      },
      capturedAt: new Date().toISOString(),
    };
  });

  if (auditState?.enabled) {
    const html = await page.content();
    const homepageHtmlPath = path.join(auditState.dir, "homepage.raw.html");
    const homepageFeaturesPath = path.join(auditState.dir, "homepage.features.json");
    await writeTextFile(homepageHtmlPath, html);
    await writeJsonFile(homepageFeaturesPath, featureData);
    auditState.index.homepage = {
      url: featureData.url,
      htmlPath: homepageHtmlPath,
      featurePath: homepageFeaturesPath,
      storyLinkCount: featureData.counts.storyLinks,
      capturedAt: featureData.capturedAt,
    };
  }

  const uniqueLinks = Array.from(new Set(featureData.storyLinks.map(normalizeExternalUrl).filter(Boolean)));
  const limit = Number.isFinite(options.storyLimit) && options.storyLimit > 0 ? options.storyLimit : uniqueLinks.length;
  return {
    ...featureData,
    discoveredLinks: uniqueLinks.slice(0, limit),
  };
}

async function fetchSourceMetadata(url, cache) {
  if (cache.has(url)) return cache.get(url);

  const task = (async () => {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS),
        headers: {
          "user-agent": "OpenGroundNewsCrawler/2.0",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (!response.ok) {
        return { excerpt: "", publishedAt: null, title: "", imageUrl: "" };
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/html")) {
        return { excerpt: "", publishedAt: null, title: "", imageUrl: "" };
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const paragraphCandidates = $("article p, main p, p")
        .toArray()
        .map((el) => normalizeText($(el).text() || ""))
        .filter((text) => text.length >= 80)
        .filter((text) => !/^(updated|published|by\s+[A-Z]|copyright|all rights reserved)/i.test(text))
        .slice(0, 6);
      const excerpt =
        $("meta[property='og:description']").attr("content") ||
        $("meta[name='description']").attr("content") ||
        paragraphCandidates[0] ||
        "";

      const publishedAt =
        $("meta[property='article:published_time']").attr("content") ||
        $("meta[name='pubdate']").attr("content") ||
        $("time").first().attr("datetime") ||
        "";

      const title =
        $("meta[property='og:title']").attr("content") ||
        $("h1").first().text() ||
        $("title").text() ||
        "";
      const imageUrl =
        $("meta[property='og:image']").attr("content") ||
        $("meta[name='twitter:image']").attr("content") ||
        "";

      return {
        excerpt: summarizeText(sanitizeSummaryText(excerpt), ""),
        publishedAt: parsePublishedAt(publishedAt),
        title: normalizeText(title),
        imageUrl: normalizeText(imageUrl),
      };
    } catch {
      return { excerpt: "", publishedAt: null, title: "", imageUrl: "" };
    }
  })();

  cache.set(url, task);
  return task;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker());
  await Promise.all(workers);
  return results;
}

function findOutletReference(outletName, sourceUrl) {
  const outlet = normalizeText(outletName).toLowerCase();
  const host = normalizeText(hostFromUrl(sourceUrl)).toLowerCase();
  if (!outlet && !host) return null;
  for (const [match, data] of OUTLET_REFERENCE_DATA.entries()) {
    if (outlet.includes(match) || host.includes(match)) return data;
  }
  return null;
}

function applyReferenceToSource(source) {
  const reference = findOutletReference(source.outlet, source.url);
  if (!reference) return source;
  const biasRating = parseBiasRatingLabel(source.biasRating || reference.biasRating || "");
  const inferredBias = bucket3FromRating(biasRating);
  return {
    ...source,
    biasRating: source.biasRating && source.biasRating !== "unknown" ? source.biasRating : biasRating,
    bias: source.bias && source.bias !== "unknown" ? source.bias : inferredBias,
    factuality:
      source.factuality && source.factuality !== "unknown" ? source.factuality : parseFactualityLabel(reference.factuality || ""),
    websiteUrl: source.websiteUrl || reference.websiteUrl,
    country: source.country || reference.country,
    foundedYear: typeof source.foundedYear === "number" ? source.foundedYear : reference.foundedYear,
    description: source.description || reference.description,
  };
}

function aggregateOutletBias(sources) {
  const byOutlet = new Map();
  for (const source of sources) {
    const key = normalizeText(source.outlet).toLowerCase();
    if (!key) continue;
    const item = byOutlet.get(key) || { left: 0, center: 0, right: 0 };
    if (source.bias === "left") item.left += 1;
    if (source.bias === "center") item.center += 1;
    if (source.bias === "right") item.right += 1;
    byOutlet.set(key, item);
  }

  return sources.map((source) => {
    if (source.bias && source.bias !== "unknown") return source;
    const bucket = byOutlet.get(normalizeText(source.outlet).toLowerCase());
    if (!bucket) return source;
    const ranked = [
      { key: "left", value: bucket.left },
      { key: "center", value: bucket.center },
      { key: "right", value: bucket.right },
    ].sort((a, b) => b.value - a.value);
    const top = ranked[0];
    if (!top || top.value <= 0) return source;
    return { ...source, bias: top.key };
  });
}

async function cacheStoryImage(imageUrl, storySlug) {
  const cleaned = normalizeText(imageUrl);
  if (!cleaned || cleaned.startsWith("/images/")) return cleaned || fallbackImageForSeed(storySlug);
  try {
    const parsed = new URL(cleaned);
    if (!/^https?:$/i.test(parsed.protocol)) return fallbackImageForSeed(storySlug);

    const response = await fetch(parsed.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(IMAGE_CACHE_TIMEOUT_MS),
      headers: {
        "user-agent": "OpenGroundNewsImageCache/1.0",
        accept: "image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) return cleaned;
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) return cleaned;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > IMAGE_CACHE_MAX_BYTES) return cleaned;

    const ext =
      contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : contentType.includes("gif")
            ? "gif"
            : contentType.includes("jpeg") || contentType.includes("jpg")
              ? "jpg"
              : "jpg";
    const fileName = `${shortHash(`${storySlug}:${parsed.toString()}`, 16)}.${ext}`;
    const targetPath = path.join(IMAGE_CACHE_DIR, fileName);
    await fs.mkdir(IMAGE_CACHE_DIR, { recursive: true });
    await fs.writeFile(targetPath, buffer);
    return `/images/cache/${fileName}`;
  } catch {
    return cleaned || fallbackImageForSeed(storySlug);
  }
}

function deriveBiasDistribution(sources) {
  const known = sources.filter((source) => source.bias !== "unknown");
  if (known.length === 0) return { left: 0, center: 0, right: 0 };

  const left = known.filter((s) => s.bias === "left").length;
  const center = known.filter((s) => s.bias === "center").length;
  const right = known.filter((s) => s.bias === "right").length;

  return {
    left: Math.round((left / known.length) * 100),
    center: Math.round((center / known.length) * 100),
    right: Math.round((right / known.length) * 100),
  };
}

function chooseStoryLocation(rendered) {
  const candidate = normalizeText(rendered.location);
  const allowed = ["International", "United States", "Canada", "United Kingdom", "Europe"];
  if (allowed.includes(candidate)) return candidate;

  const context = `${rendered.title} ${rendered.summary} ${(rendered.tags || []).join(" ")}`.toLowerCase();
  if (/\b(usa|u\.s\.|united states|washington|american)\b/.test(context)) return "United States";
  if (/\b(canada|canadian)\b/.test(context)) return "Canada";
  if (/\b(united kingdom|uk|britain|british)\b/.test(context)) return "United Kingdom";
  if (/\b(europe|eu)\b/.test(context)) return "Europe";
  return "International";
}

function computeLinkSignals(scrapeOutput) {
  const map = new Map();
  for (const routeResult of scrapeOutput.routes || []) {
    if (routeResult.status !== "ok") continue;
    const route = routeResult.routeUrl || "";
    const routeFlags = {
      trending: /\/(?:$|my)/i.test(route),
      blindspot: /\/blindspot/i.test(route),
      local: /\/local/i.test(route),
    };

    for (const raw of routeResult.storyLinks || []) {
      const url = normalizeExternalUrl(raw);
      if (!url) continue;
      const prev = map.get(url) || { trending: false, blindspot: false, local: false };
      map.set(url, {
        trending: prev.trending || routeFlags.trending,
        blindspot: prev.blindspot || routeFlags.blindspot,
        local: prev.local || routeFlags.local,
      });
    }
  }
  return map;
}

async function extractStoryFromDom(page, storyUrl, auditState = null, articleOrdinal = 0) {
  await page.goto(storyUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await ensureStoryPageLoaded(page, storyUrl);
  await dismissGroundNewsCookies(page);
  await page.waitForTimeout(1200);
  await expandSourceCards(page, 10);
  await page.evaluate(() => window.scrollTo(0, Math.min(window.innerHeight * 1.3, document.body.scrollHeight)));
  await page.waitForTimeout(350);
  await page.evaluate(() => window.scrollTo(0, 0));

  const rendered = await page.evaluate(() => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
    const meta = (selector) => normalize(document.querySelector(selector)?.getAttribute("content") || "");

    const extractBiasFromText = (text) => {
      const value = text.toLowerCase();
      if (value.includes("center")) return "center";
      if (value.includes("left")) return "left";
      if (value.includes("right")) return "right";
      return "unknown";
    };

    const extractFactuality = (text) => {
      const value = text.toLowerCase();
      if (value.includes("very high")) return "very-high";
      if (/(^|\s)high(\s|$)/.test(value)) return "high";
      if (value.includes("mixed")) return "mixed";
      if (value.includes("very low")) return "very-low";
      if (/(^|\s)low(\s|$)/.test(value)) return "low";
      return "unknown";
    };

    const extractPaywall = (text) => {
      const value = text.toLowerCase();
      if (!value.includes("paywall")) return "";
      if (value.includes("no paywall")) return "none";
      if (value.includes("soft")) return "soft";
      return "hard";
    };

    const extractLocality = (text) => {
      const value = text.toLowerCase();
      if (value.includes("local")) return "local";
      if (value.includes("national")) return "national";
      if (value.includes("international")) return "international";
      return "";
    };

    const toHost = (raw) => {
      try {
        return new URL(raw).hostname.replace(/^www\./, "");
      } catch {
        return raw;
      }
    };

    const toAbs = (raw) => {
      const clean = normalize(raw || "");
      if (!clean) return "";
      try {
        return new URL(clean, window.location.origin).toString();
      } catch {
        return "";
      }
    };

    const parseCountAfter = (label, text) => {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = text.match(new RegExp(`${escaped}\\s*[:\\-]?\\s*([0-9][0-9,]{0,8})`, "i"));
      if (!match) return undefined;
      const parsed = Number(match[1].replace(/,/g, ""));
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const parseBiasPercentages = (text) => {
      const match =
        text.match(/\bL\s*(\d{1,3})%\s*C\s*(\d{1,3})%\s*R\s*(\d{1,3})%/i) ||
        text.match(/\bleft\s*(\d{1,3})%.*?\bcenter\s*(\d{1,3})%.*?\bright\s*(\d{1,3})%/i);
      if (!match) return undefined;
      const left = Number(match[1]);
      const center = Number(match[2]);
      const right = Number(match[3]);
      if (![left, center, right].every((n) => Number.isFinite(n))) return undefined;
      return { left, center, right };
    };

    const parseCoverageFromText = (text) => {
      const value = normalize(text);
      if (!value) {
        return {
          totalSources: undefined,
          leaningLeft: undefined,
          center: undefined,
          leaningRight: undefined,
          percentages: undefined,
        };
      }

      const pickCount = (labels) => {
        for (const label of labels) {
          const parsed = parseCountAfter(label, value);
          if (Number.isFinite(parsed)) return parsed;
        }
        return undefined;
      };

      return {
        totalSources: pickCount(["Total News Sources", "Total Sources", "Sources"]),
        leaningLeft: pickCount(["Leaning Left", "Left Sources", "Left Coverage"]),
        center: pickCount(["Center", "Centre", "Center Sources", "Center Coverage"]),
        leaningRight: pickCount(["Leaning Right", "Right Sources", "Right Coverage"]),
        percentages: parseBiasPercentages(value),
      };
    };

    const maxFinite = (...values) => {
      const finite = values.filter((v) => Number.isFinite(v));
      return finite.length > 0 ? Math.max(...finite.map((v) => Number(v))) : undefined;
    };

    const cleanSnippet = (value) => {
      const input = normalize(value || "");
      if (!input) return "";
      return input
        .replace(/read in (ground\s?news|opengroundnews) reader/gi, " ")
        .replace(/open original/gi, " ")
        .replace(/read full article/gi, " ")
        .replace(/view article/gi, " ")
        .replace(/caret right icon|too big arrow icon|info icon/gi, " ")
        .replace(/upgrade to vantage/gi, " ")
        .replace(/factuality\s*info icon/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    };

    const isWeakOutletLabel = (value) => {
      const text = normalize(value || "").toLowerCase();
      if (!text) return true;
      if (/^\d+\s+(hours?|days?|minutes?)\s+ago/.test(text)) return true;
      if (/\b(hours?|days?|minutes?)\s+ago\b/.test(text)) return true;
      if (text.includes("read full article") || text.includes("open original")) return true;
      // City/country style placeholders often leak from source cards.
      if (/^[a-z .'-]{2,40},\s*[a-z .'-]{2,40}$/.test(text) && text.split(" ").length <= 5) return true;
      return false;
    };

    const isWeakExcerpt = (value) => {
      const text = cleanSnippet(value || "");
      if (!text) return true;
      if (text.length < 48) return true;
      if (/^\d+\s+(hours?|days?|minutes?)\s+ago\b/i.test(text)) return true;
      if (/^(updated|published)\b/i.test(text)) return true;
      return false;
    };

    const parseFactualityFromBlock = (text) => {
      const match = text.match(/factuality\s*[:\-]?\s*(very high|high|mixed|very low|low)\b/i);
      if (match) return extractFactuality(match[1]);
      return extractFactuality(text);
    };

	    const parseOwnershipFromBlock = (text) => {
	      const match = text.match(/ownership\s*[:\-]\s*([^\n]{2,140})/i);
	      if (!match) return "";
	      const cleaned = cleanSnippet(match[1].split(/paywall|locality|read|open|reposted|published|updated/i)[0]);
	      if (!cleaned || cleaned.length < 2) return "";
	      if (/^(unknown|na|n\/a)$/i.test(cleaned)) return "";
	      return cleaned;
	    };

	    const parseRepostedByFromBlock = (text) => {
	      const value = normalize(text || "").toLowerCase();
	      if (!value.includes("reposted")) return undefined;
	      const match =
	        value.match(/reposted\s+by\s+(\d{1,4})\s+other\s+sources?/i) ||
	        value.match(/reposted\s+by\s+(\d{1,4})\b/i);
	      if (!match) return undefined;
	      const parsed = Number(match[1]);
	      return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : undefined;
	    };

	    const parsePaywallFromBlock = (text) => {
	      const match = text.match(/paywall\s*[:\-]?\s*(no paywall|soft|hard|unknown)\b/i);
	      if (match) return extractPaywall(match[1]);
	      return extractPaywall(text);
	    };

    const parseLocalityFromBlock = (text) => {
      const match = text.match(/locality\s*[:\-]?\s*(local|national|international)\b/i);
      if (match) return extractLocality(match[1]);
      return extractLocality(text);
    };

    const extractSimilarTopicsFromModule = () => {
      const BIAS_LABEL = /^(lean left|lean right|far left|far right|left|right|center)$/i;
      const SKIP_TEXT = /^(show all|all|\+\d+)$/i;

      const tagSet = new Set();
      const candidates = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span,strong"))
        .map((node) => ({ node, text: normalize(node.textContent || "") }))
        .filter(({ text }) => /^(similar news topics|related topics)$/i.test(text));

      const collectFromContainer = (container) => {
        if (!container) return [];
        const interestAnchors = container.querySelectorAll("a[href*='/interest/'],a[href*='/topic/']");
        const trendingAnchors = container.querySelectorAll("a[id^='trending-topic_'][href*='/interest/']");
        const maxAnchors = 36;
        if (interestAnchors.length === 0 || interestAnchors.length > maxAnchors) return [];

        // The Similar Topics module uses stable "trending-topic_*" ids today. Avoid falling back to
        // generic interest links unless the container is already very small.
        if (trendingAnchors.length === 0 && interestAnchors.length > 12) return [];

        const anchors = trendingAnchors.length > 0 ? Array.from(trendingAnchors) : Array.from(interestAnchors);
        const tags = [];

        for (const anchor of anchors) {
          const href = normalize(anchor.getAttribute("href") || "");
          if (!href || href.includes("#bias-ratings")) continue;

          let text = normalize(anchor.textContent || "");
          const alt = normalize(anchor.querySelector("img")?.getAttribute("alt") || "");
          if (alt && /icon$/i.test(alt) && alt.length <= 70) {
            const cleanedAlt = normalize(alt.replace(/\bicon\b/i, ""));
            if (cleanedAlt && cleanedAlt.length <= 48) text = cleanedAlt;
          }

          if (!text || text.length < 2 || text.length > 48) continue;
          if (SKIP_TEXT.test(text)) continue;
          if (BIAS_LABEL.test(text)) continue;
          tags.push(text);
          if (tags.length >= 18) break;
        }

        return tags;
      };

      // Prefer the actual "Similar News Topics" module container, not global nav.
      for (const { node } of candidates) {
        let current = node;
        for (let depth = 0; depth < 10 && current; depth += 1) {
          const container = current.parentElement;
          current = container;
          if (!container) break;

          const interestCount = container.querySelectorAll("a[href*='/interest/'],a[href*='/topic/']").length;
          if (interestCount === 0 || interestCount > 60) continue;

          const tags = collectFromContainer(container);
          if (tags.length >= 2) {
            for (const t of tags) {
              if (!tagSet.has(t)) tagSet.add(t);
              if (tagSet.size >= 24) break;
            }
            break;
          }
        }
        if (tagSet.size >= 2) break;
      }

      if (tagSet.size > 0) {
        return Array.from(tagSet);
      }

      const keywordMeta = normalize(document.querySelector("meta[name='keywords']")?.getAttribute("content") || "");
      if (keywordMeta) {
        return keywordMeta
          .split(",")
          .map((part) => normalize(part))
          .filter((text) => text.length >= 2 && text.length <= 48 && !BIAS_LABEL.test(text) && !SKIP_TEXT.test(text))
          .slice(0, 16);
      }

      return [];
    };

    const tags = extractSimilarTopicsFromModule();

    const sourceByUrl = new Map();
    const sourceCandidateLinks = Array.from(document.querySelectorAll("a[href^='http']")).filter((anchor) => {
      const label = normalize(anchor.textContent || anchor.getAttribute("aria-label") || "").toLowerCase();
      const container = anchor.closest("article, li, section, div");
      const containerText = normalize(container?.innerText || container?.textContent || "").toLowerCase();
      return (
        /read full article|open original|view article/.test(label) ||
        /lean left|lean right|far left|far right|factuality|ownership|paywall|reposted by/.test(containerText)
      );
    });

    for (const linkNode of sourceCandidateLinks) {
      let sourceUrl;
      try {
        sourceUrl = new URL(linkNode.href, window.location.href);
      } catch {
        continue;
      }
      if (!/^https?:$/i.test(sourceUrl.protocol)) continue;
      if (sourceUrl.hostname.endsWith("ground.news")) continue;
      if (/x\.com|twitter\.com|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|tiktok\.com/i.test(sourceUrl.hostname)) {
        continue;
      }

      const normalizedUrl = sourceUrl.toString();
      if (sourceByUrl.has(normalizedUrl)) continue;

      const container = linkNode.closest("article, li, section, div");
      const rawBlock = normalize(container?.innerText || container?.textContent || linkNode.textContent || "");
      const block = cleanSnippet(rawBlock);
      if (block.length < 24) continue;
      if (/see every side of every story|get unlimited access|join our community|subscribe|start free trial|upgrade to vantage/i.test(block)) {
        continue;
      }
      if (/^bit\.ly$/i.test(sourceUrl.hostname)) continue;

      const lines = (container?.innerText || container?.textContent || "")
        .split(/\n+/)
        .map((line) => cleanSnippet(line))
        .filter(Boolean);
      const outletLink =
        container?.querySelector("a[href*='/my/discover/source'], a[href*='/source/'], a[href*='/publisher/']") ||
        container?.querySelector("a[href*='/interest/']");
      const outletFromInterest = normalize(outletLink?.textContent || outletLink?.getAttribute("aria-label") || "");
      const outletProfileUrl = toAbs(outletLink?.getAttribute("href") || (outletLink?.href ?? ""));
      const outletFromLine =
        lines.find((line) => {
          const lower = line.toLowerCase();
          if (line.length < 2 || line.length > 64) return false;
          if (/read full article|open original|view article|factuality|ownership|paywall|reposted by/.test(lower)) return false;
          if (/^(\d+\s*(hours?|days?|minutes?)\s+ago|updated|published)/.test(lower)) return false;
          if (/lean left|lean right|far left|far right|center|left|right/.test(lower)) return false;
          return true;
        }) || "";
      const outletCandidate = outletFromInterest || outletFromLine || "";
      const outlet = !isWeakOutletLabel(outletCandidate) ? outletCandidate : toHost(normalizedUrl);

      const biasLabel = normalize(container?.querySelector("a[href*='#bias-ratings']")?.textContent || "");
      const paragraphText = cleanSnippet(normalize(container?.querySelector("p")?.textContent || ""));
      const excerptLine =
        lines.find((line) => {
          const lower = line.toLowerCase();
          if (line.length < 42) return false;
          if (/read full article|open original|view article|factuality|ownership|paywall|reposted by/.test(lower)) return false;
          if (/lean left|lean right|far left|far right/.test(lower)) return false;
          return true;
        }) || "";
      const sentenceExcerpt = cleanSnippet(block.split(/(?<=[.!?])\s+/).find((part) => part.length > 70) || block.slice(0, 280));
      const primaryExcerpt = paragraphText || excerptLine || sentenceExcerpt;
      const excerpt = isWeakExcerpt(primaryExcerpt) ? sentenceExcerpt : primaryExcerpt;

      const logoUrl = normalize(
        outletLink?.querySelector("img")?.getAttribute("src") ||
          container?.querySelector("img")?.getAttribute("src") ||
          "",
      );
      const publishedAt =
        normalize(container?.querySelector("time")?.getAttribute("datetime") || "") ||
        normalize(container?.querySelector("time")?.textContent || "");

	      sourceByUrl.set(normalizedUrl, {
	        url: normalizedUrl,
	        outlet,
	        excerpt,
	        logoUrl,
          outletProfileUrl,
          groundNewsSourceId: undefined,
          groundNewsSourceSlug: undefined,
	        bias: extractBiasFromText(`${biasLabel} ${block}`),
	        factuality: parseFactualityFromBlock(block),
	        paywall: parsePaywallFromBlock(block),
	        locality: parseLocalityFromBlock(block),
	        ownership: parseOwnershipFromBlock(block),
	        repostedBy: parseRepostedByFromBlock(block),
	        publishedAt,
	      });
	    }

    const nextDataText = document.getElementById("__NEXT_DATA__")?.textContent || "";
    let nextCoverage = null;
    if (nextDataText) {
      try {
        const parsed = JSON.parse(nextDataText);
        const stack = [parsed];
        while (stack.length > 0) {
          const node = stack.pop();
          if (!node || typeof node !== "object") continue;
          if (Array.isArray(node)) {
            for (const item of node) stack.push(item);
            continue;
          }

          const values = Object.values(node);
          for (const value of values) {
            if (value && typeof value === "object") stack.push(value);
          }

          const anyNode = node;
          // Best-effort capture of structured coverage/bias distribution if present in hydration state.
          if (!nextCoverage && typeof anyNode === "object") {
            const totalSources = maxFinite(
              anyNode.totalNewsSources,
              anyNode.totalSources,
              anyNode.sourceCount,
              anyNode.total_count,
              anyNode.totalCount,
            );
            const leaningLeft = maxFinite(anyNode.leaningLeft, anyNode.leftSources, anyNode.leftCount);
            const center = maxFinite(anyNode.center, anyNode.centre, anyNode.centerSources, anyNode.centerCount);
            const leaningRight = maxFinite(anyNode.leaningRight, anyNode.rightSources, anyNode.rightCount);
            const pctLeft = maxFinite(anyNode.leftPercent, anyNode.leftPct, anyNode.left_percentage);
            const pctCenter = maxFinite(anyNode.centerPercent, anyNode.centerPct, anyNode.center_percentage);
            const pctRight = maxFinite(anyNode.rightPercent, anyNode.rightPct, anyNode.right_percentage);
            const hasCounts = Number.isFinite(totalSources) || Number.isFinite(leaningLeft) || Number.isFinite(center) || Number.isFinite(leaningRight);
            const hasPcts = [pctLeft, pctCenter, pctRight].every((n) => Number.isFinite(n));
            if (hasCounts || hasPcts) {
              nextCoverage = {
                totalSources,
                leaningLeft,
                center,
                leaningRight,
                percentages: hasPcts ? { left: Number(pctLeft), center: Number(pctCenter), right: Number(pctRight) } : undefined,
              };
            }
          }

          const rawUrl = typeof anyNode.url === "string" ? anyNode.url : typeof anyNode.link === "string" ? anyNode.link : "";
          if (!rawUrl) continue;

          let sourceUrl;
          try {
            sourceUrl = new URL(rawUrl, window.location.href);
          } catch {
            continue;
          }
          if (!/^https?:$/i.test(sourceUrl.protocol)) continue;
          if (sourceUrl.hostname.endsWith("ground.news")) continue;

          const normalizedUrl = sourceUrl.toString();
          const existing = sourceByUrl.get(normalizedUrl);
          const sourceInfo = anyNode.sourceInfo || anyNode.source_info || anyNode.publisherInfo || anyNode.publisher_info || null;
          const outlet =
            normalize(anyNode.outlet || anyNode.publisher || anyNode.publisherName || anyNode.sourceName || sourceInfo?.name || "") ||
            sourceUrl.hostname.replace(/^www\./, "");
          const excerpt = normalize(anyNode.excerpt || anyNode.summary || anyNode.description || "");
	          const bias = extractBiasFromText(normalize(anyNode.bias || anyNode.biasRating || sourceInfo?.bias || sourceInfo?.politicalBias || ""));
	          const factuality = extractFactuality(normalize(anyNode.factuality || anyNode.factualityRating || sourceInfo?.factuality || ""));
	          const ownersRaw = sourceInfo?.owners || sourceInfo?.owner || sourceInfo?.ownership || null;
	          const ownership =
	            normalize(anyNode.ownership || "") ||
	            (Array.isArray(ownersRaw)
	              ? normalize(
	                  ownersRaw
	                    .map((o) => (typeof o === "string" ? o : o?.name || o?.label || ""))
	                    .filter(Boolean)
	                    .join(", "),
	                )
	              : normalize(typeof ownersRaw === "string" ? ownersRaw : ownersRaw?.name || ownersRaw?.label || ""));
	          const paywall = extractPaywall(normalize(anyNode.paywall || ""));
	          const locality = extractLocality(normalize(anyNode.locality || ""));
	          const repostedByRaw = anyNode.repostedBy || anyNode.reposted_by || anyNode.repostedByCount || "";
	          const repostedByParsed = Number(repostedByRaw);
	          const repostedBy = Number.isFinite(repostedByParsed) ? Math.max(0, Math.round(repostedByParsed)) : undefined;
	          const publishedAt = normalize(anyNode.publishedAt || anyNode.publishDate || anyNode.date || "");
	          const logoUrl = normalize(anyNode.logo || anyNode.logoUrl || anyNode.icon || anyNode.image || sourceInfo?.icon || "");
	          const groundNewsSourceId = normalize(sourceInfo?.id || sourceInfo?.sourceInfoId || "");
	          const groundNewsSourceSlug = normalize(sourceInfo?.slug || "");

          const outletFromExisting = existing?.outlet || "";
          const excerptFromExisting = existing?.excerpt || "";
          const outletResolved = !isWeakOutletLabel(outletFromExisting) ? outletFromExisting : outlet;
          const excerptResolved = !isWeakExcerpt(excerptFromExisting) ? excerptFromExisting : excerpt;

	          sourceByUrl.set(normalizedUrl, {
	            url: normalizedUrl,
	            outlet: outletResolved || outlet || sourceUrl.hostname.replace(/^www\./, ""),
	            excerpt: excerptResolved || excerpt || "",
	            logoUrl: existing?.logoUrl || logoUrl,
              outletProfileUrl: existing?.outletProfileUrl || "",
              groundNewsSourceId: existing?.groundNewsSourceId || groundNewsSourceId || undefined,
              groundNewsSourceSlug: existing?.groundNewsSourceSlug || groundNewsSourceSlug || undefined,
	            bias: existing?.bias !== "unknown" ? existing?.bias : bias,
	            factuality: existing?.factuality !== "unknown" ? existing?.factuality : factuality,
	            paywall: existing?.paywall || paywall,
	            locality: existing?.locality || locality,
	            ownership: existing?.ownership || ownership,
	            repostedBy: existing?.repostedBy ?? repostedBy,
	            publishedAt: existing?.publishedAt || publishedAt,
	          });
	        }
	      } catch {
	        // Ignore hydration payload parse failures.
	      }
	    }

    const title =
      meta("meta[property='og:title']") ||
      normalize(document.querySelector("h1")?.textContent || "") ||
      normalize(document.title) ||
      "Untitled story";
    const dek = normalize(
      meta("meta[name='description']") ||
        document.querySelector("h1 + h2")?.textContent ||
        document.querySelector("h1 + p")?.textContent ||
        "",
    );
    const author = normalize(
      meta("meta[name='author']") ||
        meta("meta[property='article:author']") ||
        document.querySelector("[rel='author']")?.textContent ||
        document.querySelector("[data-testid*='author'], [class*='author'], [class*='byline']")?.textContent ||
        "",
    )
      .replace(/^by\s+/i, "")
      .trim();

    const summaryCandidate =
      meta("meta[property='og:description']") ||
      meta("meta[name='description']") ||
      normalize(document.querySelector("main p")?.textContent || "");
    const summary = summaryCandidate;

    const topic =
      tags[0] ||
      meta("meta[property='article:section']") ||
      normalize(document.querySelector("main a[href*='/interest/']")?.textContent || "") ||
      "Top Stories";

    const location = normalize(
      document.querySelector("[data-edition], [aria-label*='Edition'] [data-value]")?.textContent ||
        document.querySelector("meta[name='geo.placename']")?.getAttribute("content") ||
        "",
    );

    const imageUrl =
      meta("meta[property='og:image']") ||
      normalize(document.querySelector("img")?.getAttribute("src") || "");

    const publishedAt =
      meta("meta[property='article:published_time']") ||
      meta("meta[name='pubdate']") ||
      normalize(document.querySelector("time")?.getAttribute("datetime") || "");

    const bodyText = normalize(document.body?.innerText || "");
    const textCoverage = parseCoverageFromText(bodyText);
    const coverage = {
      totalSources: nextCoverage?.totalSources ?? textCoverage.totalSources,
      leaningLeft: nextCoverage?.leaningLeft ?? textCoverage.leaningLeft,
      center: nextCoverage?.center ?? textCoverage.center,
      leaningRight: nextCoverage?.leaningRight ?? textCoverage.leaningRight,
      percentages: nextCoverage?.percentages ?? textCoverage.percentages,
    };

    const allHeadings = Array.from(document.querySelectorAll("h1,h2,h3"))
      .map((node) => normalize(node.textContent || ""))
      .filter(Boolean)
      .slice(0, 120);

    const openOriginalLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter((anchor) => /open original/i.test(normalize(anchor.textContent || "")))
      .map((anchor) => {
        try {
          return new URL(anchor.href, window.location.href).toString();
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const readerLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter((anchor) => /read in .*reader/i.test(normalize(anchor.textContent || "")))
      .map((anchor) => {
        try {
          return new URL(anchor.href, window.location.href).toString();
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const storyHashLinks = Array.from(document.querySelectorAll("a[href*='#']"))
      .map((anchor) => anchor.getAttribute("href") || "")
      .filter(Boolean)
      .slice(0, 80);
    const timelineHeaders = allHeadings
      .filter((heading) => {
        const lower = heading.toLowerCase();
        if (lower.length < 6 || lower.length > 110) return false;
        if (/^\d+\s+articles?/.test(lower)) return false;
        if (/coverage details|bias distribution|similar news topics|see every side|join our community/.test(lower)) return false;
        if (/factuality|ownership|info icon|arrow icon|icon/.test(lower)) return false;
        return true;
      })
      .slice(0, 10);
    const podcastReferences = Array.from(document.querySelectorAll("h2,h3,p,li,a[href]"))
      .map((node) => normalize(node.textContent || ""))
      .filter((text) => /podcast|opinion|insights by ground ai|listen to/i.test(text))
      .filter((text) => text.length >= 8 && text.length <= 180)
      .slice(0, 12);

    return {
      title,
      dek,
      author,
      summary,
      topic,
      tags,
      location,
      imageUrl,
      publishedAt,
      coverage,
      sources: Array.from(sourceByUrl.values()),
      readerLinks,
      timelineHeaders,
      podcastReferences,
      rawFeatures: {
        url: window.location.href,
        title,
        headingCount: allHeadings.length,
        headings: allHeadings,
        nextCoverage: nextCoverage,
        hasCoverageDetails: /coverage details/i.test(bodyText),
        hasBiasDistribution: /bias distribution/i.test(bodyText),
        hasReadFullArticle: /read full article/i.test(bodyText),
        hasPodcastsAndOpinions: /podcasts\s*&\s*opinions/i.test(bodyText),
        hasSimilarNewsTopics: /similar news topics/i.test(bodyText),
        hasUntrackedBias: /untracked bias/i.test(bodyText),
        hasOwnershipField: /ownership/i.test(bodyText),
        hasFactualityField: /factuality/i.test(bodyText),
        sourceCardCount: sourceByUrl.size,
        openOriginalLinks,
        readerLinks,
        storyHashLinks,
      },
    };
  });

  if (auditState?.enabled) {
    const key = `${String(articleOrdinal + 1).padStart(3, "0")}-${slugForFile(toSlugFromUrl(storyUrl, rendered.title))}-${shortHash(storyUrl)}`;
    const articleHtmlPath = path.join(auditState.dir, "articles", `${key}.raw.html`);
    const articleFeaturesPath = path.join(auditState.dir, "articles", `${key}.features.json`);
    const articleNextDataPath = path.join(auditState.dir, "articles", `${key}.__NEXT_DATA__.json`);
    const articleNextFlightPath = path.join(auditState.dir, "articles", `${key}.__NEXT_FLIGHT__.json`);
    const html = await page.content();
    await writeTextFile(articleHtmlPath, html);
    const nextDataRaw = extractNextDataRawFromHtml(html);
    if (nextDataRaw) {
      await writeTextFile(articleNextDataPath, nextDataRaw);
    } else {
      await writeTextFile(articleNextDataPath, "");
    }
    const nextFlightStructured = extractStructuredFromNextFlightHtml(html);
    await writeJsonFile(articleNextFlightPath, nextFlightStructured);

    await writeJsonFile(articleFeaturesPath, {
      capturedAt: new Date().toISOString(),
      storyUrl,
      extracted: rendered,
    });
    auditState.index.articles.push({
      storyUrl,
      htmlPath: articleHtmlPath,
      featurePath: articleFeaturesPath,
      nextDataPath: articleNextDataPath,
      nextFlightPath: articleNextFlightPath,
      sourceCardCount: rendered?.rawFeatures?.sourceCardCount ?? 0,
      hasBiasDistribution: Boolean(rendered?.rawFeatures?.hasBiasDistribution),
      hasCoverageDetails: Boolean(rendered?.rawFeatures?.hasCoverageDetails),
      nextFlightChunkCount: nextFlightStructured.chunkCount || 0,
      nextFlightParsedLines: nextFlightStructured.parsedLineCount || 0,
      nextFlightSourceCount: nextFlightStructured.sources?.length || 0,
    });
  }

  return rendered;
}

async function enrichSourceCandidate(storySlug, candidate, sourceMetadataCache, storyUrlForAssets) {
  const normalizedUrl = normalizeExternalUrl(candidate.url);
  if (!normalizedUrl || isGroundNewsUrl(normalizedUrl)) return null;

  const candidateExcerpt = normalizeText(candidate.excerpt);
  const candidatePublishedAt = parsePublishedAt(candidate.publishedAt);
  const shouldFetchSourceMeta = candidateExcerpt.length < 48 || !candidatePublishedAt;
  const sourceMeta = shouldFetchSourceMeta
    ? await fetchSourceMetadata(normalizedUrl, sourceMetadataCache)
    : { excerpt: "", publishedAt: null, title: "", imageUrl: "" };
  const outlet = normalizeText(candidate.outlet) || hostFromUrl(normalizedUrl);
  const excerptFromMeta = normalizeText(sourceMeta.excerpt);
  const excerptCandidate = looksLikeWeakExcerpt(candidateExcerpt) ? "" : candidateExcerpt;
  const excerptResolved = excerptCandidate || excerptFromMeta || candidateExcerpt || "";
  const excerpt = summarizeText(sanitizeSummaryText(excerptResolved), "Excerpt unavailable from publisher metadata.");
  const host = hostFromUrl(normalizedUrl);
  const websiteFromUrl = host ? normalizeExternalUrl(`https://${host}`) : "";
  const descriptionFallback =
    sanitizeSummaryText(candidate.description || sourceMeta.title || sourceMeta.excerpt || "") ||
    `${outlet} coverage sourced from publisher metadata.`;

  const baseSource = {
    id: stableId(`${storySlug}:${normalizedUrl}`, `${storySlug}-src`),
    outlet,
    url: normalizedUrl,
    excerpt,
    logoUrl: normalizeAssetUrl(candidate.logoUrl, storyUrlForAssets || "https://ground.news"),
    bias: parseBiasLabel(candidate.bias),
      biasRating: parseBiasRatingLabel(candidate.biasRating || ""),
    factuality: parseFactualityLabel(candidate.factuality),
    ownership: normalizeText(candidate.ownership) || "Unlabeled",
      groundNewsSourceId: normalizeText(candidate.sourceInfoId || candidate.groundNewsSourceId || "") || undefined,
      groundNewsSourceSlug: normalizeText(candidate.sourceInfoSlug || candidate.groundNewsSourceSlug || "") || undefined,
    repostedBy:
      typeof candidate.repostedBy === "number" && Number.isFinite(candidate.repostedBy)
        ? Math.max(0, Math.round(candidate.repostedBy))
        : undefined,
    publishedAt: candidatePublishedAt || sourceMeta.publishedAt || undefined,
    paywall: parsePaywallLabel(candidate.paywall),
    locality: parseLocalityLabel(candidate.locality),
    websiteUrl: normalizeExternalUrl(candidate.websiteUrl || websiteFromUrl || ""),
    country: normalizeText(candidate.country || inferCountryFromUrl(normalizedUrl) || ""),
    foundedYear: Number.isFinite(Number(candidate.foundedYear)) ? Number(candidate.foundedYear) : undefined,
    description: descriptionFallback,
  };

  return applyReferenceToSource(baseSource);
}

async function enrichStory(page, storyUrl, linkSignals, sourceMetadataCache, auditState, articleOrdinal) {
  const rendered = await extractStoryFromDom(page, storyUrl, auditState, articleOrdinal);
  const renderedHtml = await page.content().catch(() => "");
  const nextData = renderedHtml ? extractNextDataFromHtml(renderedHtml) : null;
  const nextFlightStructured = renderedHtml ? extractStructuredFromNextFlightHtml(renderedHtml) : null;
  const updatedAt = new Date().toISOString();
  const sourceOutletSet = new Set(
    (rendered.sources || [])
      .map((source) => normalizeText(source.outlet).toLowerCase())
      .filter(Boolean),
  );
  const seedTags = [...(rendered.tags || []), ...(nextFlightStructured?.tags || [])];
  const storyTextForRelevance = `${normalizeText(rendered.title)} ${normalizeText(rendered.summary)} ${normalizeText(rendered.dek)}`
    .toLowerCase()
    .replace(/\s+/g, " ");
  const relevantSeedTags = seedTags.filter((t) => tagSeemsRelevant(t, storyTextForRelevance));
  const relevanceFiltered = relevantSeedTags.length >= 2 ? relevantSeedTags : seedTags;
  const tags = sanitizeTags(
    relevanceFiltered.filter((tag) => !sourceOutletSet.has(normalizeText(tag).toLowerCase())),
  );
  const title = summarizeText(rendered.title, "Untitled story");
  const slug = toSlugFromUrl(storyUrl, title);
  const candidateByUrl = new Map(
    (rendered.sources || [])
      .map((source) => ({ ...source, url: normalizeExternalUrl(source.url) }))
      .filter((source) => source.url)
      .map((source) => [source.url, source]),
  );

  for (const source of nextFlightStructured?.sources || []) {
    const url = normalizeExternalUrl(source.url);
    if (!url) continue;
    const existing = candidateByUrl.get(url);
    candidateByUrl.set(url, existing ? mergeSourceCandidateRecords(existing, source) : source);
  }

  // If the DOM-based pass produced weak outlet/excerpt values, try to repair them from Next.js hydration state.
  if (nextData) {
    const byUrl = new Map(candidateByUrl);
    const stack = [nextData];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) {
        for (const item of node) stack.push(item);
        continue;
      }
      for (const value of Object.values(node)) {
        if (value && typeof value === "object") stack.push(value);
      }

      const anyNode = node;
      const rawUrl = typeof anyNode.url === "string" ? anyNode.url : typeof anyNode.link === "string" ? anyNode.link : "";
      const normalized = normalizeExternalUrl(rawUrl);
      if (!normalized) continue;
      const existing = byUrl.get(normalized) || { url: normalized };
      const incoming = {
        url: normalized,
        outlet: normalizeText(anyNode.outlet || anyNode.publisher || anyNode.publisherName || anyNode.sourceName || ""),
        excerpt: normalizeText(anyNode.excerpt || anyNode.summary || anyNode.description || ""),
        logoUrl: normalizeText(anyNode.logo || anyNode.logoUrl || anyNode.icon || anyNode.image || ""),
        bias: parseBiasLabel(anyNode.bias || anyNode.biasRating || ""),
        factuality: parseFactualityLabel(anyNode.factuality || anyNode.factualityRating || ""),
        ownership: normalizeText(anyNode.ownership || ""),
        paywall: parsePaywallLabel(anyNode.paywall || "") || "",
        locality: parseLocalityLabel(anyNode.locality || "") || "",
        publishedAt: normalizeText(anyNode.publishedAt || anyNode.publishDate || anyNode.date || ""),
      };
      byUrl.set(normalized, mergeSourceCandidateRecords(existing, incoming));
    }
    for (const [url, value] of byUrl.entries()) candidateByUrl.set(url, value);
  }
  const candidates = Array.from(candidateByUrl.values());

  let enrichedSources = (
    await mapWithConcurrency(candidates, SOURCE_FETCH_CONCURRENCY, (candidate) =>
      enrichSourceCandidate(slug, candidate, sourceMetadataCache, storyUrl),
    )
  )
    .filter(Boolean)
    .map((source) => applyReferenceToSource(source));
  enrichedSources = aggregateOutletBias(enrichedSources);

  const signals = linkSignals.get(storyUrl) || { trending: false, blindspot: false, local: false };
  const derivedBias = deriveBiasDistribution(enrichedSources);
  const coverageBiasRaw = rendered?.coverage?.percentages || nextFlightStructured?.coverage?.percentages;
  const coverageBias =
    coverageBiasRaw &&
    Number.isFinite(coverageBiasRaw.left) &&
    Number.isFinite(coverageBiasRaw.center) &&
    Number.isFinite(coverageBiasRaw.right) &&
    coverageBiasRaw.left + coverageBiasRaw.center + coverageBiasRaw.right > 0
      ? {
          left: Math.max(0, Math.round(coverageBiasRaw.left)),
          center: Math.max(0, Math.round(coverageBiasRaw.center)),
          right: Math.max(0, Math.round(coverageBiasRaw.right)),
        }
      : null;
  const bias = coverageBias || derivedBias;
  const totalKnown = bias.left + bias.center + bias.right;
  const dominant = totalKnown > 0 ? Math.max(bias.left, bias.right) : 0;
  const coverageTotals = {
    totalSources:
      typeof rendered?.coverage?.totalSources === "number"
        ? Math.max(0, Math.round(rendered.coverage.totalSources))
        : typeof nextFlightStructured?.coverage?.totalSources === "number"
          ? Math.max(0, Math.round(nextFlightStructured.coverage.totalSources))
          : undefined,
    leaningLeft:
      typeof rendered?.coverage?.leaningLeft === "number"
        ? Math.max(0, Math.round(rendered.coverage.leaningLeft))
        : typeof nextFlightStructured?.coverage?.leaningLeft === "number"
          ? Math.max(0, Math.round(nextFlightStructured.coverage.leaningLeft))
          : undefined,
    center:
      typeof rendered?.coverage?.center === "number"
        ? Math.max(0, Math.round(rendered.coverage.center))
        : typeof nextFlightStructured?.coverage?.center === "number"
          ? Math.max(0, Math.round(nextFlightStructured.coverage.center))
          : undefined,
    leaningRight:
      typeof rendered?.coverage?.leaningRight === "number"
        ? Math.max(0, Math.round(rendered.coverage.leaningRight))
        : typeof nextFlightStructured?.coverage?.leaningRight === "number"
          ? Math.max(0, Math.round(nextFlightStructured.coverage.leaningRight))
        : undefined,
  };

  const summary = summarizeText(rendered.summary, "Story aggregated from multiple perspectives.");
  const publishedAt =
    parsePublishedAt(rendered.publishedAt) ||
    enrichedSources.map((source) => source.publishedAt).find(Boolean) ||
    updatedAt;

  const location = chooseStoryLocation({
    title,
    summary,
    tags,
    location: rendered.location,
  });

  let storyImageCandidate = sanitizeImageUrl(rendered.imageUrl, storyUrl);
  if (storyImageCandidate.startsWith("/images/")) {
    for (const source of enrichedSources.slice(0, 4)) {
      const sourceMeta = await fetchSourceMetadata(source.url, sourceMetadataCache);
      const sourceImage = sanitizeImageUrl(sourceMeta.imageUrl || "", source.url);
      if (sourceImage && !sourceImage.startsWith("/images/")) {
        storyImageCandidate = sourceImage;
        break;
      }
    }
  }
  const imageUrl = await cacheStoryImage(storyImageCandidate, slug);

  const localContext = `${title} ${summary} ${tags.join(" ")}`.toLowerCase();
  const localHeuristic = /\b(local|city|county|state|province|district|municipal)\b/.test(localContext);
  const blindspotGap = Math.abs((bias.left || 0) - (bias.right || 0));
  const blindspotBySkew = dominant >= 70 && blindspotGap >= 35 && (bias.center || 0) <= 70;
  const topic = chooseTopic(rendered.topic, tags, storyTextForRelevance);

  return {
    id: stableId(storyUrl, "story"),
    slug,
    canonicalUrl: storyUrl,
    title,
    dek: summarizeText(rendered.dek || "", ""),
    author: normalizeText(rendered.author || ""),
    summary,
    topic: summarizeText(topic, "Top Stories"),
    location,
    tags: tags.length > 0 ? tags : ["News"],
    imageUrl,
    publishedAt,
    updatedAt,
    sourceCount: Math.max(enrichedSources.length, coverageTotals.totalSources ?? 0),
    bias,
    blindspot: signals.blindspot || blindspotBySkew,
    local: signals.local || localHeuristic,
    trending: signals.trending,
    sources: enrichedSources,
    coverage: coverageTotals,
    readerLinks: Array.isArray(rendered.readerLinks) ? rendered.readerLinks.slice(0, 12) : [],
    timelineHeaders: Array.isArray(rendered.timelineHeaders) ? rendered.timelineHeaders.slice(0, 12) : [],
    podcastReferences: Array.isArray(rendered.podcastReferences) ? rendered.podcastReferences.slice(0, 12) : [],
  };
}

function titleFingerprint(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .join(" ");
}

function titleSimilarity(a, b) {
  const tokensA = new Set(titleFingerprint(a).split(/\s+/).filter(Boolean));
  const tokensB = new Set(titleFingerprint(b).split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }
  const union = tokensA.size + tokensB.size - overlap;
  return union > 0 ? overlap / union : 0;
}

function mergeStoryRecords(preferred, candidate) {
  const byUrl = new Map();
  for (const source of [...(preferred.sources || []), ...(candidate.sources || [])]) {
    const url = normalizeText(source?.url || "");
    if (!url) continue;
    byUrl.set(url, source);
  }
  const mergedSources = Array.from(byUrl.values());
  const preferredCoverage = preferred.coverage || {};
  const candidateCoverage = candidate.coverage || {};
  return {
    ...preferred,
    sourceCount: Math.max(preferred.sourceCount || 0, candidate.sourceCount || 0, mergedSources.length),
    sources: mergedSources,
    coverage: {
      totalSources: Math.max(preferredCoverage.totalSources || 0, candidateCoverage.totalSources || 0) || undefined,
      leaningLeft:
        typeof preferredCoverage.leaningLeft === "number"
          ? preferredCoverage.leaningLeft
          : candidateCoverage.leaningLeft,
      center: typeof preferredCoverage.center === "number" ? preferredCoverage.center : candidateCoverage.center,
      leaningRight:
        typeof preferredCoverage.leaningRight === "number"
          ? preferredCoverage.leaningRight
          : candidateCoverage.leaningRight,
    },
  };
}

function dedupeStories(stories) {
  const bySlug = new Map();
  const byCanonical = new Map();
  const byTitle = new Map();
  const deduped = [];

  for (const story of stories) {
    const canonical = normalizeText(story.canonicalUrl || "").toLowerCase();
    const titleKey = normalizeText(story.title).toLowerCase();
    let existing = (canonical && byCanonical.get(canonical)) || byTitle.get(titleKey);
    if (!existing) {
      existing = deduped.find((item) => {
        const similarity = titleSimilarity(item.title, story.title);
        const publishedGapHours = Math.abs(+new Date(item.publishedAt || 0) - +new Date(story.publishedAt || 0)) / 36e5;
        return similarity >= 0.82 && publishedGapHours <= 72;
      });
    }

    if (existing) {
      const newer = +new Date(story.updatedAt) >= +new Date(existing.updatedAt) ? story : existing;
      const older = newer === story ? existing : story;
      const merged = mergeStoryRecords(newer, older);
      bySlug.delete(older.slug);
      bySlug.set(merged.slug, merged);
      if (canonical) byCanonical.set(canonical, merged);
      byTitle.set(titleKey, merged);
      const idx = deduped.findIndex((item) => item.slug === older.slug || item.slug === merged.slug);
      if (idx >= 0) deduped[idx] = merged;
      continue;
    }

    bySlug.set(story.slug, story);
    if (canonical) byCanonical.set(canonical, story);
    byTitle.set(titleKey, story);
    deduped.push(story);
  }

  return Array.from(bySlug.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

function normalizeStoryRecordForStore(story) {
  if (!story || typeof story !== "object") return story;
  const canonicalUrl = normalizeText(story.canonicalUrl || story.url || "");
  const baseUrl = canonicalUrl || "https://ground.news";

  const summary = normalizeText(story.summary || "");
  const dek = normalizeText(story.dek || "");
  const cleanedDek = dek && summary && dek === summary ? "" : dek;

  const topic = normalizeText(story.topic || "") || "Top Stories";
  const tagsRaw = Array.isArray(story.tags) ? story.tags : [];
  const tags = sanitizeTags(tagsRaw).filter((t) => t.toLowerCase() !== topic.toLowerCase());

  const sourcesRaw = Array.isArray(story.sources) ? story.sources : [];
  const sources = sourcesRaw
    .filter((src) => src && typeof src === "object")
    .map((src) => ({
      ...src,
      outlet: normalizeText(src.outlet || ""),
      url: normalizeText(src.url || ""),
      excerpt: normalizeText(src.excerpt || ""),
      logoUrl: normalizeAssetUrl(src.logoUrl, baseUrl),
      ownership: normalizeText(src.ownership || ""),
      paywall: normalizeText(src.paywall || "") || undefined,
      locality: normalizeText(src.locality || "") || undefined,
      publishedAt: normalizeText(src.publishedAt || "") || undefined,
      websiteUrl: normalizeText(src.websiteUrl || "") || undefined,
      country: normalizeText(src.country || "") || undefined,
      foundedYear:
        typeof src.foundedYear === "number" && Number.isFinite(src.foundedYear)
          ? Math.round(src.foundedYear)
          : undefined,
      description: sanitizeSummaryText(src.description || ""),
    }))
    .filter((src) => src.outlet && src.url);

  const coverage = story.coverage || {};
  const cleanCoverage = {
    totalSources: typeof coverage.totalSources === "number" && Number.isFinite(coverage.totalSources) ? Math.max(0, Math.round(coverage.totalSources)) : undefined,
    leaningLeft: typeof coverage.leaningLeft === "number" && Number.isFinite(coverage.leaningLeft) ? Math.max(0, Math.round(coverage.leaningLeft)) : undefined,
    center: typeof coverage.center === "number" && Number.isFinite(coverage.center) ? Math.max(0, Math.round(coverage.center)) : undefined,
    leaningRight: typeof coverage.leaningRight === "number" && Number.isFinite(coverage.leaningRight) ? Math.max(0, Math.round(coverage.leaningRight)) : undefined,
  };

  return {
    ...story,
    canonicalUrl: canonicalUrl || story.canonicalUrl,
    summary: summary || story.summary,
    dek: cleanedDek || undefined,
    topic,
    tags: tags.length > 0 ? tags : ["News"],
    imageUrl: sanitizeImageUrl(story.imageUrl, baseUrl),
    sources,
    coverage: cleanCoverage,
  };
}

export async function runGroundNewsIngestion(opts = {}) {
  requireApiKey();
  const startedAt = new Date().toISOString();
  const options = {
    ...parseArgs([]),
    ...opts,
  };
  const limit = Number.isFinite(options.storyLimit) && options.storyLimit > 0 ? options.storyLimit : Infinity;
  const refreshExisting = Number.isFinite(options.refreshExisting) && options.refreshExisting > 0 ? options.refreshExisting : 0;
  const effectiveLimit = Number.isFinite(limit) ? limit + refreshExisting : Infinity;
  const auditState = {
    enabled: Boolean(options.articleAudit),
    dir: resolveAuditDir(options.articleAuditDir),
    index: {
      generatedAt: new Date().toISOString(),
      mode: "frontpage-individual-article-audit",
      homepage: null,
      articles: [],
    },
  };

  if (auditState.enabled) {
    await fs.rm(auditState.dir, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(path.join(auditState.dir, "articles"), { recursive: true });
  }

  const scrape = await runGroundNewsScrape({
    routes: options.routes,
    out: options.out,
    scrollPasses: 4,
    maxLinksPerRoute: 400,
    silent: options.silent,
  });

  const linkSignals = computeLinkSignals(scrape);
  const scrapeLinks = Array.from(new Set(scrape.allStoryLinks.map(normalizeExternalUrl).filter(Boolean)));
  let links = scrapeLinks.slice(0, effectiveLimit);
  let homepageSnapshot = null;

  const stories = [];
  const sourceMetadataCache = new Map();

  try {
    {
      let discoveryBrowser = null;
      let discoverySessionId = null;
      try {
        const session = await createBrowserSession({}, { rotationKey: "groundnews:frontpage-discovery" });
        discoverySessionId = session.id;
        if (!session.cdpUrl) throw new Error("Browser Use did not return cdpUrl for front-page discovery.");
        discoveryBrowser = await chromium.connectOverCDP(session.cdpUrl, { timeout: 60000 });
        const context =
          discoveryBrowser.contexts()[0] ?? (await discoveryBrowser.newContext({ viewport: { width: 1440, height: 900 } }));
        const page = await context.newPage();
        homepageSnapshot = await collectHomepageSnapshot(page, options, auditState);
      } finally {
        if (discoveryBrowser) await discoveryBrowser.close().catch(() => {});
        await stopBrowserSession(discoverySessionId);
      }
    }

    const homepageLinks = Array.from(new Set((homepageSnapshot?.discoveredLinks || []).map(normalizeExternalUrl).filter(Boolean)));
    const chosenDiscoveryLinks = homepageLinks.length > 0 ? homepageLinks : scrapeLinks;
    links = chosenDiscoveryLinks.slice(0, effectiveLimit);
    for (const homeLink of homepageSnapshot?.discoveredLinks || []) {
      const existing = linkSignals.get(homeLink) || { trending: false, blindspot: false, local: false };
      linkSignals.set(homeLink, { ...existing, trending: true });
    }

    if (!options.silent) {
      console.log(`front-page discovered links: ${(homepageSnapshot?.discoveredLinks || []).length}`);
      if (!homepageLinks.length) {
        console.log("front-page discovery returned 0 links; falling back to route scrape links");
      }
      console.log(`article links selected for enrichment: ${links.length}`);
    }

    // Data-quality gate: if we repeatedly fail to discover any links, record a failed run and stop.
    if (links.length === 0) {
      await persistIngestionRun({
        startedAt,
        finishedAt: new Date().toISOString(),
        status: "error",
        mode: "groundnews-frontpage-individual-article-pipeline",
        routeCount: Array.isArray(options.routes) ? options.routes.length : 1,
        uniqueStoryLinks: 0,
        ingestedStories: 0,
        errors: {
          reason: "No story links discovered",
          scrapeUniqueStoryLinkCount: scrape.uniqueStoryLinkCount,
          scrapeRouteCount: scrape.routeCount,
        },
      }).catch(() => {});
      throw new Error("Ingestion failed: no story links discovered.");
    }

    if (refreshExisting > 0) {
      const store = await readStoreSafe();
      const suspicious = new Set(["Israel-Gaza", "Top Stories"]);
      const refreshCandidates = store.stories
        .filter((story) => normalizeText(story.canonicalUrl || "").includes("ground.news/article/"))
        .filter((story) => suspicious.has(normalizeText(story.topic)) || (story.tags || []).some((t) => /valentine|olympics|pam bondi/i.test(String(t))))
        .sort((a, b) => +new Date(a.updatedAt || 0) - +new Date(b.updatedAt || 0))
        .map((story) => normalizeExternalUrl(story.canonicalUrl))
        .filter(Boolean)
        .slice(0, refreshExisting);

      if (refreshCandidates.length > 0) {
        const mergedLinks = Array.from(new Set([...links, ...refreshCandidates]));
        links = mergedLinks.slice(0, effectiveLimit);
        if (!options.silent) {
          console.log(`refreshing ${refreshCandidates.length} existing story page(s) with suspicious topic/tags`);
        }
      }
    }

    let articleIndex = 0;
    let batchNumber = 0;
    const recoverableRetries = new Map();
    while (articleIndex < links.length) {
      batchNumber += 1;
      const batchStartedAt = Date.now();
      let batchBrowser = null;
      let batchSessionId = null;
      let processedInBatch = 0;
      let restartBatch = false;

      try {
        const session = await createBrowserSession({}, { rotationKey: `groundnews:frontpage-enrich:batch:${batchNumber}` });
        batchSessionId = session.id;
        if (!session.cdpUrl) throw new Error("Browser Use did not return cdpUrl for article enrichment.");
        batchBrowser = await chromium.connectOverCDP(session.cdpUrl, { timeout: 60000 });
        const context = batchBrowser.contexts()[0] ?? (await batchBrowser.newContext({ viewport: { width: 1440, height: 900 } }));
        const page = await context.newPage();

        while (articleIndex < links.length) {
          if (processedInBatch >= options.sessionStoryBatchSize) break;
          if (Date.now() - batchStartedAt >= options.sessionMaxMs) break;

          const link = links[articleIndex];
          if (!options.silent) {
            console.log(`[batch ${batchNumber}] article ${articleIndex + 1}/${links.length}: ${link}`);
          }
          try {
            const story = await enrichStory(page, link, linkSignals, sourceMetadataCache, auditState, articleIndex);
            stories.push(story);
            articleIndex += 1;
            processedInBatch += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message : "unknown";
            const recoverable = /(target page, context or browser has been closed|websocket|session closed|connection closed|page has been closed|browser has been closed)/i.test(
              message,
            );
            if (recoverable) {
              const attempts = (recoverableRetries.get(link) || 0) + 1;
              recoverableRetries.set(link, attempts);
              if (attempts >= 3) {
                if (!options.silent) {
                  console.error(`failed to enrich ${link}: ${message} (giving up after ${attempts} attempts)`);
                }
                articleIndex += 1;
                processedInBatch += 1;
              } else {
                if (!options.silent) {
                  console.warn(`transient browser failure on ${link}; restarting session and retrying (attempt ${attempts}/3)`);
                }
                restartBatch = true;
                break;
              }
              continue;
            }
            if (!options.silent) {
              console.error(`failed to enrich ${link}: ${message}`);
            }
            articleIndex += 1;
            processedInBatch += 1;
          }
        }
      } finally {
        if (batchBrowser) await batchBrowser.close().catch(() => {});
        await stopBrowserSession(batchSessionId);
      }

      if (!options.silent) {
        const elapsedSec = Math.round((Date.now() - batchStartedAt) / 1000);
        console.log(`[batch ${batchNumber}] processed ${processedInBatch} articles in ${elapsedSec}s`);
        if (restartBatch) {
          console.log(`[batch ${batchNumber}] restarting early after transient browser/session closure`);
        }
      }
    }
  } finally {
    if (auditState.enabled) {
      const auditIndexPath = path.join(auditState.dir, "index.json");
      await writeJsonFile(auditIndexPath, {
        ...auditState.index,
        articleCount: auditState.index.articles.length,
      });
    }
  }

  const merged = await withStoreLock(async () => {
    const store = await readStoreSafe();
    store.stories = dedupeStories([...store.stories, ...stories]).map(normalizeStoryRecordForStore);
    store.ingestion = {
      ...store.ingestion,
      lastRunAt: new Date().toISOString(),
      lastMode: "groundnews-frontpage-individual-article-pipeline",
	      storyCount: store.stories.length,
	      routeCount: Array.isArray(options.routes) ? options.routes.length : 1,
	      notes: `Synced ${stories.length} stories from ${links.length} article link(s) (refreshExisting=${refreshExisting})`,
	    };
    await writeStoreAtomic(store);
    return store;
  });

  // Persist to DB for the actual app runtime.
  if (process.env.DATABASE_URL) {
    await persistStoriesToDb(merged.stories, { disconnect: false });
  }
  await persistIngestionRun({
    startedAt,
    finishedAt: new Date().toISOString(),
    status: "ok",
    mode: "groundnews-frontpage-individual-article-pipeline",
    routeCount: Array.isArray(options.routes) ? options.routes.length : 1,
    uniqueStoryLinks: links.length,
    ingestedStories: stories.length,
    errors: {
      homepageDiscoveredLinks: homepageSnapshot?.discoveredLinks?.length || 0,
      auditEnabled: Boolean(auditState.enabled),
    },
  }).catch(() => {});

  return {
    ok: true,
    ingestedStories: stories.length,
    scrapedLinks: links.length,
    totalStories: merged.stories.length,
    routeCount: Array.isArray(options.routes) ? options.routes.length : 1,
    homepageDiscoveredLinks: homepageSnapshot?.discoveredLinks?.length || 0,
    output: options.out,
    articleAuditDir: auditState.enabled ? auditState.dir : null,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runGroundNewsIngestion(parseArgs(process.argv.slice(2)))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((err) => {
      console.error(err.stack || err.message);
      process.exit(1);
    });
}
