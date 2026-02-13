#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { getDb, requireDatabaseUrl } from "./lib/db_client.mjs";
import { createOutletEnricher } from "./lib/gn/outlet_enrichment.mjs";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

const TLD_COUNTRY_MAP = new Map([
  ["us", "United States"],
  ["uk", "United Kingdom"],
  ["ca", "Canada"],
  ["au", "Australia"],
  ["in", "India"],
  ["de", "Germany"],
  ["fr", "France"],
  ["it", "Italy"],
  ["es", "Spain"],
  ["jp", "Japan"],
  ["kr", "South Korea"],
  ["br", "Brazil"],
  ["mx", "Mexico"],
  ["za", "South Africa"],
  ["ie", "Ireland"],
  ["nz", "New Zealand"],
  ["sg", "Singapore"],
  ["hk", "Hong Kong"],
]);

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  const slug = normalizeText(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
  return slug || "unknown";
}

function hostFromUrl(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function websiteFromUrl(rawUrl) {
  const host = hostFromUrl(rawUrl);
  if (!host) return "";
  return `https://${host}`;
}

function countryFromUrl(rawUrl) {
  const host = hostFromUrl(rawUrl);
  if (!host || !host.includes(".")) return "";
  const tld = host.split(".").pop() || "";
  return TLD_COUNTRY_MAP.get(tld) || "";
}

function pickTopKey(counts, opts = {}) {
  const min = Number.isFinite(opts.min) ? opts.min : 1;
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] < min) return "";
  return ranked[0][0];
}

function mapBias(value) {
  const v = normalizeText(value).toLowerCase();
  if (v === "left" || v === "center" || v === "right") return v;
  return "";
}

function mapBiasRating(value) {
  const v = normalizeText(value).toLowerCase().replace(/[_\s]+/g, "-");
  if (!v) return "";
  if (v === "far-left") return "far_left";
  if (v === "left") return "left";
  if (v === "lean-left" || v === "center-left" || v === "centre-left") return "lean_left";
  if (v === "center" || v === "centre") return "center";
  if (v === "lean-right" || v === "center-right" || v === "centre-right") return "lean_right";
  if (v === "right") return "right";
  if (v === "far-right") return "far_right";
  return "";
}

function mapFactuality(value) {
  const v = normalizeText(value).toLowerCase().replace(/[_\s]+/g, "-");
  if (v === "very-high") return "very_high";
  if (v === "high") return "high";
  if (v === "mixed") return "mixed";
  if (v === "low") return "low";
  if (v === "very-low") return "very_low";
  return "";
}

function isUnknownOwnership(value) {
  const v = normalizeText(value).toLowerCase();
  return !v || v === "unknown" || v === "unlabeled" || v === "unlabelled" || v === "unclassified" || v === "n/a";
}

function isGoodDescription(text) {
  const clean = normalizeText(text);
  return clean.length >= 40 && clean.length <= 400;
}

async function readStore() {
  const raw = await fs.readFile(STORE_PATH, "utf8");
  const json = JSON.parse(raw);
  if (!Array.isArray(json?.stories)) throw new Error("Invalid store.json: expected stories[]");
  return json;
}

