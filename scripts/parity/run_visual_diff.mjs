#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

function parseArgs(argv) {
  const opts = {
    baselineDir: process.env.PARITY_BASELINE_DIR || "output/playwright/parity_baseline",
    actualDir: process.env.PARITY_ACTUAL_DIR || "",
    outDir: "",
    allowMissingBaseline: process.env.PARITY_ALLOW_MISSING_BASELINE === "1",
    maxMismatchPct: Number(process.env.PARITY_VISUAL_MAX_MISMATCH_PCT || 0.055),
    pixelThreshold: Number(process.env.PARITY_VISUAL_PIXEL_THRESHOLD || 0.12),
    baselineManifestUrl: process.env.PARITY_SCREENSHOT_BASELINE_URL || "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--baseline-dir" && argv[i + 1]) {
      opts.baselineDir = argv[i + 1];
      i += 1;
    } else if (a === "--actual-dir" && argv[i + 1]) {
      opts.actualDir = argv[i + 1];
      i += 1;
    } else if (a === "--out-dir" && argv[i + 1]) {
      opts.outDir = argv[i + 1];
      i += 1;
    } else if (a === "--allow-missing-baseline") {
      opts.allowMissingBaseline = true;
    } else if (a === "--max-mismatch-pct" && argv[i + 1]) {
      opts.maxMismatchPct = Number(argv[i + 1]) || opts.maxMismatchPct;
      i += 1;
    } else if (a === "--pixel-threshold" && argv[i + 1]) {
      opts.pixelThreshold = Number(argv[i + 1]) || opts.pixelThreshold;
      i += 1;
    } else if (a === "--baseline-manifest-url" && argv[i + 1]) {
      opts.baselineManifestUrl = argv[i + 1];
      i += 1;
    }
  }
  return opts;
}

async function readLatestParityRun(baseDir = "output/playwright/parity") {
  const latestPath = path.resolve(process.cwd(), baseDir, "latest.json");
  const raw = await fs.readFile(latestPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed?.runDir) throw new Error(`Invalid latest parity pointer: ${latestPath}`);
  return parsed.runDir;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readPng(filePath) {
  const buffer = await fs.readFile(filePath);
  return PNG.sync.read(buffer);
}

async function materializeRemoteBaseline(manifestUrl, baselineDir) {
  const res = await fetch(manifestUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load baseline manifest: HTTP ${res.status}`);
  const manifest = await res.json();
  const routes = Array.isArray(manifest?.routes) ? manifest.routes : [];
  if (routes.length === 0) throw new Error("Baseline manifest has no routes");

  await ensureDir(baselineDir);
  for (const route of routes) {
    const id = String(route?.id || "").trim();
    const screenshotRaw = String(route?.screenshotUrl || route?.screenshot || "").trim();
    if (!id || !screenshotRaw) continue;
    const screenshotUrl = new URL(screenshotRaw, manifestUrl).toString();
    const imageRes = await fetch(screenshotUrl, { cache: "no-store" });
    if (!imageRes.ok) continue;
    const arrayBuffer = await imageRes.arrayBuffer();
    await fs.writeFile(path.join(baselineDir, `${id}.png`), Buffer.from(arrayBuffer));
  }
}

async function listPngFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".png") && !entry.name.includes(".error."))
    .map((entry) => entry.name)
    .sort();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const actualDir = path.resolve(process.cwd(), opts.actualDir || (await readLatestParityRun()));
  const baselineDir = path.resolve(process.cwd(), opts.baselineDir);
  const outDir = path.resolve(process.cwd(), opts.outDir || path.join(actualDir, "diff"));
  await ensureDir(outDir);

  const baselineExists = await pathExists(baselineDir);
  if (!baselineExists && opts.baselineManifestUrl) {
    await materializeRemoteBaseline(opts.baselineManifestUrl, baselineDir);
  }

  const hasBaselineNow = await pathExists(baselineDir);
  if (!hasBaselineNow) {
    const message = `baseline not found at ${baselineDir}`;
    if (opts.allowMissingBaseline) {
      const report = {
        ok: true,
        skipped: true,
        reason: message,
        generatedAt: new Date().toISOString(),
        actualDir,
        baselineDir,
      };
      await fs.writeFile(path.join(outDir, "visual-diff-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
      console.log(`visual diff skipped: ${message}`);
      return;
    }
    throw new Error(`${message}. Use --allow-missing-baseline to skip.`);
  }

  const actualPng = await listPngFiles(actualDir);
  if (actualPng.length === 0) {
    throw new Error(`No parity screenshots found in ${actualDir}`);
  }

  const results = [];
  let hardFailures = 0;
  let missingBaselineCount = 0;
  for (const fileName of actualPng) {
    const actualPath = path.join(actualDir, fileName);
    const baselinePath = path.join(baselineDir, fileName);
    const baselineFound = await pathExists(baselinePath);
    if (!baselineFound) {
      missingBaselineCount += 1;
      results.push({
        file: fileName,
        status: "missing-baseline",
      });
      continue;
    }

    const [baseline, actual] = await Promise.all([readPng(baselinePath), readPng(actualPath)]);
    if (baseline.width !== actual.width || baseline.height !== actual.height) {
      hardFailures += 1;
      results.push({
        file: fileName,
        status: "dimension-mismatch",
        baseline: { width: baseline.width, height: baseline.height },
        actual: { width: actual.width, height: actual.height },
      });
      continue;
    }

    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const diffPixels = pixelmatch(baseline.data, actual.data, diff.data, baseline.width, baseline.height, {
      threshold: opts.pixelThreshold,
    });
    const totalPixels = baseline.width * baseline.height;
    const mismatchPct = totalPixels > 0 ? diffPixels / totalPixels : 0;
    const pass = mismatchPct <= opts.maxMismatchPct;
    if (!pass) hardFailures += 1;
    const diffPath = path.join(outDir, fileName.replace(/\.png$/, ".diff.png"));
    await fs.writeFile(diffPath, PNG.sync.write(diff));
    results.push({
      file: fileName,
      status: pass ? "ok" : "mismatch",
      mismatchPct: Number(mismatchPct.toFixed(6)),
      diffPixels,
      totalPixels,
      diffPath,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    actualDir,
    baselineDir,
    outDir,
    maxMismatchPct: opts.maxMismatchPct,
    pixelThreshold: opts.pixelThreshold,
    allowMissingBaseline: opts.allowMissingBaseline,
    totals: {
      files: actualPng.length,
      compared: results.filter((r) => r.status === "ok" || r.status === "mismatch").length,
      missingBaseline: missingBaselineCount,
      hardFailures,
    },
    results,
    ok: hardFailures === 0 && (missingBaselineCount === 0 || opts.allowMissingBaseline),
  };
  await fs.writeFile(path.join(outDir, "visual-diff-report.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(
    `visual diff: files=${summary.totals.files} compared=${summary.totals.compared} missing=${summary.totals.missingBaseline} failures=${summary.totals.hardFailures}`,
  );
  if (!summary.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
