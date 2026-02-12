#!/usr/bin/env node
/* eslint-disable no-console */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { chromium } from "playwright-core";
import { runGroundNewsScrape } from "./groundnews_scrape_cdp.mjs";
import { createBrowserSession, stopBrowserSession, requireApiKey } from "./lib/browser_use_cdp.mjs";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const STORE_LOCK_PATH = path.join(process.cwd(), "data", "store.lock");
const DEFAULT_OUT = "output/browser_use/groundnews_cdp/ingest_scrape.json";
const FALLBACK_IMAGE = "/images/story-fallback.svg";
const LOCK_TIMEOUT_MS = 15000;
const LOCK_STALE_MS = 120000;
const LOCK_WAIT_STEP_MS = 80;
const SOURCE_FETCH_TIMEOUT_MS = 12000;
const SOURCE_FETCH_CONCURRENCY = 4;

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
  const clean = normalizeText(input);
  if (!clean) return fallback;
  if (clean.length <= 260) return clean;
  return `${clean.slice(0, 257)}...`;
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

function isGroundNewsUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "ground.news" || hostname.endsWith(".ground.news");
  } catch {
    return false;
  }
}

function sanitizeImageUrl(raw, baseUrl) {
  const value = normalizeText(raw);
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
    if (/^web-api-cdn\.ground\.news$/i.test(parsed.hostname)) return FALLBACK_IMAGE;
    if (/groundnews\.b-cdn\.net$/i.test(parsed.hostname) && /\/assets\/flags\//i.test(parsed.pathname)) {
      return FALLBACK_IMAGE;
    }
    return parsed.toString();
  } catch {
    return FALLBACK_IMAGE;
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
  const dedup = new Set();
  for (const tag of tags || []) {
    const clean = sanitizeTag(tag);
    if (!clean) continue;
    dedup.add(clean);
    if (dedup.size >= 8) break;
  }
  return Array.from(dedup);
}

function parseBiasLabel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return "unknown";
  if (text.includes("center")) return "center";
  if (text.includes("left")) return "left";
  if (text.includes("right")) return "right";
  return "unknown";
}

function parseFactualityLabel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return "unknown";
  if (text.includes("very high")) return "very-high";
  if (/(^|\s)high(\s|$)/.test(text)) return "high";
  if (text.includes("mixed")) return "mixed";
  if (text.includes("very low")) return "very-low";
  if (/(^|\s)low(\s|$)/.test(text)) return "low";
  return "unknown";
}

