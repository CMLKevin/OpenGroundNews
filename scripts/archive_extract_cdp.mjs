#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { createBrowserSession, stopBrowserSession, requireApiKey } from "./lib/browser_use_cdp.mjs";

const DEFAULT_HOSTS = ["archive.is", "archive.ph", "archive.today", "archive.md"];

function parseArgs(argv) {
  const opts = {
    url: "",
    out: "output/browser_use/archive_cdp/single-read.json",
    hosts: DEFAULT_HOSTS,
    silent: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--url" && argv[i + 1]) {
      opts.url = argv[i + 1].trim();
      i += 1;
    } else if (a === "--out" && argv[i + 1]) {
      opts.out = argv[i + 1].trim();
      i += 1;
    } else if (a === "--hosts" && argv[i + 1]) {
      opts.hosts = argv[i + 1]
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      i += 1;
    } else if (a === "--silent") {
      opts.silent = true;
    }
  }
  return opts;
}

function sanitizeUrl(value) {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

async function detectState(page) {
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

    const candidateHeadline =
      document.querySelector("h1")?.textContent?.trim() ||
      document.querySelector("title")?.textContent?.trim() ||
      "Archived article";

    const paragraphs = Array.from(document.querySelectorAll("article p, #CONTENT p, .article p, p"))
      .map((p) => p.textContent?.trim() || "")
      .filter((p) => p.length > 70)
      .slice(0, 16);

    return {
      title,
      blocked,
      notFound,
      candidateHeadline,
      paragraphs,
      finalUrl: window.location.href,
      snippet: combined.slice(0, 420),
    };
  });
}

async function tryHost(page, host, originalUrl) {
  const archiveLookupUrl = `https://${host}/${originalUrl}`;
  await page.goto(archiveLookupUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2200);
  const state = await detectState(page);

  if (state.blocked) {
    return {
      status: "blocked",
      archiveUrl: "none",
      title: state.candidateHeadline || "One more step",
      notes: `Blocked by security check on ${host}`,
      paragraphs: [],
      attemptHost: host,
      snippet: state.snippet,
    };
  }

  if (state.notFound) {
    return {
      status: "not_found",
      archiveUrl: "none",
      title: state.candidateHeadline || "No results",
      notes: `No snapshot found on ${host}`,
      paragraphs: [],
      attemptHost: host,
      snippet: state.snippet,
    };
  }

  return {
    status: "success",
    archiveUrl: state.finalUrl,
    title: state.candidateHeadline,
    notes: `Archive content retrieved from ${host}`,
    paragraphs:
      state.paragraphs.length > 0 ? state.paragraphs : ["Archive loaded but no long paragraph blocks were extracted."],
    attemptHost: host,
    snippet: state.snippet,
  };
}

export async function runArchiveExtract(input = {}) {
  requireApiKey();
  const parsed = parseArgs([]);
  const opts = {
    ...parsed,
    ...input,
    url: sanitizeUrl(input.url || parsed.url || ""),
    hosts: input.hosts || DEFAULT_HOSTS,
  };

  if (!opts.url) {
    throw new Error("Missing URL for archive extraction");
  }

  const outPath = path.resolve(process.cwd(), opts.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  let browser = null;
  let sessionId = null;

  try {
    const session = await createBrowserSession({}, { rotationKey: `archive-extract:${new URL(opts.url).hostname}` });
    sessionId = session.id;
    if (!session.cdpUrl) throw new Error("Browser Use did not return cdpUrl");

    browser = await chromium.connectOverCDP(session.cdpUrl, { timeout: 60000 });
    const context = browser.contexts()[0] ?? (await browser.newContext({ viewport: { width: 1400, height: 900 } }));
    const page = await context.newPage();

    const attempts = [];
    let result = null;
    for (const host of opts.hosts) {
      if (!opts.silent) console.log(`archive host attempt: ${host}`);
      try {
        const attempt = await tryHost(page, host, opts.url);
        attempts.push(attempt);
        if (attempt.status === "success") {
          result = attempt;
          break;
        }
      } catch (error) {
        attempts.push({
          status: "error",
          archiveUrl: "none",
          title: "Attempt failed",
          notes: error instanceof Error ? error.message : "Unknown host attempt error",
          paragraphs: [],
          attemptHost: host,
          snippet: "",
        });
      }
    }

    if (!result) {
      const blocked = attempts.find((a) => a.status === "blocked");
      const notFound = attempts.find((a) => a.status === "not_found");
      result = blocked || notFound || attempts[0] || {
        status: "error",
        archiveUrl: "none",
        title: "Archive retrieval failed",
        notes: "No attempts were recorded",
        paragraphs: [],
      };
    }

    const output = {
      originalUrl: opts.url,
      status: result.status,
      archiveUrl: result.archiveUrl,
      title: result.title,
      notes: result.notes,
      paragraphs: result.paragraphs,
      checkedAt: new Date().toISOString(),
      attempts,
      sessionId,
      sessionRotation: session.rotation || null,
      sessionPayload: session.requestedPayload || {},
      mode: "browser_use_remote_cdp",
    };

    await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    return output;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopBrowserSession(sessionId);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runArchiveExtract(parseArgs(process.argv.slice(2)))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((err) => {
      console.error(err.stack || err.message);
      process.exit(1);
    });
}
