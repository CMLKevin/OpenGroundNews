#!/usr/bin/env node
/* eslint-disable no-console */
import "./lib/load_env.mjs";
import { BROWSER_USE_API_BASE, requireApiKey } from "./lib/browser_use_cdp.mjs";

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    pageSize: 100,
    maxPages: 10,
    silent: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--silent") {
      opts.silent = true;
    } else if (arg === "--page-size" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) opts.pageSize = Math.max(1, Math.min(250, Math.round(parsed)));
      i += 1;
    } else if (arg === "--max-pages" && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) opts.maxPages = Math.max(1, Math.min(100, Math.round(parsed)));
      i += 1;
    }
  }
  return opts;
}

async function requestJson(path, init = {}) {
  const apiKey = requireApiKey();
  const res = await fetch(`${BROWSER_USE_API_BASE}${path}`, {
    ...init,
    signal: init.signal || AbortSignal.timeout(45000),
    headers: {
      "X-Browser-Use-API-Key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 4000) };
    }
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}: ${JSON.stringify(body)}`);
  }
  return body;
}

function readItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function listActiveBrowsers(opts) {
  const active = [];
  for (let pageNumber = 1; pageNumber <= opts.maxPages; pageNumber += 1) {
    const payload = await requestJson(`/browsers?pageSize=${opts.pageSize}&pageNumber=${pageNumber}`);
    const items = readItems(payload);
    if (items.length === 0) break;
    for (const item of items) {
      if (String(item?.status || "").toLowerCase() === "active" && item?.id) {
        active.push(item);
      }
    }
    if (items.length < opts.pageSize) break;
  }
  return active;
}

async function stopBrowser(id) {
  await requestJson(`/browsers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "stop" }),
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const active = await listActiveBrowsers(opts);
  if (!opts.silent) {
    console.log(`active browser sessions found: ${active.length}`);
  }

  const stoppedIds = [];
  const failed = [];
  if (!opts.dryRun) {
    for (const browser of active) {
      try {
        await stopBrowser(browser.id);
        stoppedIds.push(browser.id);
        if (!opts.silent) console.log(`stopped ${browser.id}`);
      } catch (error) {
        failed.push({
          id: browser.id,
          error: error instanceof Error ? error.message : String(error),
        });
        if (!opts.silent) console.error(`failed to stop ${browser.id}`);
      }
    }
  }

  const result = {
    ok: failed.length === 0,
    dryRun: opts.dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    activeCount: active.length,
    stoppedCount: stoppedIds.length,
    stoppedIds,
    failures: failed,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (failed.length > 0) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
