import { runGroundNewsIngestion } from "../sync_groundnews_pipeline.mjs";
import { readCheckpoint, writeCheckpoint } from "./checkpoint/index.mjs";
import { validateStoryCandidate } from "./validate/index.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pipelineConfig(options = {}) {
  return {
    maxAttempts: Math.max(1, Number(options.maxAttempts || process.env.OGN_PIPELINE_MAX_ATTEMPTS || 2)),
    retryDelayMs: Math.max(250, Number(options.retryDelayMs || process.env.OGN_PIPELINE_RETRY_DELAY_MS || 2000)),
    checkpointEnabled: options.checkpointEnabled !== false && process.env.OGN_PIPELINE_CHECKPOINT !== "0",
    checkpointFile: options.checkpointFile,
  };
}

function validatePipelineResult(result) {
  if (!result || result.ok !== true) {
    throw new Error("Pipeline run did not return an ok result");
  }
  const totalStories = Number(result.totalStories || 0);
  if (!Number.isFinite(totalStories) || totalStories < 0) {
    throw new Error("Pipeline run returned an invalid totalStories value");
  }
}

export async function runPipeline(options = {}) {
  const cfg = pipelineConfig(options);
  const startedAt = new Date().toISOString();
  const checkpoint = cfg.checkpointEnabled ? await readCheckpoint(cfg.checkpointFile) : null;
  let lastError = null;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt += 1) {
    try {
      const result = await runGroundNewsIngestion(options);
      validatePipelineResult(result);

      // Extra safety: ensure sampled stories in output pass basic shape checks when present.
      if (Array.isArray(result.storiesPreview)) {
        for (const sample of result.storiesPreview.slice(0, 20)) {
          const check = validateStoryCandidate(sample);
          if (!check.ok) throw new Error(`Invalid story candidate in preview: ${check.reason}`);
        }
      }

      if (cfg.checkpointEnabled) {
        await writeCheckpoint(
          {
            index: Number(checkpoint?.index || 0) + 1,
            status: "ok",
            startedAt,
            finishedAt: new Date().toISOString(),
            attempt,
            totalStories: Number(result.totalStories || 0) || 0,
            scrapedLinks: Number(result.scrapedLinks || 0) || 0,
            ingestedStories: Number(result.ingestedStories || 0) || 0,
          },
          cfg.checkpointFile,
        );
      }

      return {
        ...result,
        pipeline: {
          startedAt,
          finishedAt: new Date().toISOString(),
          attempt,
          maxAttempts: cfg.maxAttempts,
          checkpointIndex: Number(checkpoint?.index || 0) + 1,
          checkpointEnabled: cfg.checkpointEnabled,
        },
      };
    } catch (error) {
      lastError = error;
      if (cfg.checkpointEnabled) {
        await writeCheckpoint(
          {
            index: Number(checkpoint?.index || 0),
            status: "error",
            startedAt,
            finishedAt: new Date().toISOString(),
            attempt,
            error: error instanceof Error ? error.message : String(error),
          },
          cfg.checkpointFile,
        );
      }
      if (attempt >= cfg.maxAttempts) break;
      await sleep(cfg.retryDelayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError || "Pipeline failed"));
}
