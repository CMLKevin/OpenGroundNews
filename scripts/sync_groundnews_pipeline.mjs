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
const DEFAULT_ARTICLE_AUDIT_DIR = "output/browser_use/groundnews_cdp/article_audit";
const FALLBACK_IMAGE = "/images/story-fallback.svg";
const LOCK_TIMEOUT_MS = 15000;
const LOCK_STALE_MS = 120000;
const LOCK_WAIT_STEP_MS = 80;
const SOURCE_FETCH_TIMEOUT_MS = 12000;
const SOURCE_FETCH_CONCURRENCY = 4;

function parseArgs(argv) {
  const opts = {
    routes: ["/"],
    storyLimit: 0,
    out: DEFAULT_OUT,
    articleAuditDir: DEFAULT_ARTICLE_AUDIT_DIR,
    articleAudit: true,
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
  if (/(far\s+left|lean\s+left|center[-\s]?left|left)/.test(text)) return "left";
  if (/(far\s+right|lean\s+right|center[-\s]?right|right)/.test(text)) return "right";
  if (text.includes("center")) return "center";
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

function normalizeAssetUrl(value, baseUrl = "") {
  const clean = normalizeText(value);
  if (!clean) return undefined;
  if (clean.startsWith("/_next/image")) {
    try {
      const parsed = new URL(clean, "https://ground.news");
      const nested = parsed.searchParams.get("url");
      if (nested) return normalizeAssetUrl(decodeURIComponent(nested), "https://ground.news");
      return undefined;
    } catch {
      return undefined;
    }
  }
  try {
    const parsed = new URL(clean, baseUrl || undefined);
    if (!/^https?:$/i.test(parsed.protocol)) return undefined;
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

    const findTagsInTopicsPanel = () => {
      const tagSet = new Set();
      const headingCandidates = Array.from(document.querySelectorAll("h2,h3,h4,div,span,strong")).filter((node) =>
        /similar news topics|related topics/i.test(normalize(node.textContent || "")),
      );

      for (const heading of headingCandidates) {
        const section = heading.closest("section,aside,article,div");
        if (!section) continue;
        const anchors = Array.from(section.querySelectorAll("a[href*='/interest/'],a[href*='/topic/']"));
        for (const anchor of anchors) {
          const text = normalize(anchor.textContent || "");
          if (!text || text.length < 2 || text.length > 48) continue;
          if (/^(show all|all|\+\d+)$/i.test(text)) continue;
          tagSet.add(text);
        }
      }

      if (tagSet.size > 0) return Array.from(tagSet);

      const keywordMeta = normalize(document.querySelector("meta[name='keywords']")?.getAttribute("content") || "");
      if (keywordMeta) {
        return keywordMeta
          .split(",")
          .map((part) => normalize(part))
          .filter((text) => text.length >= 2 && text.length <= 48)
          .slice(0, 16);
      }

      return [];
    };

    const tags = findTagsInTopicsPanel();

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
        bias: extractBiasFromText(`${biasLabel} ${block}`),
        factuality: parseFactualityFromBlock(block),
        paywall: parsePaywallFromBlock(block),
        locality: parseLocalityFromBlock(block),
        ownership: parseOwnershipFromBlock(block),
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
          const logoUrl = normalize(anyNode.logo || anyNode.logoUrl || anyNode.icon || anyNode.image || "");

          const outletFromExisting = existing?.outlet || "";
          const excerptFromExisting = existing?.excerpt || "";
          const outletResolved = !isWeakOutletLabel(outletFromExisting) ? outletFromExisting : outlet;
          const excerptResolved = !isWeakExcerpt(excerptFromExisting) ? excerptFromExisting : excerpt;

          sourceByUrl.set(normalizedUrl, {
            url: normalizedUrl,
            outlet: outletResolved || outlet || sourceUrl.hostname.replace(/^www\./, ""),
            excerpt: excerptResolved || excerpt || "",
            logoUrl: existing?.logoUrl || logoUrl,
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
    const html = await page.content();
    await writeTextFile(articleHtmlPath, html);
    const nextDataRaw = extractNextDataRawFromHtml(html);
    if (nextDataRaw) {
      await writeTextFile(articleNextDataPath, nextDataRaw);
    } else {
      await writeTextFile(articleNextDataPath, "");
    }

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
      sourceCardCount: rendered?.rawFeatures?.sourceCardCount ?? 0,
      hasBiasDistribution: Boolean(rendered?.rawFeatures?.hasBiasDistribution),
      hasCoverageDetails: Boolean(rendered?.rawFeatures?.hasCoverageDetails),
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
    : { excerpt: "", publishedAt: null, title: "" };
  const outlet = normalizeText(candidate.outlet) || hostFromUrl(normalizedUrl);
  const excerptFromMeta = normalizeText(sourceMeta.excerpt);
  const excerptCandidate = looksLikeWeakExcerpt(candidateExcerpt) ? "" : candidateExcerpt;
  const excerptResolved = excerptCandidate || excerptFromMeta || candidateExcerpt || "";
  const excerpt = summarizeText(excerptResolved, "Excerpt unavailable from publisher metadata.");

  return {
    id: stableId(`${storySlug}:${normalizedUrl}`, `${storySlug}-src`),
    outlet,
    url: normalizedUrl,
    excerpt,
    logoUrl: normalizeAssetUrl(candidate.logoUrl, storyUrlForAssets || "https://ground.news"),
    bias: parseBiasLabel(candidate.bias),
    factuality: parseFactualityLabel(candidate.factuality),
    ownership: normalizeText(candidate.ownership) || "Unlabeled",
    publishedAt: candidatePublishedAt || sourceMeta.publishedAt || undefined,
    paywall: parsePaywallLabel(candidate.paywall),
    locality: parseLocalityLabel(candidate.locality),
  };
}

async function enrichStory(page, storyUrl, linkSignals, sourceMetadataCache, auditState, articleOrdinal) {
  const rendered = await extractStoryFromDom(page, storyUrl, auditState, articleOrdinal);
  const renderedHtml = auditState?.enabled ? await page.content().catch(() => "") : "";
  const nextData = renderedHtml ? extractNextDataFromHtml(renderedHtml) : null;
  const updatedAt = new Date().toISOString();
  const sourceOutletSet = new Set(
    (rendered.sources || [])
      .map((source) => normalizeText(source.outlet).toLowerCase())
      .filter(Boolean),
  );
  const tags = sanitizeTags(
    (rendered.tags || []).filter((tag) => !sourceOutletSet.has(normalizeText(tag).toLowerCase())),
  );
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

  // If the DOM-based pass produced weak outlet/excerpt values, try to repair them from Next.js hydration state.
  if (nextData && candidates.length > 0) {
    const byUrl = new Map(candidates.map((c) => [c.url, c]));
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
      const existing = byUrl.get(normalized);
      if (!existing) continue;

      const outlet = normalizeText(anyNode.outlet || anyNode.publisher || anyNode.publisherName || anyNode.sourceName || "");
      const excerpt = normalizeText(anyNode.excerpt || anyNode.summary || anyNode.description || "");
      const logoUrl = normalizeText(anyNode.logo || anyNode.logoUrl || anyNode.icon || anyNode.image || "");

      if (outlet && looksLikeWeakOutletLabel(existing.outlet)) existing.outlet = outlet;
      if (excerpt && looksLikeWeakExcerpt(existing.excerpt)) existing.excerpt = excerpt;
      if (logoUrl && !existing.logoUrl) existing.logoUrl = logoUrl;
    }
  }

  const enrichedSources = (
    await mapWithConcurrency(candidates, SOURCE_FETCH_CONCURRENCY, (candidate) =>
      enrichSourceCandidate(slug, candidate, sourceMetadataCache, storyUrl),
    )
  ).filter(Boolean);

  const signals = linkSignals.get(storyUrl) || { trending: false, blindspot: false, local: false };
  const derivedBias = deriveBiasDistribution(enrichedSources);
  const coverageBiasRaw = rendered?.coverage?.percentages;
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
      typeof rendered?.coverage?.totalSources === "number" ? Math.max(0, Math.round(rendered.coverage.totalSources)) : undefined,
    leaningLeft:
      typeof rendered?.coverage?.leaningLeft === "number" ? Math.max(0, Math.round(rendered.coverage.leaningLeft)) : undefined,
    center: typeof rendered?.coverage?.center === "number" ? Math.max(0, Math.round(rendered.coverage.center)) : undefined,
    leaningRight:
      typeof rendered?.coverage?.leaningRight === "number"
        ? Math.max(0, Math.round(rendered.coverage.leaningRight))
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

  const localContext = `${title} ${summary} ${tags.join(" ")}`.toLowerCase();
  const localHeuristic = /\b(local|city|county|state|province|district|municipal)\b/.test(localContext);

  return {
    id: stableId(storyUrl, "story"),
    slug,
    canonicalUrl: storyUrl,
    title,
    dek: summarizeText(rendered.dek || "", ""),
    author: normalizeText(rendered.author || ""),
    summary,
    topic: summarizeText(rendered.topic, "Top Stories"),
    location,
    tags: tags.length > 0 ? tags : ["News"],
    imageUrl: sanitizeImageUrl(rendered.imageUrl, storyUrl),
    publishedAt,
    updatedAt,
    sourceCount: Math.max(enrichedSources.length, coverageTotals.totalSources ?? 0),
    bias,
    blindspot: signals.blindspot || dominant >= 60,
    local: signals.local || localHeuristic,
    trending: signals.trending,
    sources: enrichedSources,
    coverage: coverageTotals,
    readerLinks: Array.isArray(rendered.readerLinks) ? rendered.readerLinks.slice(0, 12) : [],
    timelineHeaders: Array.isArray(rendered.timelineHeaders) ? rendered.timelineHeaders.slice(0, 12) : [],
    podcastReferences: Array.isArray(rendered.podcastReferences) ? rendered.podcastReferences.slice(0, 12) : [],
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
  const limit = Number.isFinite(options.storyLimit) && options.storyLimit > 0 ? options.storyLimit : Infinity;
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
  let links = scrapeLinks.slice(0, limit);
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
    links = chosenDiscoveryLinks.slice(0, limit);
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
    store.stories = dedupeStories([...store.stories, ...stories]);
    store.ingestion = {
      ...store.ingestion,
      lastRunAt: new Date().toISOString(),
      lastMode: "groundnews-frontpage-individual-article-pipeline",
      storyCount: store.stories.length,
      routeCount: Array.isArray(options.routes) ? options.routes.length : 1,
      notes: `Synced ${stories.length} stories from ${links.length} front-page article links`,
    };
    await writeStoreAtomic(store);
    return store;
  });

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
