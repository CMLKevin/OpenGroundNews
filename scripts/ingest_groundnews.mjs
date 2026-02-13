#!/usr/bin/env node
/* eslint-disable no-console */
import "./lib/load_env.mjs";
import { runPipeline } from "./pipeline/index.mjs";
import { parseArgs } from "./sync_groundnews_pipeline.mjs";

// Thin wrapper so callers don't depend on the legacy filename.
// The implementation will be progressively modularized under scripts/lib/gn/.

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  runPipeline(options)
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    })
    .catch((err) => {
      console.error(err.stack || err.message);
      process.exit(1);
    });
}
