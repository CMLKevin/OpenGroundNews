/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";

export const BROWSER_USE_API_BASE = "https://api.browser-use.com/api/v2";
const ROTATION_STATE_DEFAULT = path.join(process.cwd(), "output", "browser_use", "rotation_state.json");
const DEFAULT_SESSION_CREATE_RETRIES = 4;
const DEFAULT_EDITION_PROXY_COUNTRY_MAP = {
  international: ["us", "gb", "ca"],
  us: ["us"],
  uk: ["gb", "ie"],
  canada: ["ca", "us"],
  europe: ["de", "fr", "nl", "be"],
};

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

function parseCsv(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeCountryList(countries) {
  const dedup = new Set();
  const out = [];
  for (const raw of countries || []) {
    const code = String(raw || "").trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(code)) continue;
    if (dedup.has(code)) continue;
    dedup.add(code);
    out.push(code);
  }
  return out;
}

function normalizeEditionKey(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return "";
  if (clean === "international" || clean === "int" || clean === "world") return "international";
  if (clean === "us" || clean === "usa" || clean === "united states") return "us";
  if (clean === "uk" || clean === "gb" || clean === "united kingdom") return "uk";
  if (clean === "canada" || clean === "ca") return "canada";
  if (clean === "europe" || clean === "eu" || clean === "european union") return "europe";
  return "";
}

function dedupeOrdered(values) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    const key = String(value ?? "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function parseEditionProxyCountryMap(raw) {
  if (!raw) return {};
  const input = String(raw).trim();
  if (!input) return {};

  // JSON form: {"us":["us"],"europe":["de","fr"]}
  if (input.startsWith("{")) {
    try {
      const parsed = JSON.parse(input);
      const mapped = {};
      for (const [key, value] of Object.entries(parsed || {})) {
        const edition = normalizeEditionKey(key);
        if (!edition) continue;
        const list = Array.isArray(value) ? value : parseCsv(String(value || ""));
        const normalized = normalizeCountryList(list);
        if (normalized.length > 0) mapped[edition] = normalized;
      }
      return mapped;
    } catch {
      return {};
    }
  }

  // Compact form: us:us;uk:gb;europe:de,fr,nl
  const mapped = {};
  for (const part of input.split(/[;\n]+/)) {
    const [rawEdition, rawCountries] = part.split(":");
    const edition = normalizeEditionKey(rawEdition);
    if (!edition) continue;
    const normalized = normalizeCountryList(parseCsv(rawCountries || ""));
    if (normalized.length > 0) mapped[edition] = normalized;
  }
  return mapped;
}

function editionProxyCandidates(editionKey) {
  const edition = normalizeEditionKey(editionKey);
  if (!edition) return [];
  const fromEnv = parseEditionProxyCountryMap(process.env.BROWSER_USE_EDITION_PROXY_MAP || "");
  const merged = {
    ...DEFAULT_EDITION_PROXY_COUNTRY_MAP,
    ...fromEnv,
  };
  return normalizeCountryList(merged[edition] || []);
}

function parseStatusCodeFromError(error) {
  const message = String(error?.message || "");
  const match = message.match(/\bHTTP\s+(\d{3})\b/i);
  if (!match) return 0;
  const code = Number(match[1]);
  return Number.isFinite(code) ? code : 0;
}

