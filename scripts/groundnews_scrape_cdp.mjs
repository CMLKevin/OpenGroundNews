#!/usr/bin/env node
/* eslint-disable no-console */
import "./lib/load_env.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { createBrowserSession, stopBrowserSession, requireApiKey } from "./lib/browser_use_cdp.mjs";

export const DEFAULT_ROUTES = [
  "/my",
  "/",
  "/local",
  "/blindspot",
  "/rating-system",
];

export const DEFAULT_EDITIONS = ["international", "us", "uk", "canada", "europe"];

const EDITION_ALIASES = {
  international: ["international", "international edition"],
  us: ["us", "united states", "united states (us)"],
  uk: ["uk", "united kingdom", "united kingdom (uk)"],
  canada: ["canada"],
  europe: ["europe", "eu", "european union"],
};

function normalizeEditionKey(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return "";
  if (clean === "international" || clean === "int" || clean === "world") return "international";
  if (clean === "us" || clean === "usa" || clean === "united states") return "us";
  if (clean === "uk" || clean === "gb" || clean === "united kingdom") return "uk";
  if (clean === "canada" || clean === "ca") return "canada";
  if (clean === "europe" || clean === "eu" || clean === "european union") return "europe";
  return "";
}

function editionDisplayName(key) {
  if (key === "international") return "International";
  if (key === "us") return "US";
  if (key === "uk") return "UK";
  if (key === "canada") return "Canada";
  if (key === "europe") return "Europe";
  return key || "Unknown";
}

function editionAliases(key) {
  return EDITION_ALIASES[key] || [key];
}

function routePathname(routeUrl) {
  try {
    return new URL(routeUrl).pathname || "/";
  } catch {
    return "/";
  }
}

function routeSupportsEditionExpansion(routeUrl) {
  return routePathname(routeUrl) === "/";
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseArgs(argv) {
  const opts = {
    routes: DEFAULT_ROUTES,
    editions: DEFAULT_EDITIONS,
    out: "output/browser_use/groundnews_cdp/scrape_result.json",
    scrollPasses: 5,
    maxLinksPerRoute: 300,
    routeRetries: 1,
    sessionConcurrency: Math.max(1, Math.round(Number(process.env.GROUNDNEWS_SCRAPE_SESSION_CONCURRENCY || 2))),
    headless: true,
    silent: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--routes" && argv[i + 1]) {
      opts.routes = argv[i + 1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      i += 1;
    } else if (a === "--editions" && argv[i + 1]) {
      opts.editions = argv[i + 1]
        .split(",")
        .map((s) => normalizeEditionKey(s))
        .filter(Boolean);
      i += 1;
    } else if (a === "--single-edition") {
      opts.editions = ["international"];
    } else if (a === "--out" && argv[i + 1]) {
      opts.out = argv[i + 1];
      i += 1;
    } else if (a === "--scroll-passes" && argv[i + 1]) {
      opts.scrollPasses = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--max-links" && argv[i + 1]) {
      opts.maxLinksPerRoute = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--route-retries" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      opts.routeRetries = Number.isFinite(parsed) && parsed >= 0 ? Math.max(0, Math.round(parsed)) : opts.routeRetries;
      i += 1;
    } else if (a === "--session-concurrency" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      opts.sessionConcurrency =
        Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.round(parsed)) : opts.sessionConcurrency;
      i += 1;
    } else if (a === "--headed") {
      opts.headless = false;
    } else if (a === "--silent") {
      opts.silent = true;
    }
  }
  if (!Array.isArray(opts.editions) || opts.editions.length === 0) {
    opts.editions = DEFAULT_EDITIONS.slice();
  } else {
    opts.editions = Array.from(new Set(opts.editions));
  }
  return opts;
}

