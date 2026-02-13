#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    outDir: "output/playwright/parity",
    headed: false,
    timeoutMs: 45000,
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
    } else if (a === "--timeout-ms" && argv[i + 1]) {
      opts.timeoutMs = Number(argv[i + 1]) || opts.timeoutMs;
      i += 1;
    }
  }
  return opts;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function screenshot(page, outPath) {
  await ensureDir(path.dirname(outPath));
  await page.screenshot({ path: outPath, fullPage: true });
}

async function assertTruthy(name, value) {
  if (!value) throw new Error(`assertion failed: ${name}`);
}

function shouldAutoInstallPlaywright() {
  const raw = String(process.env.PARITY_AUTO_INSTALL_PLAYWRIGHT || "").trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return String(process.env.CI || "").trim().toLowerCase() === "true";
}

function isMissingBrowserError(err) {
  const message = err instanceof Error ? err.message : String(err);
  return /executable doesn't exist|download new browsers|browsertype\.launch/i.test(message);
}

function runNodeCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`command failed with exit code ${code}: node ${args.join(" ")}`));
    });
  });
}

async function installChromium() {
  const cliPath = path.resolve(process.cwd(), "node_modules", "playwright-core", "cli.js");
  const args = [cliPath, "install"];
  const isCiLinux = process.platform === "linux" && String(process.env.CI || "").trim().toLowerCase() === "true";
  if (isCiLinux) args.push("--with-deps");
  args.push("chromium");
  console.log(`playwright: installing Chromium (${isCiLinux ? "with system deps" : "browser only"})`);
  await runNodeCommand(args);
}

async function launchChromium(headed) {
  try {
    return await chromium.launch({ headless: !headed });
  } catch (err) {
    const canRecover = shouldAutoInstallPlaywright() && isMissingBrowserError(err);
    if (!canRecover) throw err;
    console.warn("playwright: Chromium executable missing, attempting one-time install and retry");
    await installChromium();
    return chromium.launch({ headless: !headed });
  }
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.resolve(process.cwd(), opts.outDir, ts);
  const latestPath = path.resolve(process.cwd(), opts.outDir, "latest.json");

  const browser = await launchChromium(opts.headed);
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(opts.timeoutMs);

    // Discover at least one story/topic/source to test deep routes.
    let storySlug = null;
    try {
      const stories = await fetchJson(`${opts.baseUrl.replace(/\/$/, "")}/api/stories?limit=10`);
      storySlug = Array.isArray(stories?.stories) && stories.stories[0]?.slug ? stories.stories[0].slug : null;
    } catch {
      storySlug = null;
    }

    const routes = [
      { id: "home", url: `${opts.baseUrl}/` },
      { id: "blindspot", url: `${opts.baseUrl}/blindspot` },
      { id: "compare", url: `${opts.baseUrl}/compare` },
      { id: "calendar", url: `${opts.baseUrl}/calendar` },
      { id: "maps", url: `${opts.baseUrl}/maps` },
      { id: "newsletters", url: `${opts.baseUrl}/newsletters` },
      { id: "methodology", url: `${opts.baseUrl}/about/methodology` },
      { id: "search", url: `${opts.baseUrl}/search?q=ukraine` },
      { id: "local", url: `${opts.baseUrl}/local` },
      { id: "my", url: `${opts.baseUrl}/my` },
      { id: "login", url: `${opts.baseUrl}/login` },
      { id: "signup", url: `${opts.baseUrl}/signup` },
      { id: "get-started", url: `${opts.baseUrl}/get-started` },
      { id: "rating-system", url: `${opts.baseUrl}/rating-system` },
    ];
    if (storySlug) routes.splice(1, 0, { id: "story", url: `${opts.baseUrl}/story/${encodeURIComponent(storySlug)}` });

    const results = [];
    for (const r of routes) {
      const startedAt = Date.now();
      try {
        await page.goto(r.url, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(600);

        const hasTopbar = await page.locator(".topbar").count().then((n) => n > 0).catch(() => false);
        await assertTruthy(`${r.id}: has .topbar`, hasTopbar);

        const topbarSticky = await page.evaluate(() => {
          const el = document.querySelector(".topbar");
          if (!el) return false;
          const cs = window.getComputedStyle(el);
          return cs.position === "sticky" || cs.position === "fixed";
        });
        await assertTruthy(`${r.id}: topbar sticky/fixed`, topbarSticky);

        // Trending strip should exist on all pages once parity work lands.
        const hasTrending = await page.locator(".trending-strip").count().then((n) => n > 0).catch(() => false);
        await assertTruthy(`${r.id}: has trending strip`, hasTrending);

        // Mobile bottom nav check (simulate mobile).
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(200);
        const hasBottomNav = await page.locator(".mobile-bottom-nav").count().then((n) => n > 0).catch(() => false);
        await assertTruthy(`${r.id}: has mobile bottom nav`, hasBottomNav);
        await page.setViewportSize({ width: 1440, height: 900 });

        await screenshot(page, path.join(runDir, `${r.id}.png`));
        results.push({ id: r.id, url: r.url, status: "ok", ms: Date.now() - startedAt });
      } catch (err) {
        await screenshot(page, path.join(runDir, `${r.id}.error.png`)).catch(() => {});
        results.push({
          id: r.id,
          url: r.url,
          status: "error",
          ms: Date.now() - startedAt,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl: opts.baseUrl,
      runDir,
      ok: results.every((r) => r.status === "ok"),
      results,
    };
    await ensureDir(runDir);
    await fs.writeFile(path.join(runDir, "report.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
    await fs.writeFile(
      latestPath,
      `${JSON.stringify({ generatedAt: summary.generatedAt, runDir, reportPath: path.join(runDir, "report.json") }, null, 2)}\n`,
      "utf8",
    );

    const okCount = results.filter((r) => r.status === "ok").length;
    const errCount = results.length - okCount;
    console.log(`parity smoke: ok=${okCount} error=${errCount} report=${path.relative(process.cwd(), path.join(runDir, "report.json"))}`);
    if (errCount) process.exit(2);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
