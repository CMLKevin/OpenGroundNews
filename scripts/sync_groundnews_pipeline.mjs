#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { runGroundNewsScrape } from "./groundnews_scrape_cdp.mjs";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const DEFAULT_OUT = "output/browser_use/groundnews_cdp/ingest_scrape.json";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80";

function parseArgs(argv) {
  const opts = {
    routes: ["/", "/blindspot", "/my", "/local"],
    storyLimit: 40,
    out: DEFAULT_OUT,
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
      opts.storyLimit = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--out" && argv[i + 1]) {
      opts.out = argv[i + 1];
      i += 1;
    } else if (a === "--verbose") {
      opts.silent = false;
    }
  }
  return opts;
}

async function readStore() {
  const raw = await fs.readFile(STORE_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeStore(store) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2) + "\n", "utf8");
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toSlugFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "story";
    return last
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 110);
  } catch {
    return `story-${hashString(url).toString(16)}`;
  }
}

function pctFromSeed(seed, min, max) {
  return min + (seed % (max - min + 1));
}

function deriveBias(domain) {
  const seed = hashString(domain);
  const bucket = seed % 3;
  return bucket === 0 ? "left" : bucket === 1 ? "center" : "right";
}

function deriveFactuality(domain) {
  const seed = hashString(domain);
  const bucket = seed % 5;
  if (bucket === 0) return "very-high";
  if (bucket === 1) return "high";
  if (bucket === 2) return "mixed";
  if (bucket === 3) return "low";
  return "very-low";
}

function deriveOwnership(domain) {
  const seed = hashString(domain);
  const labels = ["Public", "Private", "Corporate Group", "Foundation"];
  return labels[seed % labels.length];
}

function derivePaywall(domain) {
  const seed = hashString(domain) % 3;
  if (seed === 0) return "none";
  if (seed === 1) return "soft";
  return "hard";
}

function deriveLocality(domain) {
  const seed = hashString(domain) % 3;
  if (seed === 0) return "local";
  if (seed === 1) return "national";
  return "international";
}

function summarizeText(input, fallback = "Coverage developing.") {
  const clean = (input || "").trim().replace(/\s+/g, " ");
  if (!clean) return fallback;
  if (clean.length < 220) return clean;
  return `${clean.slice(0, 217)}...`;
}

function uniqueUrls(urls) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function sanitizeImageUrl(raw, baseUrl) {
  const value = (raw || "").trim();
  if (!value) return FALLBACK_IMAGE;

  if (value.startsWith("/_next/image")) {
    try {
      const parsed = new URL(value, baseUrl);
      const nested = parsed.searchParams.get("url");
      if (nested) return sanitizeImageUrl(decodeURIComponent(nested), baseUrl);
      return FALLBACK_IMAGE;
    } catch {
      return FALLBACK_IMAGE;
    }
  }

  try {
    const parsed = new URL(value, baseUrl);
    if (!/^https?:$/i.test(parsed.protocol)) return FALLBACK_IMAGE;
    if (/groundnews\.b-cdn\.net$/i.test(parsed.hostname) && /\/assets\/flags\//i.test(parsed.pathname)) {
      return FALLBACK_IMAGE;
    }
    return parsed.toString();
  } catch {
    return FALLBACK_IMAGE;
  }
}