function normalizeRoute(route) {
  if (route.startsWith("http://") || route.startsWith("https://")) return route;
  if (!route.startsWith("/")) return `https://ground.news/${route}`;
  return `https://ground.news${route}`;
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

async function groundNewsPreflight(page) {
  const proceedTargets = [
    page.getByRole("button", { name: /Proceed to/i }),
    page.getByRole("link", { name: /Proceed to/i }),
    page.getByRole("button", { name: /Ground News homepage/i }),
    page.getByRole("link", { name: /Ground News homepage/i }),
    page.locator("a:has-text('Ground News homepage')"),
    page.getByText(/Proceed to\s+Ground News homepage/i),
  ];

  let clickedProceedButton = false;
  let clickedProceedLink = false;
  for (const target of proceedTargets) {
    const clicked = (await clickIfVisible(target)) || (await clickIfVisible(target, { force: true }));
    if (clicked) {
      clickedProceedButton = true;
      clickedProceedLink = true;
      break;
    }
  }

  const cookieTargets = [
    page.getByRole("button", { name: /Reject Non-Essential/i }),
    page.getByRole("button", { name: /Accept All/i }),
    page.getByRole("button", { name: /^Save$/i }),
  ];

  let rejectedCookies = false;
  for (const target of cookieTargets) {
    const clicked = await clickIfVisible(target);
    if (clicked) {
      rejectedCookies = true;
      break;
    }
  }

  return {
    clickedProceedButton,
    clickedProceedLink,
    rejectedCookies,
  };
}

async function selectEditionViaSelectElement(page, editionKey) {
  const aliases = editionAliases(editionKey).map((v) => String(v).toLowerCase());
  return page.evaluate((labels) => {
    const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    const selects = Array.from(document.querySelectorAll("select"));
    for (const select of selects) {
      const options = Array.from(select.querySelectorAll("option"));
      if (options.length < 3) continue;
      const optionTexts = options.map((opt) => normalize(opt.textContent || ""));
      const looksLikeEditionPicker = optionTexts.some((text) => text.includes("international")) && optionTexts.some((text) => text === "us" || text.includes("united states"));
      if (!looksLikeEditionPicker) continue;
      const target = options.find((opt) => {
        const text = normalize(opt.textContent || "");
        return labels.some((label) => text === label || text.includes(label));
      });
      if (!target) continue;
      const value = target.getAttribute("value") ?? target.value;
      if (value == null) continue;
      select.value = String(value);
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }, aliases);
}

async function selectEditionFromMenu(page, editionKey) {
  const labels = editionAliases(editionKey);

  const triggers = [
    page.getByRole("button", { name: /edition/i }),
    page.getByRole("combobox", { name: /edition/i }),
    page.locator("button:has-text('Edition')"),
    page.locator("[aria-label*='Edition']"),
    page.locator("text=/International Edition|US Edition|UK Edition|Canada Edition|Europe/i"),
  ];
  let opened = false;
  let triggerTop = null;
  for (const trigger of triggers) {
    try {
      const count = await trigger.count();
      if (count === 0) continue;
      const first = trigger.first();
      const visible = await first.isVisible().catch(() => false);
      if (!visible) continue;
      const box = await first.boundingBox().catch(() => null);
      await first.click({ timeout: 3000 }).catch(() => first.click({ timeout: 3000, force: true }));
      triggerTop = box?.y ?? null;
      opened = true;
      break;
    } catch {
      // continue trying other trigger locators
    }
  }
  if (!opened) return false;

  const targetTop = Number.isFinite(triggerTop) ? Number(triggerTop) : 100;
  const labelsLower = labels.map((value) => String(value).trim().toLowerCase());
  const clicked = await page.evaluate(
    ({ targets, anchorTop }) => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
      const visible = (el) => {
        if (!el || typeof el.getBoundingClientRect !== "function") return false;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || "1") <= 0) return false;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
        return true;
      };

      const nodes = Array.from(document.querySelectorAll("button,a,li,div,[role='menuitem'],[role='option']"));
      const candidates = nodes
        .filter((node) => visible(node))
        .map((node) => {
          const text = normalize(node.textContent || "");
          const rect = node.getBoundingClientRect();
          const exact = targets.some((target) => text === target || text.replace(/\s+edition$/i, "") === target);
          return { node, text, rect, exact };
        })
        .filter((entry) => entry.exact)
        .sort((a, b) => {
          const aScore = Math.abs(a.rect.top - anchorTop) + Math.abs(a.rect.left - 300) * 0.02;
          const bScore = Math.abs(b.rect.top - anchorTop) + Math.abs(b.rect.left - 300) * 0.02;
          return aScore - bScore;
        });

      const target = candidates[0]?.node;
      if (!target) return false;
      target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      if (typeof target.click === "function") target.click();
      return true;
    },
    { targets: labelsLower, anchorTop: targetTop },
  );
  if (clicked) return true;

  for (const label of labels) {
    const labelRegex = new RegExp(`^\\s*${escapeRegex(label)}\\s*$`, "i");
    const optionLocators = [
      page.getByRole("option", { name: labelRegex }),
      page.getByRole("menuitem", { name: labelRegex }),
      page.getByRole("button", { name: labelRegex }),
      page.getByRole("link", { name: labelRegex }),
      page.getByText(labelRegex, { exact: true }),
    ];
    for (const locator of optionLocators) {
      const ok = (await clickIfVisible(locator)) || (await clickIfVisible(locator, { force: true }));
      if (ok) return true;
    }
  }
  return false;
}