function shouldRetrySessionCreate(error, attempt, maxAttempts) {
  if (attempt >= maxAttempts) return false;
  const status = parseStatusCodeFromError(error);
  if (status === 401 || status === 403) return false;
  return true;
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

function resolveProfileCandidates(context = {}) {
  const explicitIds = sanitizeProfileIds(
    Array.isArray(context.profileIds)
      ? context.profileIds
      : parseCsv(String(context.profileIds || "")),
  );
  const envIds = sanitizeProfileIds(parseCsv(process.env.BROWSER_USE_PROFILE_IDS));
  const fallbackEnvId =
    envIds.length === 0 && process.env.BROWSER_USE_PROFILE_ID
      ? sanitizeProfileIds([process.env.BROWSER_USE_PROFILE_ID])
      : [];
  return dedupeOrdered([...explicitIds, ...envIds, ...fallbackEnvId]);
}

function resolveProxyCandidates(context = {}) {
  const explicitList = normalizeCountryList(
    Array.isArray(context.proxyCountryCodes)
      ? context.proxyCountryCodes
      : parseCsv(String(context.proxyCountryCodes || "")),
  );
  const explicitOne = normalizeCountryList([String(context.proxyCountryCode || "")]);
  const preferred = normalizeCountryList(
    Array.isArray(context.preferredProxyCountryCodes)
      ? context.preferredProxyCountryCodes
      : parseCsv(String(context.preferredProxyCountryCodes || "")),
  );
  const byEdition = editionProxyCandidates(context.edition);
  const envPool = normalizeCountryList(parseCsv(process.env.BROWSER_USE_PROXY_COUNTRY_CODES));
  const envSingle =
    envPool.length === 0 && process.env.BROWSER_USE_PROXY_COUNTRY_CODE
      ? normalizeCountryList([process.env.BROWSER_USE_PROXY_COUNTRY_CODE])
      : [];

  return dedupeOrdered([...explicitOne, ...explicitList, ...preferred, ...byEdition, ...envPool, ...envSingle]);
}

function buildSessionAttemptPayloads(basePayload, payload, profileCandidates, proxyCandidates, maxAttempts) {
  const hasExplicitProfile = Object.prototype.hasOwnProperty.call(payload || {}, "profileId");
  const hasExplicitProxy = Object.prototype.hasOwnProperty.call(payload || {}, "proxyCountryCode");
  const desiredProfiles = hasExplicitProfile
    ? [payload?.profileId || null]
    : dedupeOrdered([basePayload.profileId || null, ...profileCandidates, null]);
  const desiredProxies = hasExplicitProxy
    ? [payload?.proxyCountryCode || null]
    : dedupeOrdered([basePayload.proxyCountryCode || null, ...proxyCandidates, null]);

  const attempts = [];
  const seen = new Set();

  const pushAttempt = (profileId, proxyCountryCode, strategy) => {
    const next = { ...basePayload, ...payload };
    if (profileId) next.profileId = profileId;
    else delete next.profileId;
    if (proxyCountryCode) next.proxyCountryCode = proxyCountryCode;
    else delete next.proxyCountryCode;
    const key = JSON.stringify(next);
    if (seen.has(key)) return;
    seen.add(key);
    attempts.push({ payload: next, strategy, profileId: profileId || null, proxyCountryCode: proxyCountryCode || null });
  };

  pushAttempt(basePayload.profileId || null, basePayload.proxyCountryCode || null, "base");

  for (const profileId of desiredProfiles) {
    for (const proxyCountryCode of desiredProxies) {
      pushAttempt(profileId, proxyCountryCode, "matrix");
      if (attempts.length >= maxAttempts) return attempts;
    }
  }

  if (!hasExplicitProxy) {
    pushAttempt(basePayload.profileId || null, null, "proxy-disabled");
  }
  if (!hasExplicitProfile) {
    pushAttempt(null, basePayload.proxyCountryCode || null, "profile-disabled");
  }
  if (!hasExplicitProfile && !hasExplicitProxy) {
    pushAttempt(null, null, "bare-minimum");
  }

  return attempts.slice(0, maxAttempts);
}

export async function getDefaultBrowserSessionPayload(context = {}) {
  const mode = getRotationMode();
  const rotationKey = context.rotationKey || "default";
  const state = await readRotationState();

  const profileCandidates = resolveProfileCandidates(context);
  const proxyCandidates = resolveProxyCandidates(context);

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
  const basePayload = { ...defaults.payload, ...payload };

  const retryCap = Number(process.env.BROWSER_USE_CREATE_RETRIES || DEFAULT_SESSION_CREATE_RETRIES);
  const maxAttempts = Number.isFinite(retryCap) && retryCap > 0 ? Math.max(1, Math.round(retryCap)) : DEFAULT_SESSION_CREATE_RETRIES;
  const profileCandidates = resolveProfileCandidates(context);
  const proxyCandidates = resolveProxyCandidates(context);
  const attemptPayloads = buildSessionAttemptPayloads(basePayload, payload, profileCandidates, proxyCandidates, maxAttempts);

  let lastError = null;
  for (let i = 0; i < attemptPayloads.length; i += 1) {
    const attemptNumber = i + 1;
    const attempt = attemptPayloads[i];
    try {
      const session = await requestJson("/browsers", {
        method: "POST",
        body: JSON.stringify(attempt.payload),
      });
      return {
        ...session,
        requestedPayload: attempt.payload,
        rotation: {
          ...defaults.rotation,
          attempt: attemptNumber,
          attemptsPlanned: attemptPayloads.length,
          strategy: attempt.strategy,
          profile: {
            ...(defaults.rotation?.profile || {}),
            selected: attempt.profileId,
            source: attemptNumber === 1 ? defaults.rotation?.profile?.source : `retry:${attempt.strategy}`,
          },
          proxyCountry: {
            ...(defaults.rotation?.proxyCountry || {}),
            selected: attempt.proxyCountryCode,
            source: attemptNumber === 1 ? defaults.rotation?.proxyCountry?.source : `retry:${attempt.strategy}`,
          },
        },
      };
    } catch (error) {
      lastError = error;
      if (!shouldRetrySessionCreate(error, attemptNumber, attemptPayloads.length)) {
        throw error;
      }
      if (process.env.BROWSER_USE_VERBOSE_RETRIES === "1") {
        const status = parseStatusCodeFromError(error);
        console.warn(
          `warning: browser session create retry ${attemptNumber}/${attemptPayloads.length} failed` +
            (status ? ` (HTTP ${status})` : "") +
            `; strategy=${attempt.strategy}, profile=${attempt.profileId || "none"}, proxy=${attempt.proxyCountryCode || "none"}`,
        );
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to create browser session");
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
