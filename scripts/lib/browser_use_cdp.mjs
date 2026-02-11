/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";

export const BROWSER_USE_API_BASE = "https://api.browser-use.com/api/v2";
const ROTATION_STATE_DEFAULT = path.join(process.cwd(), "output", "browser_use", "rotation_state.json");

export function requireApiKey() {
  const key = process.env.BROWSER_USE_API_KEY;
  if (!key) {
    throw new Error("BROWSER_USE_API_KEY is not set");
  }
  return key;
}

async function requestJson(path, init = {}) {
  const apiKey = requireApiKey();
  const res = await fetch(`${BROWSER_USE_API_BASE}${path}`, {
    ...init,
    headers: {
      "X-Browser-Use-API-Key": apiKey,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}: ${JSON.stringify(body)}`);
  }
  return body;
}

function parseCsv(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeCountryList(countries) {
  return countries.map((code) => code.toLowerCase());
}

function isLikelyUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sanitizeProfileIds(ids) {
  const valid = [];
  const invalid = [];
  for (const id of ids) {
    if (isLikelyUuid(id)) valid.push(id);
    else invalid.push(id);
  }
  if (invalid.length > 0) {
    console.error(`warning: ignoring ${invalid.length} invalid BROWSER_USE profile id value(s) (must be UUIDs)`);
  }
  return valid;
}

function getRotationMode() {
  const mode = (process.env.BROWSER_USE_ROTATION_MODE || "round_robin").toLowerCase();
  if (mode === "random" || mode === "sticky" || mode === "round_robin") return mode;
  return "round_robin";
}

function getRotationStatePath() {
  return process.env.BROWSER_USE_ROTATION_STATE_FILE || ROTATION_STATE_DEFAULT;
}

async function readRotationState() {
  const statePath = getRotationStatePath();
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      counters: parsed.counters || {},
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { counters: {}, updatedAt: null };
  }
}

async function writeRotationState(state) {
  const statePath = getRotationStatePath();
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify(
      {
        ...state,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function selectFromPool(poolName, values, mode, state, rotationKey) {
  if (values.length === 0) return { value: null, index: -1, source: "none" };
  if (values.length === 1) return { value: values[0], index: 0, source: "single" };

  if (mode === "random") {
    const index = Math.floor(Math.random() * values.length);
    return { value: values[index], index, source: "random" };
  }

  if (mode === "sticky") {
    const key = `${poolName}:${rotationKey || "default"}`;
    const index = hashString(key) % values.length;
    return { value: values[index], index, source: "sticky" };
  }

  const next = Number(state.counters?.[poolName] ?? 0);
  const index = next % values.length;
  state.counters[poolName] = next + 1;
  return { value: values[index], index, source: "round_robin" };
}

export async function getDefaultBrowserSessionPayload(context = {}) {
  const mode = getRotationMode();
  const rotationKey = context.rotationKey || "default";
  const state = await readRotationState();

  const profileCandidates = sanitizeProfileIds(parseCsv(process.env.BROWSER_USE_PROFILE_IDS));
  if (profileCandidates.length === 0 && process.env.BROWSER_USE_PROFILE_ID) {
    profileCandidates.push(...sanitizeProfileIds([process.env.BROWSER_USE_PROFILE_ID]));
  }

  const proxyCandidates = normalizeCountryList(parseCsv(process.env.BROWSER_USE_PROXY_COUNTRY_CODES));
  if (proxyCandidates.length === 0 && process.env.BROWSER_USE_PROXY_COUNTRY_CODE) {
    proxyCandidates.push(process.env.BROWSER_USE_PROXY_COUNTRY_CODE.toLowerCase());
  }

  const profile = selectFromPool("profileId", profileCandidates, mode, state, rotationKey);
  const proxy = selectFromPool("proxyCountryCode", proxyCandidates, mode, state, rotationKey);

  const payload = {};
  if (profile.value) payload.profileId = profile.value;
  if (proxy.value) payload.proxyCountryCode = proxy.value;

  if (process.env.BROWSER_USE_TIMEOUT_MINUTES) {
    const n = Number(process.env.BROWSER_USE_TIMEOUT_MINUTES);
    if (!Number.isNaN(n) && n > 0) payload.timeout = n;
  }

  if (profile.source === "round_robin" || proxy.source === "round_robin") {
    await writeRotationState(state);
  }

  return {
    payload,
    rotation: {
      mode,
      rotationKey,
      profile: {
        selected: profile.value,
        index: profile.index,
        poolSize: profileCandidates.length,
        source: profile.source,
      },
      proxyCountry: {
        selected: proxy.value,
        index: proxy.index,
        poolSize: proxyCandidates.length,
        source: proxy.source,
      },
      stateFile: getRotationStatePath(),
    },
  };
}

export async function createBrowserSession(payload = {}, context = {}) {
  const defaults = await getDefaultBrowserSessionPayload(context);
  const requestPayload = { ...defaults.payload, ...payload };
  const session = await requestJson("/browsers", {
    method: "POST",
    body: JSON.stringify(requestPayload),
  });
  return {
    ...session,
    requestedPayload: requestPayload,
    rotation: defaults.rotation,
  };
}

export async function stopBrowserSession(sessionId) {
  if (!sessionId) return null;
  try {
    return await requestJson(`/browsers/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "stop" }),
    });
  } catch (err) {
    console.error(`warning: failed to stop browser session ${sessionId}: ${err.message}`);
    return null;
  }
}
