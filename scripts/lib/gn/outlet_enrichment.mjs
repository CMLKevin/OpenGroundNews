/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const DEFAULT_CATALOG_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_HTTP_TIMEOUT_MS = 12000;
const SERGIO_CATALOG_URL =
  "https://huggingface.co/datasets/sergioburdisso/news_media_bias_and_factuality/resolve/main/data.csv";
const ALLSIDES_CATALOG_URL =
  "https://huggingface.co/datasets/CreatingisLIfe/PoliticalBias/resolve/main/allsides_data.csv";

const PROFILE_OWNERSHIP_LOCK_PATTERNS = [
  /upgrade\s+to\s+(?:premium|vantage)/i,
  /to\s+view\s+ownership\s+data/i,
  /ownership\s+data\s+please\s+upgrade/i,
  /locked/i,
];

const OWNERSHIP_CATEGORY_KEYWORDS = [
  {
    category: "Government",
    patterns: [
      /\bgovernment\b/i,
      /\bstate\b/i,
      /\bpublic\s+broadcaster\b/i,
      /\bministry\b/i,
      /\bdepartment\b/i,
      /\bnational\s+government\b/i,
      /\bfederal\b/i,
      /\bcrown\s+corporation\b/i,
    ],
  },
  {
    category: "Telecom",
    patterns: [
      /\btelecom\b/i,
      /\bcomcast\b/i,
      /\bverizon\b/i,
      /\bat&t\b/i,
      /\btelefonica\b/i,
      /\bvodafone\b/i,
      /\btelstra\b/i,
      /\bdeutsche\s+telekom\b/i,
      /\bbell\s+media\b/i,
      /\brogers\b/i,
    ],
  },
  {
    category: "Private Equity",
    patterns: [
      /\bprivate\s+equity\b/i,
      /\bcapital\s+partners\b/i,
      /\bmanagement\b/i,
      /\bholdings\b/i,
      /\balden\b/i,
      /\bchatham\b/i,
      /\bkkr\b/i,
      /\bblackstone\b/i,
      /\bapollo\b/i,
      /\bthoma\b/i,
      /\bcarlyle\b/i,
    ],
  },
  {
    category: "Media Conglomerates",
    patterns: [
      /\bnews\s+corp\b/i,
      /\bfox\s+corporation\b/i,
      /\bparamount\b/i,
      /\bwarner\b/i,
      /\bdisney\b/i,
      /\baxel\s+springer\b/i,
      /\bthomson\s+reuters\b/i,
      /\bnikkei\b/i,
      /\bgannett\b/i,
      /\bhearst\b/i,
      /\bnexstar\b/i,
      /\bsinclair\b/i,
      /\bmcclatchy\b/i,
      /\bnew\s+york\s+times\s+company\b/i,
      /\bmedia\s+group\b/i,
      /\bmedia\s+network\b/i,
      /\bmedia\s+conglomerate\b/i,
    ],
  },
  {
    category: "Individual",
    patterns: [
      /\bowned\s+by\s+[A-Z][a-z]+\s+[A-Z][a-z]+/,
      /\bfamily\b/i,
      /\bindividual\b/i,
      /\bjeff\s+bezos\b/i,
      /\bpatrick\s+soon\b/i,
      /\brupert\s+murdoch\b/i,
    ],
  },
  {
    category: "Independent",
    patterns: [
      /\bindependent\b/i,
      /\bnonprofit\b/i,
      /\bnot-?for-?profit\b/i,
      /\bcooperative\b/i,
      /\btrust\b/i,
      /\bfoundation\b/i,
      /\bpublic\s+media\b/i,
    ],
  },
];

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHost(value) {
  return normalizeText(value).toLowerCase().replace(/^www\./, "");
}

function hostFromUrl(raw) {
  try {
    return normalizeHost(new URL(String(raw || "")).hostname || "");
  } catch {
    const clean = normalizeText(raw)
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*/, "");
    return normalizeHost(clean);
  }
}

function rootDomain(host) {
  const clean = normalizeHost(host);
  if (!clean) return "";
  const parts = clean.split(".").filter(Boolean);
  if (parts.length <= 2) return clean;
  return parts.slice(-2).join(".");
}

function normalizeNameKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }

  out.push(cur);
  return out.map((v) => normalizeText(v));
}

