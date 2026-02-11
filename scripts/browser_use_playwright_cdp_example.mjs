#!/usr/bin/env node
/* eslint-disable no-console */
import { chromium } from "playwright-core";

const apiKey = process.env.BROWSER_USE_API_KEY;
if (!apiKey) {
  console.error("error: set BROWSER_USE_API_KEY first");
  process.exit(1);
}

const apiBase = "https://api.browser-use.com/api/v2";

async function req(path, init = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "X-Browser-Use-API-Key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${path}: ${text}`);
  }
  return res.json();
}

async function main() {
  let sessionId = null;
  try {
    const created = await req("/browsers", {
      method: "POST",
      body: JSON.stringify({}),
    });
    sessionId = created.id;
    const cdpUrl = created.cdpUrl;
    if (!cdpUrl) {
      throw new Error("Browser Use did not return cdpUrl");
    }

    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = await context.newPage();

    await page.goto("https://ground.news/my", { waitUntil: "domcontentloaded" });

    const proceed = page.getByRole("button", { name: "Ground News homepage" });
    if (await proceed.isVisible().catch(() => false)) {
      await proceed.click();
    }

    const rejectCookies = page.getByRole("button", { name: "Reject Non-Essential" });
    if (await rejectCookies.isVisible().catch(() => false)) {
      await rejectCookies.click();
    }

    console.log("title:", await page.title());
    console.log("url:", page.url());

    await browser.close();
  } finally {
    if (sessionId) {
      await req(`/browsers/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "stop" }),
      }).catch(() => {});
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