async function enrichStory(storyUrl) {
  const res = await fetch(storyUrl, {
    cache: "no-store",
    headers: {
      "user-agent": "OpenGroundNewsCrawler/1.0",
    },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const title =
    $("meta[property='og:title']").attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled story";

  const summary = summarizeText(
    $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "",
    "Story aggregated from multiple sources.",
  );

  const rawImageUrl =
    $("meta[property='og:image']").attr("content") ||
    $("img").first().attr("src") ||
    FALLBACK_IMAGE;
  const imageUrl = sanitizeImageUrl(rawImageUrl, storyUrl);

  const topic =
    $("meta[property='article:section']").attr("content") ||
    $("meta[name='keywords']").attr("content")?.split(",")[0]?.trim() ||
    "Top Stories";

  const tags = uniqueUrls(
    $("a[href*='/interest/']")
      .toArray()
      .map((el) => $(el).text().trim())
      .filter((v) => v.length > 0),
  ).slice(0, 5);

  const externalLinks = uniqueUrls(
    $("a[href^='http']")
      .toArray()
      .map((el) => $(el).attr("href"))
      .filter((href) => href && !href.includes("ground.news")),
  ).slice(0, 8);

  const seed = hashString(storyUrl);
  const sourceCandidates = externalLinks.length > 0 ? externalLinks : [storyUrl];
  const sources = sourceCandidates.map((url, idx) => {
    let outlet = "Unknown Outlet";
    try {
      outlet = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      outlet = `source-${idx + 1}`;
    }

    return {
      id: `${toSlugFromUrl(storyUrl)}-src-${idx + 1}`,
      outlet,
      url,
      excerpt: `Coverage excerpt from ${outlet}.`,
      bias: deriveBias(outlet),
      factuality: deriveFactuality(outlet),
      ownership: deriveOwnership(outlet),
      publishedAt: new Date(Date.now() - pctFromSeed(seed + idx * 17, 1, 36) * 3600 * 1000).toISOString(),
      paywall: derivePaywall(outlet),
      locality: deriveLocality(outlet),
    };
  });

  const left = sources.filter((s) => s.bias === "left").length;
  const center = sources.filter((s) => s.bias === "center").length;
  const right = sources.filter((s) => s.bias === "right").length;
  const total = Math.max(1, sources.length);

  const publishedAt = new Date(Date.now() - pctFromSeed(seed, 2, 72) * 3600 * 1000).toISOString();
  const updatedAt = new Date().toISOString();

  return {
    id: `story-${hashString(storyUrl).toString(16)}`,
    slug: toSlugFromUrl(storyUrl),
    title,
    summary,
    topic,
    location: seed % 2 === 0 ? "International" : "United States",
    tags: tags.length > 0 ? tags : ["News", "Coverage"],
    imageUrl,
    publishedAt,
    updatedAt,
    sourceCount: sources.length,
    bias: {
      left: Math.round((left / total) * 100),
      center: Math.round((center / total) * 100),
      right: Math.round((right / total) * 100),
    },
    blindspot: Math.max(left, right) / total >= 0.6,
    local: /local|city|state|county/i.test(`${title} ${summary}`),
    trending: seed % 3 !== 0,
    sources,
  };
}

export async function runGroundNewsIngestion(opts = {}) {
  const options = {
    ...parseArgs([]),
    ...opts,
  };

  const scrape = await runGroundNewsScrape({
    routes: options.routes,
    out: options.out,
    scrollPasses: 4,
    maxLinksPerRoute: 400,
    silent: options.silent,
  });

  const links = scrape.allStoryLinks.slice(0, options.storyLimit);
  const stories = [];

  for (const link of links) {
    try {
      const story = await enrichStory(link);
      stories.push(story);
    } catch (error) {
      if (!options.silent) {
        console.error(`failed to enrich ${link}: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }
  }

  const store = await readStore();
  const bySlug = new Map(store.stories.map((s) => [s.slug, s]));
  stories.forEach((s) => bySlug.set(s.slug, s));
  store.stories = Array.from(bySlug.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  store.ingestion = {
    lastRunAt: new Date().toISOString(),
    lastMode: "groundnews-cdp-pipeline",
    storyCount: store.stories.length,
    routeCount: scrape.routeCount,
    notes: `Synced ${stories.length} stories from ${links.length} scraped links`,
  };

  await writeStore(store);

  return {
    ok: true,
    ingestedStories: stories.length,
    scrapedLinks: links.length,
    totalStories: store.stories.length,
    routeCount: scrape.routeCount,
    output: options.out,
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