function parseCsv(raw) {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    for (let c = 0; c < header.length; c += 1) {
      row[header[c]] = cols[c] || "";
    }
    rows.push(row);
  }
  return rows;
}

function biasRatingFromLabel(value) {
  const text = normalizeText(value).toLowerCase().replace(/[_\s]+/g, "-");
  if (!text) return "unknown";
  if (text.includes("far-left")) return "far-left";
  if (text.includes("far-right")) return "far-right";
  if (text.includes("lean-left") || text.includes("left-center") || text.includes("center-left")) return "lean-left";
  if (text.includes("lean-right") || text.includes("right-center") || text.includes("center-right")) return "lean-right";
  if (/(^|-)left($|-)/.test(text)) return "left";
  if (/(^|-)right($|-)/.test(text)) return "right";
  if (text.includes("neutral") || text.includes("center") || text.includes("centre")) return "center";
  return "unknown";
}

function bias3FromRating(rating) {
  if (rating === "far-left" || rating === "left" || rating === "lean-left") return "left";
  if (rating === "center") return "center";
  if (rating === "lean-right" || rating === "right" || rating === "far-right") return "right";
  return "unknown";
}

function factualityFromLabel(value) {
  const text = normalizeText(value).toLowerCase().replace(/[_\s]+/g, "-");
  if (!text) return "unknown";
  if (text.includes("very-high")) return "very-high";
  if (text === "high") return "high";
  if (text.includes("mixed")) return "mixed";
  if (text.includes("very-low")) return "very-low";
  if (text === "low") return "low";
  return "unknown";
}

function isUnknownBias(value) {
  return !value || String(value) === "unknown";
}

function isUnknownFactuality(value) {
  return !value || String(value) === "unknown";
}

function isUnknownOwnership(value) {
  const clean = normalizeText(value).toLowerCase();
  return !clean || clean === "unlabeled" || clean === "unknown" || clean === "n/a";
}

function inferOwnershipCategory({ ownership, ownerName, outletName, websiteHost }) {
  const joined = `${normalizeText(ownership)} ${normalizeText(ownerName)} ${normalizeText(outletName)} ${normalizeText(websiteHost)}`.trim();
  if (!joined) return "";

  if (websiteHost.endsWith(".gov") || websiteHost.endsWith(".mil") || /\bbbc\b/.test(websiteHost)) {
    return "Government";
  }

  for (const group of OWNERSHIP_CATEGORY_KEYWORDS) {
    if (group.patterns.some((pattern) => pattern.test(joined))) return group.category;
  }

  if (/\binc\b|\bcorp\b|\bcompany\b|\bplc\b|\bltd\b/i.test(joined)) return "Corporation";
  return "";
}

