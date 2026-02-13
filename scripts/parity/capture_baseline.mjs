#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    outDir: "output/playwright/parity_baseline",
    headed: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--base-url" && argv[i + 1]) {
      opts.baseUrl = argv[i + 1];
      i += 1;
    } else if (a === "--out-dir" && argv[i + 1]) {
      opts.outDir = argv[i + 1];
      i += 1;
    } else if (a === "--headed") {
      opts.headed = true;
    }
  }
  return opts;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(process.cwd(), opts.outDir);
  await ensureDir(outDir);
  const manifestPath = path.join(outDir, "manifest.json");

  let storySlug = null;
  try {
    const stories = await fetchJson(`${opts.baseUrl.replace(/\/$/, "")}/api/stories?limit=10`);
    storySlug = Array.isArray(stories?.stories) && stories.stories[0]?.slug ? stories.stories[0].slug : null;
  } catch {
    storySlug = null;
  }

  const routes = [
    { id: "home", url: `${opts.baseUrl}/` },
    ...(storySlug ? [{ id: "story", url: `${opts.baseUrl}/story/${encodeURIComponent(storySlug)}` }] : []),
    { id: "blindspot", url: `${opts.baseUrl}/blindspot` },
    { id: "compare", url: `${opts.baseUrl}/compare` },
    { id: "calendar", url: `${opts.baseUrl}/calendar` },
    { id: "maps", url: `${opts.baseUrl}/maps` },
    { id: "newsletters", url: `${opts.baseUrl}/newsletters` },
    { id: "methodology", url: `${opts.baseUrl}/about/methodology` },
    { id: "interest", url: `${opts.baseUrl}/interest/politics` },
    { id: "search", url: `${opts.baseUrl}/search?q=climate` },
    { id: "local", url: `${opts.baseUrl}/local` },
    { id: "my", url: `${opts.baseUrl}/my` },
    { id: "source", url: `${opts.baseUrl}/source/cnn` },
    { id: "login", url: `${opts.baseUrl}/login` },
    { id: "signup", url: `${opts.baseUrl}/signup` },
    { id: "get-started", url: `${opts.baseUrl}/get-started` },
    { id: "rating-system", url: `${opts.baseUrl}/rating-system` },
  ];

  const browser = await chromium.launch({ headless: !opts.headed });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    for (const r of routes) {
      await page.goto(r.url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, `${r.id}.png`), fullPage: true });
      console.log(`captured ${r.id}`);
    }

    await fs.writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          baseUrl: opts.baseUrl,
          outDir,
          routes: routes.map((r) => ({ id: r.id, url: r.url, screenshot: `${r.id}.png` })),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    console.log(`baseline written to ${path.relative(process.cwd(), outDir)}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