async function run() {
  requireDatabaseUrl();
  const store = await readStore();
  const outletEnricher = createOutletEnricher({
    enabled: true,
    timeoutMs: Number(process.env.OGN_PIPELINE_OUTLET_ENRICH_TIMEOUT_MS || 12000),
    silent: false,
  });
  const byOutlet = new Map();

  for (const story of store.stories || []) {
    for (const source of story.sources || []) {
      const outletName = normalizeText(source?.outlet || "");
      if (!outletName) continue;
      const slug = slugify(outletName);
      const row =
        byOutlet.get(slug) ||
        {
          slug,
          name: outletName,
          logoUrl: "",
          websiteCandidates: new Map(),
          countryCandidates: new Map(),
          foundedYearCandidates: new Map(),
          descriptions: [],
          biasCounts: new Map(),
          biasRatingCounts: new Map(),
          factualityCounts: new Map(),
        };

      row.name = row.name || outletName;
      row.logoUrl = row.logoUrl || normalizeText(source.logoUrl || "");

      const website = normalizeText(source.websiteUrl || websiteFromUrl(source.url));
      if (website) row.websiteCandidates.set(website, (row.websiteCandidates.get(website) || 0) + 1);

      const country = normalizeText(source.country || countryFromUrl(source.url));
      if (country) row.countryCandidates.set(country, (row.countryCandidates.get(country) || 0) + 1);

      const founded = Number(source.foundedYear);
      if (Number.isFinite(founded) && founded > 1600 && founded <= new Date().getFullYear()) {
        const key = String(Math.round(founded));
        row.foundedYearCandidates.set(key, (row.foundedYearCandidates.get(key) || 0) + 1);
      }

      const desc = normalizeText(source.description || source.excerpt || "");
      if (isGoodDescription(desc)) row.descriptions.push(desc);

      const bias = mapBias(source.bias);
      if (bias) row.biasCounts.set(bias, (row.biasCounts.get(bias) || 0) + 1);

      const biasRating = mapBiasRating(source.biasRating);
      if (biasRating) row.biasRatingCounts.set(biasRating, (row.biasRatingCounts.get(biasRating) || 0) + 1);

      const factuality = mapFactuality(source.factuality);
      if (factuality) row.factualityCounts.set(factuality, (row.factualityCounts.get(factuality) || 0) + 1);

      byOutlet.set(slug, row);
    }
  }

  const db = getDb();
  const slugs = Array.from(byOutlet.keys());
  let updated = 0;
  let skipped = 0;

  for (const slug of slugs) {
    const agg = byOutlet.get(slug);
    if (!agg) continue;

    const existing = await db.outlet.findUnique({ where: { slug } });

    const websiteUrl = pickTopKey(agg.websiteCandidates, { min: 1 });
    const country = pickTopKey(agg.countryCandidates, { min: 1 });
    const foundedYearPicked = pickTopKey(agg.foundedYearCandidates, { min: 1 });
    const foundedYear = foundedYearPicked ? Number(foundedYearPicked) : null;
    const description = agg.descriptions[0] || "";
    const bias = pickTopKey(agg.biasCounts, { min: 1 });
    const biasRating = pickTopKey(agg.biasRatingCounts, { min: 1 });
    const factuality = pickTopKey(agg.factualityCounts, { min: 1 });

    const enriched = await outletEnricher.enrich({
      outlet: agg.name || slug,
      url: websiteUrl || "",
      websiteUrl: websiteUrl || "",
      logoUrl: agg.logoUrl || "",
      bias: bias || "unknown",
      biasRating: (biasRating || "unknown").replace(/_/g, "-"),
      factuality: (factuality || "unknown").replace(/_/g, "-"),
      ownership: existing?.ownership || "",
      country: country || "",
      foundedYear: foundedYear || undefined,
      description: description || "",
    });

    const update = {};
    if (!existing?.name && agg.name) update.name = agg.name;
    if (!existing?.logoUrl && (agg.logoUrl || enriched.logoUrl)) update.logoUrl = agg.logoUrl || enriched.logoUrl;
    if (!existing?.websiteUrl && (websiteUrl || enriched.websiteUrl)) update.websiteUrl = websiteUrl || enriched.websiteUrl;
    if (!existing?.country && (country || enriched.country)) update.country = country || enriched.country;
    if (!existing?.foundedYear && (foundedYear || enriched.foundedYear)) update.foundedYear = foundedYear || enriched.foundedYear;
    if (!existing?.description && (description || enriched.description)) update.description = description || enriched.description;
    const enrichedBias = String(bias || enriched.bias || "").trim().toLowerCase();
    if ((existing?.bias || "unknown") === "unknown" && enrichedBias && enrichedBias !== "unknown") {
      update.bias = enrichedBias;
    }
    const enrichedBiasRating = String(biasRating || enriched.biasRating || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_");
    if ((existing?.biasRating || "unknown") === "unknown" && enrichedBiasRating && enrichedBiasRating !== "unknown") {
      update.biasRating = enrichedBiasRating;
    }
    const enrichedFactuality = String(factuality || enriched.factuality || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_");
    if ((existing?.factuality || "unknown") === "unknown" && enrichedFactuality && enrichedFactuality !== "unknown") {
      update.factuality = enrichedFactuality;
    }
    if (isUnknownOwnership(existing?.ownership) && !isUnknownOwnership(enriched.ownership)) {
      update.ownership = enriched.ownership;
    }

    if (Object.keys(update).length === 0) {
      skipped += 1;
      continue;
    }
    update.lastEnrichedAt = new Date();

    await db.outlet.upsert({
      where: { slug },
      update,
      create: {
        id: `outlet_${slug}`,
        slug,
        name: agg.name || slug,
        logoUrl: agg.logoUrl || null,
        websiteUrl: websiteUrl || null,
        country: country || null,
        foundedYear: foundedYear || null,
        description: description || null,
        bias: bias || "unknown",
        biasRating: biasRating || "unknown",
        factuality: factuality || "unknown",
        lastEnrichedAt: new Date(),
      },
    });
    updated += 1;
  }

  console.log(JSON.stringify({ ok: true, outletsSeen: slugs.length, updated, skipped }, null, 2));
}

run().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