function dedupe(values) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const clean = normalizeText(value);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function maybeExternalUrl(value) {
  const clean = normalizeText(value);
  if (!clean) return "";
  try {
    const parsed = new URL(clean);
    if (!/^https?:$/i.test(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function toGroundProfileUrl(source) {
  const direct = maybeExternalUrl(source.groundNewsUrl || source.outletProfileUrl || "");
  if (direct && /(^|\.)ground\.news$/i.test(new URL(direct).hostname)) return direct;

  const slug = normalizeText(source.groundNewsSourceSlug || source.sourceInfoSlug || "");
  if (slug) return `https://ground.news/interest/${encodeURIComponent(slug)}`;
  return "";
}

async function readFreshCache(cachePath, ttlMs) {
  try {
    const stat = await fs.stat(cachePath);
    if (Date.now() - stat.mtimeMs > ttlMs) return "";
    return await fs.readFile(cachePath, "utf8");
  } catch {
    return "";
  }
}

async function writeCache(cachePath, value) {
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, value, "utf8");
}

async function fetchText(url, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "user-agent": "OpenGroundNewsCrawler/2.0",
      accept: "text/html,application/xhtml+xml,application/json,text/plain,*/*",
      referer: "https://ground.news/",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

async function loadCatalogDataset({
  url,
  cachePath,
  ttlMs = DEFAULT_CATALOG_TTL_MS,
  timeoutMs = DEFAULT_HTTP_TIMEOUT_MS,
}) {
  const cached = await readFreshCache(cachePath, ttlMs);
  if (cached) return cached;
  const raw = await fetchText(url, timeoutMs);
  await writeCache(cachePath, raw).catch(() => {});
  return raw;
}

function createCatalogRecord(base = {}) {
  return {
    source: base.source || "",
    host: normalizeHost(base.host || ""),
    rootHost: normalizeHost(base.rootHost || ""),
    outletName: normalizeText(base.outletName || ""),
    biasRating: biasRatingFromLabel(base.biasRating || ""),
    bias: base.bias || "unknown",
    factuality: factualityFromLabel(base.factuality || ""),
  };
}

async function loadPublicCatalog(cacheRoot) {
  const catalogDir = path.join(cacheRoot, "outlet_catalog");
  const [sergioCsv, allsidesCsv] = await Promise.all([
    loadCatalogDataset({
      url: SERGIO_CATALOG_URL,
      cachePath: path.join(catalogDir, "sergio_bias_factuality.csv"),
    }).catch(() => ""),
    loadCatalogDataset({
      url: ALLSIDES_CATALOG_URL,
      cachePath: path.join(catalogDir, "allsides_bias.csv"),
    }).catch(() => ""),
  ]);

  const byHost = new Map();
  const byRootHost = new Map();
  const byName = new Map();

  const setIfStronger = (map, key, candidate) => {
    if (!key) return;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, candidate);
      return;
    }

    // Prefer records with both bias + factuality, then any factuality, then any bias.
    const strength = (row) =>
      (row.factuality && row.factuality !== "unknown" ? 2 : 0) +
      (row.biasRating && row.biasRating !== "unknown" ? 1 : 0);

    if (strength(candidate) > strength(existing)) {
      map.set(key, candidate);
    }
  };

  if (sergioCsv) {
    for (const row of parseCsv(sergioCsv)) {
      const host = normalizeHost(row.source || row.domain || "");
      if (!host) continue;
      const record = createCatalogRecord({
        source: "sergioburdisso",
        host,
        rootHost: rootDomain(host),
        outletName: row.source || "",
        biasRating: row.bias,
        factuality: row.factual_reporting,
      });
      record.bias = bias3FromRating(record.biasRating);
      setIfStronger(byHost, record.host, record);
      setIfStronger(byRootHost, record.rootHost, record);
      const nameKey = normalizeNameKey(record.outletName.replace(/\.[a-z]{2,}$/i, ""));
      setIfStronger(byName, nameKey, record);
    }
  }

  if (allsidesCsv) {
    for (const row of parseCsv(allsidesCsv)) {
      const name = normalizeText(row.news_source || row.source || "");
      const rating = biasRatingFromLabel(row.rating || "");
      if (!name || rating === "unknown") continue;
      const key = normalizeNameKey(name);
      const existing = byName.get(key);
      if (existing && existing.biasRating && existing.biasRating !== "unknown") continue;
      byName.set(key, {
        source: "allsides",
        host: "",
        rootHost: "",
        outletName: name,
        biasRating: rating,
        bias: bias3FromRating(rating),
        factuality: "unknown",
      });
    }
  }

  return { byHost, byRootHost, byName };
}

function parseGroundProfileMetadata(html, profileUrl) {
  const $ = cheerio.load(html);
  const pageText = normalizeText($("body").text() || "");

  const biasMatch =
    pageText.match(/(?:average\s+)?bias(?:\s+rating)?\s*:\s*(far\s+left|left|lean\s+left|center|lean\s+right|right|far\s+right)\b/i) ||
    pageText.match(/assigned\s+(?:a\s+)?(far\s+left|left|lean\s+left|center|lean\s+right|right|far\s+right)\s+bias/i);

  const factualityMatch =
    pageText.match(/factuality(?:\s+score|\s+rating)?\s*:\s*(very\s+high|high|mixed|low|very\s+low)\b/i) ||
    pageText.match(/assigned\s+(?:a\s+)?(very\s+high|high|mixed|low|very\s+low)\s+factuality/i);

  const ownershipMatch =
    pageText.match(/ownership(?:\s+category|\s+categories)?\s*:\s*([A-Za-z][A-Za-z\s&/,.'-]{2,120})/i) ||
    pageText.match(/this\s+source\s+is\s+(independent|government|private\s+equity|media\s+conglomerate|corporation|telecom)\b/i);

  let ownership = normalizeText(ownershipMatch?.[1] || "");
  if (ownership && PROFILE_OWNERSHIP_LOCK_PATTERNS.some((pattern) => pattern.test(ownership))) {
    ownership = "";
  }

  let outletName =
    normalizeText($("h1").first().text() || "") ||
    normalizeText($("meta[property='og:title']").attr("content") || "").replace(/\s*\|.*$/, "");

  const externalLinks = $("a[href]")
    .toArray()
    .map((node) => normalizeText($(node).attr("href") || ""))
    .map((href) => {
      try {
        return new URL(href, profileUrl).toString();
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .filter((href) => {
      try {
        const host = normalizeHost(new URL(href).hostname);
        if (!host) return false;
        if (host.endsWith("ground.news")) return false;
        if (/wikipedia|twitter|x\.com|facebook|instagram|youtube|linkedin|tiktok/.test(host)) return false;
        return true;
      } catch {
        return false;
      }
    });

  let websiteUrl = externalLinks[0] || "";

  let logoUrl = "";
  const ogImage = maybeExternalUrl($("meta[property='og:image']").attr("content") || "");
  if (ogImage && !/ground\.news\/images\//i.test(ogImage)) logoUrl = ogImage;

  const scripts = $("script[type='application/ld+json']")
    .toArray()
    .map((node) => normalizeText($(node).html() || ""))
    .filter(Boolean);

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const possibleName = normalizeText(item.name || item.alternateName || "");
        if (!outletName && possibleName) outletName = possibleName;

        const candidateWebsite = maybeExternalUrl(item.url || item.sameAs || "");
        if (!websiteUrl && candidateWebsite && !/ground\.news/i.test(candidateWebsite)) {
          websiteUrl = candidateWebsite;
        }

        const logo = item.logo;
        const logoCandidate =
          typeof logo === "string"
            ? maybeExternalUrl(logo)
            : logo && typeof logo === "object"
              ? maybeExternalUrl(logo.url || logo.contentUrl || "")
              : "";
        if (!logoUrl && logoCandidate && !/ground\.news\/images\//i.test(logoCandidate)) {
          logoUrl = logoCandidate;
        }
      }
    } catch {
      // ignore malformed json
    }
  }

  const biasRating = biasRatingFromLabel((biasMatch?.[1] || "").replace(/\s+/g, "-"));
  const factuality = factualityFromLabel((factualityMatch?.[1] || "").replace(/\s+/g, "-"));

  return {
    source: "ground-profile",
    groundNewsUrl: profileUrl,
    outletName,
    websiteUrl,
    logoUrl,
    biasRating,
    bias: bias3FromRating(biasRating),
    factuality,
    ownership,
    ownershipCategory: inferOwnershipCategory({
      ownership,
      ownerName: ownership,
      outletName,
      websiteHost: hostFromUrl(websiteUrl),
    }),
  };
}

function wikidataClaimIds(entity, property) {
  const claims = entity?.claims?.[property] || [];
  const ids = [];
  for (const claim of claims) {
    const id = claim?.mainsnak?.datavalue?.value?.id;
    if (id) ids.push(String(id));
  }
  return dedupe(ids);
}

function wikidataClaimString(entity, property) {
  const claims = entity?.claims?.[property] || [];
  for (const claim of claims) {
    const value = claim?.mainsnak?.datavalue?.value;
    if (typeof value === "string") return value;
  }
  return "";
}

function wikidataInceptionYear(entity) {
  const claims = entity?.claims?.P571 || [];
  for (const claim of claims) {
    const time = claim?.mainsnak?.datavalue?.value?.time;
    if (!time) continue;
    const yearMatch = String(time).match(/([+-]?\d{4})/);
    if (!yearMatch) continue;
    const year = Number(yearMatch[1]);
    if (Number.isFinite(year) && year >= 1600 && year <= new Date().getFullYear()) return year;
  }
  return undefined;
}

function wikidataWebsiteHosts(entity) {
  const claims = entity?.claims?.P856 || [];
  const hosts = [];
  for (const claim of claims) {
    const url = claim?.mainsnak?.datavalue?.value;
    if (!url || typeof url !== "string") continue;
    hosts.push(hostFromUrl(url));
  }
  return dedupe(hosts.filter(Boolean));
}

async function fetchWikidataLabels(ids, timeoutMs) {
  if (!ids.length) return new Map();
  const query = ids.join("|");
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(
    query,
  )}&format=json&languages=en&props=labels`;
  const raw = await fetchText(url, timeoutMs);
  const parsed = JSON.parse(raw);
  const out = new Map();
  for (const id of ids) {
    const label = normalizeText(parsed?.entities?.[id]?.labels?.en?.value || "");
    if (label) out.set(id, label);
  }
  return out;
}

async function lookupWikidataOutletMetadata({ outletName, host }, options) {
  const timeoutMs = options.timeoutMs || DEFAULT_HTTP_TIMEOUT_MS;
  const targetHost = normalizeHost(host);
  const targetRoot = rootDomain(targetHost);
  const targetName = normalizeNameKey(outletName || "");
  const rootToken = normalizeText(
    (targetRoot || "").replace(/\.[a-z]{2,}$/i, "").replace(/[-_]+/g, " ").replace(/\b(news|media|online)\b/gi, " "),
  );
  const nameToken = normalizeText(
    normalizeText(outletName || "")
      .replace(/\.(com|org|net|co|tv|io|news)\b/gi, "")
      .replace(/\b(news|newspaper|media|online)\b/gi, " "),
  );
  const searchQueries = dedupe([nameToken, rootToken, normalizeText(targetHost || "").split(".")[0] || ""]).slice(0, 3);
  if (searchQueries.length === 0) return null;

  const candidates = [];
  const seenCandidateIds = new Set();
  for (const query of searchQueries) {
    if (!query) continue;
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=8&search=${encodeURIComponent(
      query,
    )}`;
    const searchRaw = await fetchText(searchUrl, timeoutMs).catch(() => "");
    if (!searchRaw) continue;
    let searchData = null;
    try {
      searchData = JSON.parse(searchRaw);
    } catch {
      searchData = null;
    }
    const items = Array.isArray(searchData?.search) ? searchData.search : [];
    for (const item of items) {
      const id = normalizeText(item?.id || "");
      if (!id || seenCandidateIds.has(id)) continue;
      seenCandidateIds.add(id);
      candidates.push(item);
      if (candidates.length >= 18) break;
    }
    if (candidates.length >= 18) break;
  }
  if (candidates.length === 0) return null;

  let best = null;

  for (const candidate of candidates.slice(0, 12)) {
    const id = normalizeText(candidate.id || "");
    if (!id) continue;
    const entityRaw = await fetchText(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, timeoutMs).catch(() => "");
    if (!entityRaw) continue;

    let entity;
    try {
      entity = JSON.parse(entityRaw)?.entities?.[id];
    } catch {
      entity = null;
    }
    if (!entity) continue;

    const description = normalizeText(candidate.description || "").toLowerCase();
    const label = normalizeText(candidate.label || candidate.display?.label?.value || "");
    const websiteHosts = wikidataWebsiteHosts(entity);
    const hasExactHostMatch = targetHost && websiteHosts.includes(targetHost);
    const hasRootHostMatch = targetRoot && websiteHosts.some((h) => rootDomain(h) === targetRoot);
    const hasHostMatch = Boolean(hasExactHostMatch || hasRootHostMatch);
    const mediaDescription = Boolean(
      description && /news|newspaper|journal|magazine|media|broadcaster|television|radio|press|wire service/.test(description),
    );
    const labelKey = normalizeNameKey(label);
    const nameClose = Boolean(targetName && (labelKey === targetName || labelKey.includes(targetName) || targetName.includes(labelKey)));

    let score = 0;
    if (mediaDescription) score += 4;
    if (nameClose) score += 5;
    if (hasExactHostMatch) score += 18;
    if (!hasExactHostMatch && hasRootHostMatch) score += 13;
    if (!targetHost && labelKey === targetName) score += 2;
    if (targetHost && !hasHostMatch && !nameClose) score -= 10;
    if (!mediaDescription && !hasHostMatch) score -= 6;

    const ownerIds = wikidataClaimIds(entity, "P127");
    if (ownerIds.length > 0) score += 1;

    // Guardrail: avoid spurious matches unless we have host evidence or strong media-name match.
    if (!hasHostMatch && !(mediaDescription && nameClose)) continue;

    if (!best || score > best.score) {
      best = { id, score, candidate, entity, websiteHosts };
    }
  }

  if (!best || best.score < 7) return null;

  const entity = best.entity;
  const ownerIds = wikidataClaimIds(entity, "P127");
  const countryIds = wikidataClaimIds(entity, "P17");
  const idsToResolve = dedupe([...ownerIds, ...countryIds]);
  const labels = await fetchWikidataLabels(idsToResolve, timeoutMs).catch(() => new Map());

  const ownerLabels = ownerIds.map((id) => labels.get(id)).filter(Boolean);
  const countryLabels = countryIds.map((id) => labels.get(id)).filter(Boolean);

  const ownership = ownerLabels.slice(0, 3).join(" > ");
  const websiteUrlClaim = maybeExternalUrl(wikidataClaimString(entity, "P856"));
  const logoFile = wikidataClaimString(entity, "P154");
  const logoUrl = logoFile
    ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(logoFile)}`
    : "";

  const ownershipCategory = inferOwnershipCategory({
    ownership,
    ownerName: ownerLabels[0] || "",
    outletName,
    websiteHost: targetHost,
  });

  return {
    source: "wikidata",
    ownership,
    ownershipCategory,
    country: countryLabels[0] || "",
    foundedYear: wikidataInceptionYear(entity),
    websiteUrl: websiteUrlClaim || "",
    logoUrl,
  };
}

function mergeSource(base, incoming) {
  const out = { ...base };
  if (!incoming || typeof incoming !== "object") return out;

  const incomingBiasRating = biasRatingFromLabel(incoming.biasRating || "");
  const incomingBias = incoming.bias && incoming.bias !== "unknown" ? incoming.bias : bias3FromRating(incomingBiasRating);
  const incomingFactuality = factualityFromLabel(incoming.factuality || "");
  const incomingOwnership = normalizeText(incoming.ownership || "");

  if (isUnknownBias(out.biasRating) && incomingBiasRating !== "unknown") out.biasRating = incomingBiasRating;
  if (isUnknownBias(out.bias) && incomingBias && incomingBias !== "unknown") out.bias = incomingBias;
  if (isUnknownFactuality(out.factuality) && incomingFactuality !== "unknown") out.factuality = incomingFactuality;

  if (isUnknownOwnership(out.ownership) && incomingOwnership) out.ownership = incomingOwnership;

  const incomingWebsite = maybeExternalUrl(incoming.websiteUrl || "");
  if (!normalizeText(out.websiteUrl) && incomingWebsite) out.websiteUrl = incomingWebsite;

  const incomingGroundUrl = maybeExternalUrl(incoming.groundNewsUrl || incoming.outletProfileUrl || "");
  if (!normalizeText(out.groundNewsUrl) && incomingGroundUrl) out.groundNewsUrl = incomingGroundUrl;

  const incomingCountry = normalizeText(incoming.country || "");
  if (!normalizeText(out.country) && incomingCountry) out.country = incomingCountry;

  const year = Number(incoming.foundedYear);
  if (!Number.isFinite(Number(out.foundedYear)) && Number.isFinite(year) && year >= 1600 && year <= new Date().getFullYear()) {
    out.foundedYear = Math.round(year);
  }

  const incomingDescription = normalizeText(incoming.description || "");
  if (!normalizeText(out.description) && incomingDescription) out.description = incomingDescription;

  const incomingLogo = maybeExternalUrl(incoming.logoUrl || "");
  if (!normalizeText(out.logoUrl) && incomingLogo) out.logoUrl = incomingLogo;

  const ownershipCategory = normalizeText(incoming.ownershipCategory || "");
  if (ownershipCategory && isUnknownOwnership(out.ownership)) {
    out.ownership = ownershipCategory;
  } else if (ownershipCategory && out.ownership && !new RegExp(`\\b${ownershipCategory}\\b`, "i").test(out.ownership)) {
    out.ownership = `${out.ownership} (${ownershipCategory})`;
  }

  return out;
}

function buildLogoFallback(source) {
  const candidates = [];
  const websiteHost = normalizeHost(hostFromUrl(source.websiteUrl || ""));
  const sourceHost = normalizeHost(hostFromUrl(source.url || ""));
  const host = websiteHost || sourceHost;
  if (!host) return "";

  candidates.push(`https://www.google.com/s2/favicons?domain=${host}&sz=128`);
  candidates.push(`https://logo.clearbit.com/${host}`);
  candidates.push(`https://${host}/favicon.ico`);

  return candidates[0] || "";
}

function findCatalogRecord(source, catalog) {
  const host = normalizeHost(hostFromUrl(source.websiteUrl || source.url || ""));
  const root = rootDomain(host);
  const outletKey = normalizeNameKey(source.outlet || "");

  if (host && catalog.byHost.has(host)) return catalog.byHost.get(host);
  if (root && catalog.byRootHost.has(root)) return catalog.byRootHost.get(root);

  if (outletKey && catalog.byName.has(outletKey)) return catalog.byName.get(outletKey);

  return null;
}

export function createOutletEnricher(options = {}) {
  const enabled = options.enabled !== false;
  const cacheRoot = options.cacheRoot || path.join(process.cwd(), "output", "cache");
  const timeoutMs = Number(options.timeoutMs || DEFAULT_HTTP_TIMEOUT_MS);
  const silent = Boolean(options.silent);

  let publicCatalogPromise = null;
  const profileCache = new Map();
  const wikidataCache = new Map();

  const getCatalog = async () => {
    if (!publicCatalogPromise) {
      publicCatalogPromise = loadPublicCatalog(cacheRoot).catch((error) => {
        if (!silent) console.warn(`[outlet-enrich] public catalog unavailable: ${error?.message || error}`);
        return { byHost: new Map(), byRootHost: new Map(), byName: new Map() };
      });
    }
    return publicCatalogPromise;
  };

  const resolveGroundProfile = async (source) => {
    const profileUrl = toGroundProfileUrl(source);
    if (!profileUrl) return null;
    const cacheKey = profileUrl;
    if (profileCache.has(cacheKey)) return profileCache.get(cacheKey);

    const task = (async () => {
      try {
        const html = await fetchText(profileUrl, timeoutMs);
        return parseGroundProfileMetadata(html, profileUrl);
      } catch {
        return null;
      }
    })();

    profileCache.set(cacheKey, task);
    return task;
  };

  const resolveWikidata = async (source) => {
    const host = normalizeHost(hostFromUrl(source.websiteUrl || source.url || ""));
    const name = normalizeText(source.outlet || "");
    const cacheKey = `${host}|${name.toLowerCase()}`;
    if (wikidataCache.has(cacheKey)) return wikidataCache.get(cacheKey);

    const task = lookupWikidataOutletMetadata({ outletName: name, host }, { timeoutMs }).catch(() => null);
    wikidataCache.set(cacheKey, task);
    return task;
  };

  return {
    async enrich(source) {
      if (!enabled || !source || typeof source !== "object") return source;

      let enriched = { ...source };

      const catalog = await getCatalog();
      const catalogRecord = findCatalogRecord(enriched, catalog);
      if (catalogRecord) {
        enriched = mergeSource(enriched, catalogRecord);
      }

      const shouldLookupProfile =
        isUnknownBias(enriched.biasRating) ||
        isUnknownFactuality(enriched.factuality) ||
        isUnknownOwnership(enriched.ownership) ||
        !normalizeText(enriched.websiteUrl) ||
        !normalizeText(enriched.logoUrl);

      if (shouldLookupProfile) {
        const profileMeta = await resolveGroundProfile(enriched);
        if (profileMeta) enriched = mergeSource(enriched, profileMeta);
      }

      const shouldLookupWikidata =
        isUnknownOwnership(enriched.ownership) ||
        !normalizeText(enriched.country) ||
        !Number.isFinite(Number(enriched.foundedYear)) ||
        !normalizeText(enriched.websiteUrl) ||
        !normalizeText(enriched.logoUrl);

      if (shouldLookupWikidata) {
        const wikidataMeta = await resolveWikidata(enriched);
        if (wikidataMeta) enriched = mergeSource(enriched, wikidataMeta);
      }

      if (!normalizeText(enriched.logoUrl)) {
        const fallbackLogo = buildLogoFallback(enriched);
        if (fallbackLogo) enriched.logoUrl = fallbackLogo;
      }

      if (isUnknownOwnership(enriched.ownership)) {
        const inferredCategory = inferOwnershipCategory({
          ownership: "",
          ownerName: "",
          outletName: enriched.outlet,
          websiteHost: hostFromUrl(enriched.websiteUrl || enriched.url),
        });
        if (inferredCategory) enriched.ownership = inferredCategory;
      }

      return enriched;
    },
  };
}
