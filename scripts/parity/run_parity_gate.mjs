#!/usr/bin/env node
/* eslint-disable no-console */
import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    smokeOutDir: "output/playwright/parity",
    baselineDir: process.env.PARITY_BASELINE_DIR || "output/playwright/parity_baseline",
    allowMissingBaseline: process.env.PARITY_ALLOW_MISSING_BASELINE === "1",
    maxMismatchPct: process.env.PARITY_VISUAL_MAX_MISMATCH_PCT || "0.055",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--base-url" && argv[i + 1]) {
      opts.baseUrl = argv[i + 1];
      i += 1;
    } else if (a === "--smoke-out-dir" && argv[i + 1]) {
      opts.smokeOutDir = argv[i + 1];
      i += 1;
    } else if (a === "--baseline-dir" && argv[i + 1]) {
      opts.baselineDir = argv[i + 1];
      i += 1;
    } else if (a === "--allow-missing-baseline") {
      opts.allowMissingBaseline = true;
    } else if (a === "--max-mismatch-pct" && argv[i + 1]) {
      opts.maxMismatchPct = argv[i + 1];
      i += 1;
    }
  }
  return opts;
}

function runNodeScript(scriptPath, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      env: { ...process.env, ...env },
      cwd: process.cwd(),
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptPath)} failed with exit code ${code}`));
    });
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const smokeScript = path.resolve(process.cwd(), "scripts/parity/run_parity_smoke.mjs");
  const visualScript = path.resolve(process.cwd(), "scripts/parity/run_visual_diff.mjs");
  const latestPath = path.resolve(process.cwd(), opts.smokeOutDir, "latest.json");

  await runNodeScript(smokeScript, ["--base-url", opts.baseUrl, "--out-dir", opts.smokeOutDir]);
  const latestRaw = await fs.readFile(latestPath, "utf8");
  const latest = JSON.parse(latestRaw);
  if (!latest?.runDir) throw new Error(`Smoke run did not produce latest pointer at ${latestPath}`);

  const visualArgs = [
    "--baseline-dir",
    opts.baselineDir,
    "--actual-dir",
    latest.runDir,
    "--max-mismatch-pct",
    opts.maxMismatchPct,
  ];
  if (opts.allowMissingBaseline) {
    visualArgs.push("--allow-missing-baseline");
  }
  await runNodeScript(visualScript, visualArgs);

  console.log(`parity gate passed: smoke + visual diff (${latest.runDir})`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