function parsePaywallLabel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return undefined;
  if (text.includes("no paywall")) return "none";
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

    const headline = normalize(document.querySelector("main article h1, article h1, h1")?.textContent || "");
    const hasCoverageDetails = bodyText.includes("coverage details");
    const hasBiasDistribution = bodyText.includes("bias distribution");
    const hasReadFullArticle = bodyText.includes("read full article");
    const hasArticleMarkers =
      headline.length >= 16 && (hasCoverageDetails || hasBiasDistribution || hasReadFullArticle);

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
      hasTopProceedControl,
      looksLikePromoInterstitial,
      samePath,
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
    if (state.samePath) {
      await page.waitForTimeout(1200);
      continue;
    }
    break;
  }

  const finalState = await inspectStoryPageState(page, storyUrl);
  if (!finalState.hasArticleMarkers) {
    throw new Error(`Unable to reach story content (no article markers): ${finalState.href}`);
  }
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
        return { excerpt: "", publishedAt: null, title: "" };
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/html")) {
        return { excerpt: "", publishedAt: null, title: "" };
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const excerpt =
        $("meta[property='og:description']").attr("content") ||
        $("meta[name='description']").attr("content") ||
        $("article p").first().text() ||
        $("main p").first().text() ||
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

      return {
        excerpt: summarizeText(excerpt, ""),
        publishedAt: parsePublishedAt(publishedAt),
        title: normalizeText(title),
      };
    } catch {
      return { excerpt: "", publishedAt: null, title: "" };
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

async function extractStoryFromDom(page, storyUrl) {
  await page.goto(storyUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await ensureStoryPageLoaded(page, storyUrl);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, Math.min(window.innerHeight * 1.3, document.body.scrollHeight)));
  await page.waitForTimeout(350);
  await page.evaluate(() => window.scrollTo(0, 0));

  return page.evaluate(() => {
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

    const tags = Array.from(document.querySelectorAll("a[href*='/interest/'], a[href*='/topic/']"))
      .map((node) => normalize(node.textContent || ""))
      .filter(Boolean);

    const sourceByUrl = new Map();
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    for (const anchor of anchors) {
      let url;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        continue;
      }
      if (!/^https?:$/i.test(url.protocol)) continue;
      if (url.hostname.endsWith("ground.news")) continue;
      if (/x\.com|twitter\.com|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|tiktok\.com/i.test(url.hostname)) {
        continue;
      }

      const normalizedUrl = url.toString();
      if (sourceByUrl.has(normalizedUrl)) continue;

      const container = anchor.closest("article, li, section, div");
      const block = normalize(container?.textContent || anchor.textContent || "");
      if (block.length < 24) continue;
      const hasOutletLink = Boolean(container?.querySelector("a[href*='/interest/']"));
      const looksLikeStoryCard =
        hasOutletLink || /read full article|reposted by|published|updated|lean left|lean right|center|right|left/i.test(block);
      if (!looksLikeStoryCard) continue;

      const outletFromInterest = normalize(container?.querySelector("a[href*='/interest/']")?.textContent || "");
      const outlet = outletFromInterest || normalize(anchor.textContent || "") || url.hostname.replace(/^www\./, "");
      const sentence = block.split(/(?<=[.!?])\s+/).find((part) => part.length > 70) || block.slice(0, 280);
      const biasLabel = normalize(container?.querySelector("a[href*='#bias-ratings']")?.textContent || "");
      const publishedAt =
        normalize(container?.querySelector("time")?.getAttribute("datetime") || "") ||
        normalize(container?.querySelector("time")?.textContent || "");

      sourceByUrl.set(normalizedUrl, {
        url: normalizedUrl,
        outlet,
        excerpt: normalize(sentence),
        bias: extractBiasFromText(`${biasLabel} ${block}`),
        factuality: extractFactuality(block),
        paywall: extractPaywall(block),
        locality: extractLocality(block),
        ownership: "",
        publishedAt,
      });
    }

    const nextDataText = document.getElementById("__NEXT_DATA__")?.textContent || "";
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
          const outlet =
            normalize(anyNode.outlet || anyNode.publisher || anyNode.publisherName || anyNode.sourceName || "") ||
            sourceUrl.hostname.replace(/^www\./, "");
          const excerpt = normalize(anyNode.excerpt || anyNode.summary || anyNode.description || "");
          const bias = extractBiasFromText(normalize(anyNode.bias || anyNode.biasRating || ""));
          const factuality = extractFactuality(normalize(anyNode.factuality || anyNode.factualityRating || ""));
          const ownership = normalize(anyNode.ownership || "");
          const paywall = extractPaywall(normalize(anyNode.paywall || ""));
          const locality = extractLocality(normalize(anyNode.locality || ""));
          const publishedAt = normalize(anyNode.publishedAt || anyNode.publishDate || anyNode.date || "");

          sourceByUrl.set(normalizedUrl, {
            url: normalizedUrl,
            outlet: existing?.outlet || outlet,
            excerpt: existing?.excerpt || excerpt,
            bias: existing?.bias !== "unknown" ? existing?.bias : bias,
            factuality: existing?.factuality !== "unknown" ? existing?.factuality : factuality,
            paywall: existing?.paywall || paywall,
            locality: existing?.locality || locality,
            ownership: existing?.ownership || ownership,
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

    const summary =
      meta("meta[property='og:description']") ||
      meta("meta[name='description']") ||
      normalize(document.querySelector("main p")?.textContent || "");

    const topic =
      meta("meta[property='article:section']") ||
      normalize(document.querySelector("a[href*='/interest/']")?.textContent || "") ||
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

    return {
      title,
      summary,
      topic,
      tags,
      location,
      imageUrl,
      publishedAt,
      sources: Array.from(sourceByUrl.values()).slice(0, 24),
    };
  });
}

async function enrichSourceCandidate(storySlug, candidate, sourceMetadataCache) {
  const normalizedUrl = normalizeExternalUrl(candidate.url);
  if (!normalizedUrl || isGroundNewsUrl(normalizedUrl)) return null;

  const [sourceMeta] = await Promise.all([fetchSourceMetadata(normalizedUrl, sourceMetadataCache)]);
  const outlet = normalizeText(candidate.outlet) || hostFromUrl(normalizedUrl);
  const excerptCandidate = sourceMeta.excerpt || candidate.excerpt || "";
  const excerpt = summarizeText(excerptCandidate, "Excerpt unavailable from publisher metadata.");

  return {
    id: stableId(`${storySlug}:${normalizedUrl}`, `${storySlug}-src`),
    outlet,
    url: normalizedUrl,
    excerpt,
    bias: parseBiasLabel(candidate.bias),
    factuality: parseFactualityLabel(candidate.factuality),
    ownership: normalizeText(candidate.ownership) || "Unlabeled",
    publishedAt: parsePublishedAt(candidate.publishedAt) || sourceMeta.publishedAt || undefined,
    paywall: parsePaywallLabel(candidate.paywall),
    locality: parseLocalityLabel(candidate.locality),
  };
}

async function enrichStory(page, storyUrl, linkSignals, sourceMetadataCache) {
  const rendered = await extractStoryFromDom(page, storyUrl);
  const updatedAt = new Date().toISOString();
  const tags = sanitizeTags(rendered.tags);
  const title = summarizeText(rendered.title, "Untitled story");
  const slug = toSlugFromUrl(storyUrl, title);
  const candidates = Array.from(
    new Map(
      (rendered.sources || [])
        .map((source) => ({ ...source, url: normalizeExternalUrl(source.url) }))
        .filter((source) => source.url)
        .map((source) => [source.url, source]),
    ).values(),
  );

  const enrichedSources = (
    await mapWithConcurrency(candidates, SOURCE_FETCH_CONCURRENCY, (candidate) =>
      enrichSourceCandidate(slug, candidate, sourceMetadataCache),
    )
  ).filter(Boolean);

  const signals = linkSignals.get(storyUrl) || { trending: false, blindspot: false, local: false };
  const bias = deriveBiasDistribution(enrichedSources);
  const totalKnown = bias.left + bias.center + bias.right;
  const dominant = totalKnown > 0 ? Math.max(bias.left, bias.right) : 0;

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

  const localContext = `${title} ${summary} ${tags.join(" ")}`.toLowerCase();
  const localHeuristic = /\b(local|city|county|state|province|district|municipal)\b/.test(localContext);

  return {
    id: stableId(storyUrl, "story"),
    slug,
    canonicalUrl: storyUrl,
    title,
    summary,
    topic: summarizeText(rendered.topic, "Top Stories"),
    location,
    tags: tags.length > 0 ? tags : ["News"],
    imageUrl: sanitizeImageUrl(rendered.imageUrl, storyUrl),
    publishedAt,
    updatedAt,
    sourceCount: enrichedSources.length,
    bias,
    blindspot: signals.blindspot || dominant >= 60,
    local: signals.local || localHeuristic,
    trending: signals.trending,
    sources: enrichedSources,
  };
}

function dedupeStories(stories) {
  const bySlug = new Map();
  const byCanonical = new Map();
  const byTitle = new Map();

  for (const story of stories) {
    const canonical = normalizeText(story.canonicalUrl || "").toLowerCase();
    const titleKey = normalizeText(story.title).toLowerCase();
    const existing = (canonical && byCanonical.get(canonical)) || byTitle.get(titleKey);

    if (existing) {
      const newer = +new Date(story.updatedAt) >= +new Date(existing.updatedAt) ? story : existing;
      const older = newer === story ? existing : story;
      bySlug.delete(older.slug);
      bySlug.set(newer.slug, newer);
      if (canonical) byCanonical.set(canonical, newer);
      byTitle.set(titleKey, newer);
      continue;
    }

    bySlug.set(story.slug, story);
    if (canonical) byCanonical.set(canonical, story);
    byTitle.set(titleKey, story);
  }

  return Array.from(bySlug.values()).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

export async function runGroundNewsIngestion(opts = {}) {
  requireApiKey();
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

  const linkSignals = computeLinkSignals(scrape);
  const links = Array.from(new Set(scrape.allStoryLinks.map(normalizeExternalUrl).filter(Boolean))).slice(
    0,
    options.storyLimit,
  );

  const stories = [];
  const sourceMetadataCache = new Map();
  let browser = null;
  let sessionId = null;

  try {
    const session = await createBrowserSession({}, { rotationKey: `groundnews:enrich:${links.length}` });
    sessionId = session.id;
    if (!session.cdpUrl) throw new Error("Browser Use did not return cdpUrl for enrichment.");
    browser = await chromium.connectOverCDP(session.cdpUrl, { timeout: 60000 });
    const context = browser.contexts()[0] ?? (await browser.newContext({ viewport: { width: 1440, height: 900 } }));
    const page = await context.newPage();

    for (const link of links) {
      try {
        const story = await enrichStory(page, link, linkSignals, sourceMetadataCache);
        stories.push(story);
      } catch (error) {
        if (!options.silent) {
          console.error(`failed to enrich ${link}: ${error instanceof Error ? error.message : "unknown"}`);
        }
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopBrowserSession(sessionId);
  }

  const merged = await withStoreLock(async () => {
    const store = await readStoreSafe();
    store.stories = dedupeStories([...store.stories, ...stories]);
    store.ingestion = {
      ...store.ingestion,
      lastRunAt: new Date().toISOString(),
      lastMode: "groundnews-cdp-rendered-pipeline",
      storyCount: store.stories.length,
      routeCount: scrape.routeCount,
      notes: `Synced ${stories.length} stories from ${links.length} scraped links`,
    };
    await writeStoreAtomic(store);
    return store;
  });

  return {
    ok: true,
    ingestedStories: stories.length,
    scrapedLinks: links.length,
    totalStories: merged.stories.length,
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
