#!/usr/bin/env node
/* eslint-disable no-console */
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
  "/subscribe",
];

export function parseArgs(argv) {
  const opts = {
    routes: DEFAULT_ROUTES,
    out: "output/browser_use/groundnews_cdp/scrape_result.json",
    scrollPasses: 5,
    maxLinksPerRoute: 300,
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
    } else if (a === "--out" && argv[i + 1]) {
      opts.out = argv[i + 1];
      i += 1;
    } else if (a === "--scroll-passes" && argv[i + 1]) {
      opts.scrollPasses = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--max-links" && argv[i + 1]) {
      opts.maxLinksPerRoute = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--headed") {
      opts.headless = false;
    } else if (a === "--silent") {
      opts.silent = true;
    }
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

async function scrapeRoute(page, routeUrl, opts) {
  await page.goto(routeUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  const preflight = await groundNewsPreflight(page);

  for (let i = 0; i < opts.scrollPasses; i += 1) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
    await groundNewsPreflight(page);
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  const extracted = await extractRouteData(page, opts.maxLinksPerRoute);
  return {
    routeUrl,
    ...preflight,
    ...extracted,
    scrapedAt: new Date().toISOString(),
  };
}

export async function runGroundNewsScrape(inputOpts = {}) {
  requireApiKey();
  const opts = {
    ...parseArgs([]),
    ...inputOpts,
    routes: inputOpts.routes ?? DEFAULT_ROUTES,
  };

  const outPath = path.resolve(process.cwd(), opts.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  let sessionId = null;
  let browser = null;

  try {
    const session = await createBrowserSession({}, { rotationKey: `groundnews:${opts.routes.join(",")}` });
    sessionId = session.id;
    if (!session.cdpUrl) throw new Error("Browser Use did not return cdpUrl");
    browser = await chromium.connectOverCDP(session.cdpUrl, { timeout: 60000, slowMo: 0 });
    const context = browser.contexts()[0] ?? (await browser.newContext({ viewport: { width: 1440, height: 900 } }));
    const page = await context.newPage();

    const routes = opts.routes.map(normalizeRoute);
    const routeResults = [];
    for (const routeUrl of routes) {
      if (!opts.silent) console.log(`scraping route: ${routeUrl}`);
      try {
        const result = await scrapeRoute(page, routeUrl, opts);
        routeResults.push({ status: "ok", ...result });
      } catch (err) {
        routeResults.push({
          status: "error",
          routeUrl,
          error: err instanceof Error ? err.message : "Unknown route scrape error",
          scrapedAt: new Date().toISOString(),
        });
      }
    }

    const allStoryLinks = Array.from(
      new Set(routeResults.flatMap((r) => (r.status === "ok" ? r.storyLinks : []))),
    );

    const output = {
      generatedAt: new Date().toISOString(),
      mode: "browser_use_remote_cdp",
      sessionId,
      sessionRotation: session.rotation || null,
      sessionPayload: session.requestedPayload || {},
      routeCount: routes.length,
      uniqueStoryLinkCount: allStoryLinks.length,
      allStoryLinks,
      routes: routeResults,
    };

    await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    if (!opts.silent) {
      console.log(`wrote ${outPath}`);
      console.log(`uniqueStoryLinkCount=${output.uniqueStoryLinkCount}`);
    }
    return output;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopBrowserSession(sessionId);
  }
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
