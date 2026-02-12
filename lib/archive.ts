import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import * as cheerio from "cheerio";
import { ArchiveEntry } from "@/lib/types";
import { getArchiveEntry, setArchiveEntry } from "@/lib/store";

const execFileAsync = promisify(execFile);

async function fallbackExtract(originalUrl: string): Promise<ArchiveEntry> {
  try {
    const res = await fetch(originalUrl, {
      headers: {
        "user-agent": "OpenGroundNewsBot/1.0 (+https://opengroundnews.local)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      throw new Error(`Publisher returned HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      throw new Error("Publisher response was not HTML content");
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $("meta[property='og:title']").attr("content") ||
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      "Article";

    const paras = $("article p, main p, p")
      .toArray()
      .map((el) => $(el).text().trim())
      .filter((p) => p.length > 80)
      .slice(0, 14);

    return {
      originalUrl,
      status: "fallback",
      archiveUrl: "none",
      title,
      notes: "Archive retrieval unavailable; rendered via direct publisher extraction fallback.",
      paragraphs: paras.length > 0 ? paras : ["No extractable long-form paragraph content was found on this source."],
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      originalUrl,
      status: "error",
      archiveUrl: "none",
      title: "Article retrieval failed",
      notes: error instanceof Error ? error.message : "Unknown extraction error",
      paragraphs: ["OpenGroundNews could not retrieve this article at this time."],
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function readArchiveForUrl(originalUrl: string, force = false): Promise<ArchiveEntry> {
  if (!force) {
    const cached = await getArchiveEntry(originalUrl);
    if (cached) return cached;
  }

  const outPath = path.join(process.cwd(), "output", "browser_use", "archive_cdp", "single-read.json");
  const scriptPath = path.join(process.cwd(), "scripts", "archive_extract_cdp.mjs");

  try {
    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "--url", originalUrl, "--out", outPath, "--silent"],
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: 180000,
        maxBuffer: 1024 * 1024 * 3,
      },
    );

    const jsonLine = stdout.trim().split(/\r?\n/).pop() || "{}";
    const parsed = JSON.parse(jsonLine) as ArchiveEntry;
    const finalEntry =
      parsed.status === "blocked" || parsed.status === "not_found"
        ? await fallbackExtract(originalUrl)
        : parsed;
    await setArchiveEntry(originalUrl, finalEntry);
    return finalEntry;
  } catch {
    const fallback = await fallbackExtract(originalUrl);
    await setArchiveEntry(originalUrl, fallback);
    return fallback;
  }
}
