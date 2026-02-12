import fs from "node:fs/promises";
import path from "node:path";

// Minimal .env loader for running Node scripts directly.
// Next.js loads .env.local automatically for the app runtime, but plain `node scripts/*.mjs` does not.
// Precedence: shell env > .env.local > .env
//
// This intentionally avoids adding dependencies (dotenv) and keeps parsing conservative.

function parseEnvText(text) {
  const out = {};
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
    const eq = normalized.indexOf("=");
    if (eq <= 0) continue;

    const key = normalized.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = normalized.slice(eq + 1).trim();
    const hashIndex = value.indexOf(" #");
    if (hashIndex >= 0) value = value.slice(0, hashIndex).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }
  return out;
}

async function readEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseEnvText(raw);
  } catch {
    return null;
  }
}

export async function loadScriptEnv(options = {}) {
  const cwd = options.cwd || process.cwd();
  const envPath = path.join(cwd, ".env");
  const envLocalPath = path.join(cwd, ".env.local");

  // Track keys we set from files so .env.local can override .env, without overriding shell-provided env.
  const fileSetKeys = new Set();
  const apply = (vars, allowOverrideOfPreviouslyFileSet) => {
    if (!vars) return;
    for (const [key, value] of Object.entries(vars)) {
      if (process.env[key] == null) {
        process.env[key] = value;
        fileSetKeys.add(key);
        continue;
      }
      if (allowOverrideOfPreviouslyFileSet && fileSetKeys.has(key)) {
        process.env[key] = value;
      }
    }
  };

  apply(await readEnvFile(envPath), false);
  apply(await readEnvFile(envLocalPath), true);
}

// Auto-load once when imported.
if (!process.env.OGN_SCRIPT_ENV_LOADED) {
  process.env.OGN_SCRIPT_ENV_LOADED = "1";
  // Best-effort; failures should not crash scripts.
  await loadScriptEnv().catch(() => {});
}