async function selectGroundEdition(page, editionKey) {
  if (!editionKey) return { applied: false, method: "none" };
  if (editionKey === "international") {
    return { applied: true, method: "default-international", edition: editionKey };
  }
  const bySelect = await selectEditionViaSelectElement(page, editionKey).catch(() => false);
  if (bySelect) {
    await page.waitForTimeout(800);
    return { applied: true, method: "select-element", edition: editionKey };
  }

  const byMenu = await selectEditionFromMenu(page, editionKey);
  if (byMenu) {
    await page.waitForTimeout(1100);
    return { applied: true, method: "menu-click", edition: editionKey };
  }
  return { applied: false, method: "not-found", edition: editionKey };
}

async function extractRouteData(page, maxLinksPerRoute) {
  return page.evaluate(({ maxLinks }) => {
    const hrefs = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => {
        try {
          return new URL(a.href, window.location.origin).toString();
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const dedup = (arr) => Array.from(new Set(arr));
    const byPrefix = (needle) => dedup(hrefs.filter((h) => h.includes(needle))).slice(0, maxLinks);

    const bodyText = document.body?.innerText || "";
    const blockedSignals = {
      proceedInterstitial: /Proceed to/i.test(bodyText),
      cookieBanner: /Reject Non-Essential|Storage Preferences/i.test(bodyText),
    };

    return {
      title: document.title,
      finalUrl: window.location.href,
      storyLinks: byPrefix("/article/"),
      topicLinks: byPrefix("/interest/"),
      sourceLinks: byPrefix("/my/discover/source"),
      blockedSignals,
    };
  }, { maxLinks: maxLinksPerRoute });
}

async function scrapeRoute(page, routeUrl, opts, editionKey = "") {
  await page.goto(routeUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  const preflight = await groundNewsPreflight(page);
  let editionSelection = { applied: false, method: "none", edition: "" };
  if (editionKey) {
    editionSelection = await selectGroundEdition(page, editionKey);
    if (editionSelection.applied) {
      await page.goto(routeUrl, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(900);
    }
    await groundNewsPreflight(page);
  }

  for (let i = 0; i < opts.scrollPasses; i += 1) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
    await groundNewsPreflight(page);
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  const extracted = await extractRouteData(page, opts.maxLinksPerRoute);
  return {
    routeUrl,
    edition: editionKey || null,
    editionLabel: editionKey ? editionDisplayName(editionKey) : null,
    editionSelection,
    ...preflight,
    ...extracted,
    scrapedAt: new Date().toISOString(),
  };
}

async function scrapeRouteWithRetry(page, routeUrl, opts, editionKey = "") {
  const retries = Number.isFinite(opts.routeRetries) && opts.routeRetries >= 0 ? Math.max(0, Math.round(opts.routeRetries)) : 1;
  const maxAttempts = retries + 1;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await scrapeRoute(page, routeUrl, opts, editionKey);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
      await page.context().clearCookies().catch(() => {});
      await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(500 + attempt * 300);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown route scrape error");
}

function isSessionConcurrencyError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("http 429") || message.includes("too many concurrent active sessions");
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

export async function runGroundNewsScrape(inputOpts = {}) {
  requireApiKey();
  const opts = {
    ...parseArgs([]),
    ...inputOpts,
    routes: inputOpts.routes ?? DEFAULT_ROUTES,
    editions: Array.isArray(inputOpts.editions) && inputOpts.editions.length > 0 ? inputOpts.editions : undefined,
  };
  if (!Array.isArray(opts.editions) || opts.editions.length === 0) opts.editions = DEFAULT_EDITIONS.slice();
  opts.editions = Array.from(new Set(opts.editions.map((item) => normalizeEditionKey(item)).filter(Boolean)));
  if (opts.editions.length === 0) opts.editions = DEFAULT_EDITIONS.slice();

  const outPath = path.resolve(process.cwd(), opts.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const routes = opts.routes.map(normalizeRoute);
  const routeTargets = [];
  for (const routeUrl of routes) {
    const editionsForRoute = routeSupportsEditionExpansion(routeUrl) ? opts.editions : [opts.editions[0]];
    for (const editionKey of editionsForRoute) {
      routeTargets.push({ routeUrl, editionKey });
    }
  }

  const targetsByEdition = new Map();
  for (const target of routeTargets) {
    const key = target.editionKey || opts.editions[0] || "international";
    const list = targetsByEdition.get(key) || [];
    list.push(target);
    targetsByEdition.set(key, list);
  }

  const sessionConcurrency = Number.isFinite(opts.sessionConcurrency) && opts.sessionConcurrency > 0
    ? Math.max(1, Math.round(opts.sessionConcurrency))
    : 2;

  const editionEntries = Array.from(targetsByEdition.entries());
  const minStoryLinksPerEdition = Math.max(
    6,
    Number.isFinite(Number(process.env.GROUNDNEWS_MIN_STORY_LINKS_PER_EDITION))
      ? Math.round(Number(process.env.GROUNDNEWS_MIN_STORY_LINKS_PER_EDITION))
      : 12,
  );

  async function scrapeEditionTargets([editionKey, targets], workerIndex = 0, phase = "parallel") {
    const localRouteResults = [];
    let localSessionSummary = null;
    let sessionId = null;
    let browser = null;

    try {
      let session = null;
      let bootstrapError = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          session = await createBrowserSession(
            {},
            { rotationKey: `groundnews:${opts.routes.join(",")}:edition:${editionKey}`, edition: editionKey },
          );
          bootstrapError = null;
          break;
        } catch (error) {
          bootstrapError = error;
          if (!isSessionConcurrencyError(error) || attempt >= 3) break;
          const backoffMs = 1200 * attempt + workerIndex * 200;
          if (!opts.silent) {
            console.warn(
              `session bootstrap throttled for edition=${editionKey}; retrying in ${backoffMs}ms (attempt ${attempt}/3, phase=${phase})`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
      if (bootstrapError) throw bootstrapError;

      sessionId = session?.id || null;
      localSessionSummary = {
        id: session?.id || null,
        edition: editionKey,
        editionLabel: editionDisplayName(editionKey),
        rotation: session?.rotation || null,
        payload: session?.requestedPayload || {},
      };
      if (!session?.cdpUrl) throw new Error("Browser Use did not return cdpUrl");
      browser = await chromium.connectOverCDP(session.cdpUrl, { timeout: 60000, slowMo: 0 });
      const context = browser.contexts()[0] ?? (await browser.newContext({ viewport: { width: 1440, height: 900 } }));
      const page = await context.newPage();

      for (const target of targets) {
        if (!opts.silent) {
          const editionText = target.editionKey ? ` [edition=${editionDisplayName(target.editionKey)}]` : "";
          console.log(`scraping route: ${target.routeUrl}${editionText}${phase === "parallel" ? "" : ` [phase=${phase}]`}`);
        }
        try {
          const result = await scrapeRouteWithRetry(page, target.routeUrl, opts, target.editionKey);
          localRouteResults.push({ status: "ok", ...result });
        } catch (err) {
          localRouteResults.push({
            status: "error",
            routeUrl: target.routeUrl,
            edition: target.editionKey || null,
            editionLabel: target.editionKey ? editionDisplayName(target.editionKey) : null,
            error: err instanceof Error ? err.message : "Unknown route scrape error",
            scrapedAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      for (const target of targets) {
        localRouteResults.push({
          status: "error",
          routeUrl: target.routeUrl,
          edition: target.editionKey || null,
          editionLabel: target.editionKey ? editionDisplayName(target.editionKey) : null,
          error: `Session bootstrap failed: ${error instanceof Error ? error.message : "unknown error"}`,
          scrapedAt: new Date().toISOString(),
        });
      }
    } finally {
      if (browser) await browser.close().catch(() => {});
      await stopBrowserSession(sessionId);
    }

    return {
      editionKey,
      targets,
      phase,
      routeResults: localRouteResults,
      sessionSummary: localSessionSummary,
    };
  }

  const initialOutcomes = await mapWithConcurrency(editionEntries, sessionConcurrency, (entry, workerIndex) =>
    scrapeEditionTargets(entry, workerIndex, "parallel"),
  );
  const editionOutcomes = initialOutcomes.slice();
  let lowYieldRetryCount = 0;
  let lowYieldRetryImprovedCount = 0;

  const countExpandableStoryLinks = (outcome) => {
    const links = [];
    for (const result of outcome.routeResults || []) {
      if (result?.status !== "ok") continue;
      if (!routeSupportsEditionExpansion(result.routeUrl || "")) continue;
      for (const link of result.storyLinks || []) links.push(link);
    }
    return new Set(links).size;
  };

  for (let i = 0; i < editionOutcomes.length; i += 1) {
    const outcome = editionOutcomes[i];
    const hasExpandableRoute = (outcome.targets || []).some((target) => routeSupportsEditionExpansion(target.routeUrl || ""));
    if (!hasExpandableRoute) continue;
    const currentLinks = countExpandableStoryLinks(outcome);
    if (currentLinks >= minStoryLinksPerEdition) continue;
    if (!opts.silent) {
      console.warn(
        `low-yield edition scrape detected for ${editionDisplayName(outcome.editionKey)} (${currentLinks} links); running sequential retry`,
      );
    }
    lowYieldRetryCount += 1;
    const retryOutcome = await scrapeEditionTargets([outcome.editionKey, outcome.targets], 0, "low-yield-retry");
    const retryLinks = countExpandableStoryLinks(retryOutcome);
    if (retryLinks > currentLinks) {
      editionOutcomes[i] = retryOutcome;
      lowYieldRetryImprovedCount += 1;
      if (!opts.silent) {
        console.log(
          `low-yield retry improved ${editionDisplayName(outcome.editionKey)} links: ${currentLinks} -> ${retryLinks}`,
        );
      }
    }
  }

  const routeResults = editionOutcomes.flatMap((outcome) => outcome.routeResults || []);
  const sessionSummaries = editionOutcomes.map((outcome) => outcome.sessionSummary).filter(Boolean);

  const allStoryLinks = Array.from(
    new Set(routeResults.flatMap((r) => (r.status === "ok" ? r.storyLinks : []))),
  );

  const output = {
    generatedAt: new Date().toISOString(),
    mode: "browser_use_remote_cdp",
    sessionConcurrency,
    lowYieldMinStoryLinks: minStoryLinksPerEdition,
    lowYieldRetryCount,
    lowYieldRetryImprovedCount,
    sessionId: sessionSummaries[0]?.id || null,
    sessionIds: sessionSummaries.map((session) => session.id).filter(Boolean),
    sessionRotation:
      sessionSummaries.length === 1
        ? sessionSummaries[0].rotation || null
        : {
            mode: "multi-session",
            sessions: sessionSummaries.map((session) => ({
              id: session.id,
              edition: session.edition,
              editionLabel: session.editionLabel,
              rotation: session.rotation || null,
            })),
          },
    sessionPayload:
      sessionSummaries.length === 1
        ? sessionSummaries[0].payload || {}
        : { mode: "multi-session", sessions: sessionSummaries.map((session) => ({ edition: session.edition, payload: session.payload || {} })) },
    routeCount: routeResults.length,
    uniqueStoryLinkCount: allStoryLinks.length,
    allStoryLinks,
    routes: routeResults,
  };

  await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  if (!opts.silent) {
    console.log(`wrote ${outPath}`);
    console.log(`uniqueStoryLinkCount=${output.uniqueStoryLinkCount}`);
    console.log(`sessions=${sessionSummaries.length}`);
  }
  return output;
}

export async function runGroundNewsScrapeCli(argv) {
  const opts = parseArgs(argv);
  await runGroundNewsScrape(opts);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runGroundNewsScrapeCli(process.argv.slice(2)).catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
