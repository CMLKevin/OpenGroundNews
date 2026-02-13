import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_CHECKPOINT_FILE = path.join(process.cwd(), "output", "browser_use", "groundnews_cdp", "checkpoint.json");

export async function readCheckpoint(file = DEFAULT_CHECKPOINT_FILE) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return { index: 0, updatedAt: null };
  }
}

export async function writeCheckpoint(payload, file = DEFAULT_CHECKPOINT_FILE) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify({ ...payload, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}
