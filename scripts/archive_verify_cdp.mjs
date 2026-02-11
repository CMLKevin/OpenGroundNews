#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { createBrowserSession, stopBrowserSession, requireApiKey } from "./lib/browser_use_cdp.mjs";

const DEFAULT_ARCHIVE_HOSTS = ["archive.is", "archive.ph", "archive.today", "archive.md"];

function parseArgs(argv) {
  const opts = {
    urlsFile: "",
    outJson: "output/browser_use/archive_cdp/archive_results.json",
    outMd: "output/browser_use/archive_cdp/archive_results.md",
    hosts: DEFAULT_ARCHIVE_HOSTS,
    headless: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--urls-file" && argv[i + 1]) {
      opts.urlsFile = argv[i + 1];
      i += 1;
    } else if (a === "--out-json" && argv[i + 1]) {
      opts.outJson = argv[i + 1];
      i += 1;
    } else if (a === "--out-md" && argv[i + 1]) {
      opts.outMd = argv[i + 1];
      i += 1;
    } else if (a === "--hosts" && argv[i + 1]) {
      opts.hosts = argv[i + 1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      i += 1;
    } else if (a === "--headed") {
      opts.headless = false;
    }
  }

  if (!opts.urlsFile) {
    throw new Error("Missing required --urls-file");
  }
  return opts;
}

function sanitizeUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

async function detectArchiveState(page) {
  return page.evaluate(() => {
    const title = document.title || "";
    const bodyText = document.body?.innerText || "";
    const combined = `${title}\n${bodyText}`;
    const blocked =
      /One more step/i.test(combined) ||
      /security check/i.test(combined) ||
      /CAPTCHA/i.test(combined) ||
      /recaptcha/i.test(combined);
    const notFound = /No results/i.test(combined) || /didn't archive/i.test(combined);
    const headline =
      document.querySelector("h1")?.textContent?.trim() ||
      document.querySelector("title")?.textContent?.trim() ||
      "";

    return {
      title,
      headline,
      blocked,
      notFound,
      pageTextSnippet: combined.slice(0, 500),
      finalUrl: window.location.href,
    };
  });
}

function classifyAttempt(result) {
  if (result.blocked) return "blocked";
  if (result.notFound) return "not_found";
  return "success";
}

async function tryArchiveHost(page, host, originalUrl) {
  const candidate = `https://${host}/${originalUrl}`;
  try {
    await page.goto(candidate, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
    const detected = await detectArchiveState(page);
    const status = classifyAttempt(detected);
    return {
      host,
      candidateUrl: candidate,
      status,
      archiveUrl: detected.finalUrl,
      observedTitleOrError: detected.headline || detected.title || "No title found",
      snippet: detected.pageTextSnippet,
    };
  } catch (err) {
    return {
      host,
      candidateUrl: candidate,
      status: "error",
      archiveUrl: "none",
      observedTitleOrError: err.message,
      snippet: "",
    };
  }
}

function summarizeAttempts(attempts) {
  const success = attempts.find((a) => a.status === "success");
  if (success) {
    return {
      status: "success",
      archiveUrl: success.archiveUrl,
      observedTitleOrError: success.observedTitleOrError,
      notes: `success on host ${success.host}`,
    };
  }

  const blocked = attempts.find((a) => a.status === "blocked");
  if (blocked) {
    return {
      status: "blocked",
      archiveUrl: "none",
      observedTitleOrError: blocked.observedTitleOrError,
      notes: "blocked by security check/CAPTCHA on tested hosts",
    };
  }

  const notFound = attempts.find((a) => a.status === "not_found");
  if (notFound) {
    return {
      status: "not_found",
      archiveUrl: "none",
      observedTitleOrError: notFound.observedTitleOrError,
      notes: "no snapshot found on tested hosts",
    };
  }

  const firstError = attempts[0];
  return {
    status: "error",
    archiveUrl: "none",
    observedTitleOrError: firstError?.observedTitleOrError || "unknown error",
    notes: "all host attempts failed",
  };
}

function toMarkdownReport(results) {
  const lines = [
    `# Archive CDP Verification (${new Date().toISOString()})`,
    "",
    `- mode: browser_use_remote_cdp`,
    `- tested_urls: ${results.length}`,
    "",
  ];

  results.forEach((r, idx) => {
    lines.push(`## Test ${idx + 1}`);
    lines.push(`- original_url: ${r.originalUrl}`);
    lines.push(`- status: ${r.status}`);
    lines.push(`- archive_url: ${r.archiveUrl}`);
    lines.push(`- observed_title_or_error: ${r.observedTitleOrError}`);
    lines.push(`- notes: ${r.notes}`);
    lines.push("");
  });

  return `${lines.join("\n")}\n`;
}

async function main() {
  requireApiKey();
  const opts = parseArgs(process.argv.slice(2));
  const urlsFile = path.resolve(process.cwd(), opts.urlsFile);
  const outJson = path.resolve(process.cwd(), opts.outJson);
  const outMd = path.resolve(process.cwd(), opts.outMd);
  await fs.mkdir(path.dirname(outJson), { recursive: true });
  await fs.mkdir(path.dirname(outMd), { recursive: true });

  const urlsRaw = await fs.readFile(urlsFile, "utf8");
  const urls = urlsRaw
    .split(/\r?\n/)
    .map(sanitizeUrl)
    .filter(Boolean);
  if (urls.length === 0) {
    throw new Error("No URLs found in --urls-file");
  }

  let sessionId = null;
  let browser = null;

  try {
    const session = await createBrowserSession({}, { rotationKey: "archive-verify-batch" });
    sessionId = session.id;
    if (!session.cdpUrl) throw new Error("Browser Use did not return cdpUrl");
    browser = await chromium.connectOverCDP(session.cdpUrl, { timeout: 60000 });
    const context = browser.contexts()[0] ?? (await browser.newContext({ viewport: { width: 1366, height: 900 } }));
    const page = await context.newPage();

    const results = [];
    for (const originalUrl of urls) {
      console.log(`archive check: ${originalUrl}`);
      const attempts = [];
      for (const host of opts.hosts) {
        const attempt = await tryArchiveHost(page, host, originalUrl);
        attempts.push(attempt);
        if (attempt.status === "success") break;
      }
      const summary = summarizeAttempts(attempts);
      results.push({
        originalUrl,
        ...summary,
        attempts,
        checkedAt: new Date().toISOString(),
      });
    }

    await fs.writeFile(
      outJson,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode: "browser_use_remote_cdp",
          sessionId,
          sessionRotation: session.rotation || null,
          sessionPayload: session.requestedPayload || {},
          hosts: opts.hosts,
          results,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await fs.writeFile(outMd, toMarkdownReport(results), "utf8");

    console.log(`wrote ${outJson}`);
    console.log(`wrote ${outMd}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await stopBrowserSession(sessionId);
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
