/* eslint-disable no-console */
import crypto from "node:crypto";
import { getDb, requireDatabaseUrl } from "../db_client.mjs";
import { createOutletEnricher } from "./outlet_enrichment.mjs";

function stableId(prefix, value) {
  const hash = crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
}

function slugify(value) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
  return slug || "unknown";
}

function parseDate(value, fallbackIso) {
  const ts = Date.parse(String(value || ""));
  if (Number.isNaN(ts)) return new Date(fallbackIso);
  return new Date(ts);
}

function mapBias(bias) {
  const v = String(bias || "").toLowerCase();
  if (v === "left" || v === "center" || v === "right") return v;
  return "unknown";
}

function mapBiasRating(v) {
  const raw = String(v || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .trim();
  if (!raw) return "unknown";
  if (raw === "far-left") return "far_left";
  if (raw === "left") return "left";
  if (raw === "lean-left" || raw === "center-left") return "lean_left";
  if (raw === "center" || raw === "centre") return "center";
  if (raw === "lean-right" || raw === "center-right") return "lean_right";
  if (raw === "right") return "right";
  if (raw === "far-right") return "far_right";
  return "unknown";
}

function bucket3FromRating(rating) {
  if (rating === "far_left" || rating === "left" || rating === "lean_left") return "left";
  if (rating === "center") return "center";
  if (rating === "lean_right" || rating === "right" || rating === "far_right") return "right";
  return "unknown";
}

function mapFactuality(v) {
  const raw = String(v || "").toLowerCase().replace(/[\s_]+/g, "-");
  if (raw === "very-high") return "very_high";
  if (raw === "high") return "high";
  if (raw === "mixed") return "mixed";
  if (raw === "low") return "low";
  if (raw === "very-low") return "very_low";
  return "unknown";
}

function isUnknownOwnership(value) {
  const v = String(value || "").toLowerCase().trim();
  return !v || v === "unknown" || v === "unlabeled" || v === "unlabelled" || v === "unclassified" || v === "n/a";
}

function shouldPersistEnrichSource(src) {
  const biasRating = mapBiasRating(src?.biasRating || src?.bias_rating || src?.biasRating7 || "");
  const factuality = mapFactuality(src?.factuality || "");
  const logoUrl = String(src?.logoUrl || "").trim();
  const websiteUrl = String(src?.websiteUrl || "").trim();
  const ownership = String(src?.ownership || "").trim();
  return (
    biasRating === "unknown" ||
    factuality === "unknown" ||
    isUnknownOwnership(ownership) ||
    !logoUrl ||
    !websiteUrl
  );
}

function mergePersistEnrichedSource(src, enriched) {
  if (!enriched || typeof enriched !== "object") return src;
  const next = { ...src };

  const incomingBias = String(enriched.bias || "").trim();
  if (mapBias(next.bias) === "unknown" && mapBias(incomingBias) !== "unknown") next.bias = incomingBias;

  const incomingBiasRating = String(enriched.biasRating || "").trim();
  if (mapBiasRating(next.biasRating || next.bias_rating || next.biasRating7 || "") === "unknown" && mapBiasRating(incomingBiasRating) !== "unknown") {
    next.biasRating = incomingBiasRating;
  }

  const incomingFactuality = String(enriched.factuality || "").trim();
  if (mapFactuality(next.factuality || "") === "unknown" && mapFactuality(incomingFactuality) !== "unknown") {
    next.factuality = incomingFactuality;
  }

  const incomingOwnership = String(enriched.ownership || "").trim();
  if (isUnknownOwnership(next.ownership) && !isUnknownOwnership(incomingOwnership)) next.ownership = incomingOwnership;

  if (!String(next.logoUrl || "").trim() && String(enriched.logoUrl || "").trim()) next.logoUrl = enriched.logoUrl;
  if (!String(next.websiteUrl || "").trim() && String(enriched.websiteUrl || "").trim()) next.websiteUrl = enriched.websiteUrl;
  if (!String(next.country || "").trim() && String(enriched.country || "").trim()) next.country = enriched.country;

  const currentFounded = Number(next.foundedYear);
  const incomingFounded = Number(enriched.foundedYear);
  if (!Number.isFinite(currentFounded) && Number.isFinite(incomingFounded) && incomingFounded > 1500) {
    next.foundedYear = Math.round(incomingFounded);
  }

  if (!String(next.description || "").trim() && String(enriched.description || "").trim()) next.description = enriched.description;
  if (!String(next.groundNewsSourceSlug || next.sourceInfoSlug || "").trim() && String(enriched.groundNewsSourceSlug || "").trim()) {
    next.groundNewsSourceSlug = enriched.groundNewsSourceSlug;
  }
  if (!String(next.groundNewsUrl || next.outletProfileUrl || "").trim() && String(enriched.groundNewsUrl || "").trim()) {
    next.groundNewsUrl = enriched.groundNewsUrl;
  }

  return next;
}

function isWireOutlet(name) {
  const v = String(name || "").toLowerCase();
  // Heuristic: GN's "Original Reporting" signal isn't reliably exposed in the scrape output.
  // We approximate by treating wire services as non-original and everything else as original.
  return (
    v.includes("associated press") ||
    v === "ap" ||
    v.includes("reuters") ||
    v.includes("agence france-presse") ||
    v.includes("afp") ||
    v.includes("press association") ||
    v.includes("upi") ||
    v.includes("united press international")
  );
}

function parseOwnershipChain(value) {
  const clean = String(value || "").trim();
  if (!clean) return [];
  const parts = clean
    .split(/(?:\s*[>→»|]\s*|\s*,\s*|\s*\/\s*)/g)
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .slice(0, 8);
  return parts;
}

function podcastProviderFromUrl(url) {
  const host = String(url || "").toLowerCase();
  if (host.includes("spotify")) return "spotify";
  if (host.includes("apple.com")) return "apple-podcasts";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("podcasts.google")) return "google-podcasts";
  return "unknown";
}

function tryParseUrl(raw) {
  const clean = String(raw || "").trim();
  if (!clean) return "";
  try {
    return new URL(clean).toString();
  } catch {
    return "";
  }
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeStringList(value, max = 12) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const item of value) {
    const clean = normalizeText(item);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

function pickGeo(story) {
  const candidate = story?.geo && typeof story.geo === "object" ? story.geo : null;
  const lat = Number(candidate?.lat);
  const lon = Number(candidate?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return {
    lat,
    lon,
    locality: normalizeText(candidate?.locality || story?.location || "") || null,
    country: normalizeText(candidate?.country || "") || null,
  };
}

function titleFromUrl(url, fallback = "Reference") {
  const parsed = tryParseUrl(url);
  if (!parsed) return fallback;
  try {
    const host = new URL(parsed).hostname.replace(/^www\./, "");
    return host || fallback;
  } catch {
    return fallback;
  }
}

function buildReaderLinkRows(story, storyId) {
  const incoming = Array.isArray(story?.readerLinks) ? story.readerLinks : [];
  const rows = [];
  const seen = new Set();
  for (const item of incoming) {
    const label =
      typeof item === "object" && item
        ? normalizeText(item.label || item.title || item.text || "")
        : "";
    const url = tryParseUrl(typeof item === "string" ? item : item?.url || item?.href || "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    rows.push({
      id: stableId("reader", `${storyId}:${url}`),
      storyId,
      label: label || titleFromUrl(url, "Reader link"),
      url,
    });
    if (rows.length >= 20) break;
  }
  return rows;
}

function buildPodcastRows(story, storyId) {
  const incoming = Array.isArray(story?.podcastReferences) ? story.podcastReferences : [];
  const rows = [];
  const seen = new Set();
  for (const item of incoming) {
    let label = "";
    let url = "";
    let provider = "unknown";
    if (typeof item === "string") {
      const clean = normalizeText(item);
      const parsed = tryParseUrl(clean);
      if (parsed) {
        url = parsed;
        label = titleFromUrl(parsed, "Podcast");
        provider = podcastProviderFromUrl(parsed);
      } else {
        label = clean;
      }
    } else if (item && typeof item === "object") {
      label = normalizeText(item.label || item.title || item.text || "");
      url = tryParseUrl(item.url || item.href || "");
      provider = normalizeText(item.provider || "") || (url ? podcastProviderFromUrl(url) : "unknown");
    }
    if (!label && !url) continue;
    const key = `${label.toLowerCase()}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: stableId("podcast", `${storyId}:${key}`),
      storyId,
      label: label || titleFromUrl(url, "Podcast"),
      url: url || null,
      provider,
    });
    if (rows.length >= 20) break;
  }
  return rows;
}

function buildTimelineRows(story, storyId, publishedAt) {
  const explicit = Array.isArray(story?.timelineEvents) ? story.timelineEvents : [];
  const fromExplicit = [];
  for (const event of explicit) {
    if (!event || typeof event !== "object") continue;
    const label = normalizeText(event.label || event.title || event.header || "");
    if (!label) continue;
    const detail = normalizeText(event.detail || event.description || event.text || "");
    const orderRaw = Number(event.order);
    const order = Number.isFinite(orderRaw) ? Math.max(0, Math.round(orderRaw)) : fromExplicit.length + 1;
    const eventAt = event.eventAt ? parseDate(event.eventAt, publishedAt.toISOString()) : null;
    fromExplicit.push({ label, detail: detail || null, order, eventAt });
  }

  const timelineHeaders = normalizeStringList(story?.timelineHeaders, 16);
  const fromHeaders = timelineHeaders.map((label, idx) => ({
    label,
    detail: null,
    order: idx + 1,
    eventAt: null,
  }));

  const combined = fromExplicit.length > 0 ? fromExplicit : fromHeaders;
  const rows = [];
  const seen = new Set();

  rows.push({
    id: stableId("timeline", `${storyId}:published`),
    storyId,
    label: "Initial coverage published",
    detail: null,
    order: 0,
    eventAt: publishedAt,
  });

  for (const event of combined) {
    const key = `${event.label.toLowerCase()}|${event.order}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: stableId("timeline", `${storyId}:${key}`),
      storyId,
      label: event.label,
      detail: event.detail,
      order: event.order,
      eventAt: event.eventAt,
    });
    if (rows.length >= 20) break;
  }

  return rows;
}

function buildSnapshotRows(story, storyId) {
  const rows = [];
  const summary = normalizeText(story?.summary || "");
  const dek = normalizeText(story?.dek || "");
  const snapshotBody = normalizeText(story?.fullTextSnapshot || story?.snapshotBody || "");
  const primaryBody =
    snapshotBody ||
    [summary, dek].filter(Boolean).join("\n\n") ||
    "Snapshot unavailable from source body extraction.";

  rows.push({
    id: stableId("snapshot", `${storyId}:primary`),
    storyId,
    sourceUrl: tryParseUrl(story?.canonicalUrl || story?.url || "") || null,
    title: normalizeText(story?.title || "") || null,
    body: primaryBody,
    metadata: {
      topic: normalizeText(story?.topic || "") || null,
      tags: Array.isArray(story?.tags) ? story.tags.filter(Boolean).slice(0, 20) : [],
      sourceCount: Number(story?.sourceCount || 0) || 0,
      updatedAt: normalizeText(story?.updatedAt || "") || null,
    },
  });

  const sources = Array.isArray(story?.sources) ? story.sources : [];
  const seen = new Set();
  for (const src of sources) {
    const url = tryParseUrl(src?.url || "");
    const excerpt = normalizeText(src?.excerpt || "");
    const headline = normalizeText(src?.headline || "");
    if (!url || !excerpt) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    rows.push({
      id: stableId("snapshot", `${storyId}:${url}`),
      storyId,
      sourceUrl: url,
      title: headline || null,
      body: excerpt,
      metadata: {
        outlet: normalizeText(src?.outlet || "") || null,
        byline: normalizeText(src?.byline || "") || null,
        publishedAt: normalizeText(src?.publishedAt || "") || null,
        canonicalHash: normalizeText(src?.canonicalHash || "") || null,
      },
    });
    if (rows.length >= 40) break;
  }

  return rows;
}

function parseRelatedEntries(story) {
  const related = Array.isArray(story?.relatedStories) ? story.relatedStories : [];
  const relatedSlugs = Array.isArray(story?.relatedStorySlugs) ? story.relatedStorySlugs : [];
  const out = [];

  for (const entry of related) {
    if (typeof entry === "string") {
      const slug = slugify(entry);
      if (slug) out.push({ slug, reason: "related" });
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const slug = slugify(entry.slug || "");
    const relatedStoryId = normalizeText(entry.id || entry.relatedStoryId || "");
    const reason = normalizeText(entry.reason || entry.label || "related") || "related";
    if (relatedStoryId) out.push({ relatedStoryId, reason });
    else if (slug) out.push({ slug, reason });
  }

  for (const slugValue of relatedSlugs) {
    const slug = slugify(slugValue);
    if (!slug) continue;
    out.push({ slug, reason: "related-topic" });
  }

  return out;
}

function topicScore(baseStory, candidateStory) {
  const sameTopic =
    normalizeText(baseStory?.topic || "").toLowerCase() === normalizeText(candidateStory?.topic || "").toLowerCase();
  const baseTags = new Set((Array.isArray(baseStory?.tags) ? baseStory.tags : []).map((tag) => normalizeText(tag).toLowerCase()));
  const candidateTags = (Array.isArray(candidateStory?.tags) ? candidateStory.tags : [])
    .map((tag) => normalizeText(tag).toLowerCase())
    .filter(Boolean);
  let overlap = 0;
  for (const tag of candidateTags) {
    if (baseTags.has(tag)) overlap += 1;
  }
  return (sameTopic ? 2 : 0) + overlap;
}

export async function persistIngestionRun(params) {
  requireDatabaseUrl();
  const db = getDb();
  const runId = params.id || stableId("ingest", `${params.startedAt || new Date().toISOString()}:${params.mode || "gn"}`);
  const startedAt = params.startedAt ? new Date(params.startedAt) : new Date();
  const finishedAt = params.finishedAt ? new Date(params.finishedAt) : new Date();

  await db.ingestionRun.upsert({
    where: { id: runId },
    update: {
      startedAt,
      finishedAt,
      status: params.status === "ok" ? "ok" : "error",
      routeCount: Number(params.routeCount || 0) || 0,
      uniqueStoryLinks: Number(params.uniqueStoryLinks || 0) || 0,
      ingestedStories: Number(params.ingestedStories || 0) || 0,
      errors: params.errors || null,
    },
    create: {
      id: runId,
      startedAt,
      finishedAt,
      status: params.status === "ok" ? "ok" : "error",
      routeCount: Number(params.routeCount || 0) || 0,
      uniqueStoryLinks: Number(params.uniqueStoryLinks || 0) || 0,
      ingestedStories: Number(params.ingestedStories || 0) || 0,
      errors: params.errors || null,
    },
  });

  return runId;
}

export async function persistStoriesToDb(stories, context = {}) {
  requireDatabaseUrl();
  const db = getDb();

  const nowIso = new Date().toISOString();
  const safeStories = Array.isArray(stories) ? stories.filter(Boolean) : [];
  if (safeStories.length === 0) {
    if (context.disconnect) await db.$disconnect();
    return;
  }

  const persistEnrichmentEnabled = context.persistOutletEnrichment !== false && process.env.OGN_DB_PERSIST_OUTLET_ENRICHMENT !== "0";
  const persistEnrichmentTimeoutMs = Math.max(
    1000,
    Number(process.env.OGN_DB_PERSIST_OUTLET_ENRICH_TIMEOUT_MS || process.env.OGN_PIPELINE_OUTLET_ENRICH_TIMEOUT_MS || 5000),
  );
  const persistEnricher = createOutletEnricher({
    enabled: persistEnrichmentEnabled,
    timeoutMs: persistEnrichmentTimeoutMs,
    silent: true,
  });

  const storiesForPersist = [];
  for (const story of safeStories) {
    const incomingSources = Array.isArray(story?.sources) ? story.sources : [];
    if (!persistEnrichmentEnabled || incomingSources.length === 0) {
      storiesForPersist.push(story);
      continue;
    }
    const enrichedSources = [];
    for (const src of incomingSources) {
      if (!src || typeof src !== "object") {
        enrichedSources.push(src);
        continue;
      }
      if (!shouldPersistEnrichSource(src)) {
        enrichedSources.push(src);
        continue;
      }
      try {
        const enriched = await persistEnricher.enrich({
          outlet: src.outlet || "",
          url: src.url || "",
          websiteUrl: src.websiteUrl || "",
          logoUrl: src.logoUrl || "",
          bias: src.bias || "unknown",
          biasRating: src.biasRating || src.bias_rating || src.biasRating7 || "unknown",
          factuality: src.factuality || "unknown",
          ownership: src.ownership || "",
          country: src.country || "",
          foundedYear: src.foundedYear,
          description: src.description || src.excerpt || "",
          groundNewsUrl: src.groundNewsUrl || src.outletProfileUrl || "",
          groundNewsSourceSlug: src.groundNewsSourceSlug || src.sourceInfoSlug || "",
        });
        enrichedSources.push(mergePersistEnrichedSource(src, enriched));
      } catch {
        enrichedSources.push(src);
      }
    }
    storiesForPersist.push({ ...story, sources: enrichedSources });
  }

  await db.$transaction(
    async (tx) => {
      const runStoryIds = [];
      const runStoryBySlug = new Map();
      const relatedByStoryId = new Map();
      const ownershipByOutletId = new Map();

      for (const story of storiesForPersist) {
        const slug = String(story.slug || "").trim();
        if (!slug) continue;

        const storyId = String(story.id || stableId("story", story.canonicalUrl || story.url || slug));
        runStoryIds.push(storyId);
        runStoryBySlug.set(slug.toLowerCase(), { id: storyId, story });

        const updatedAtIso = story.updatedAt || nowIso;
        const updatedAt = parseDate(updatedAtIso, nowIso);
        const publishedAt = parseDate(story.publishedAt || updatedAtIso, updatedAtIso);

        const coverage = story.coverage || {};

        const incomingSources = Array.isArray(story.sources) ? story.sources : [];
        const countableSources = incomingSources.filter((s) => String(s?.url || "").trim());
        const totalSrc = countableSources.length;
        const wireSrc = countableSources.filter((s) => isWireOutlet(s.outlet)).length;
        const derivedOriginalPct = totalSrc > 0 ? Math.round(((totalSrc - wireSrc) / totalSrc) * 100) : null;
        const originalPctRaw =
          typeof story.originalReportingPct === "number" ? story.originalReportingPct : derivedOriginalPct;
        const originalReportingPct =
          typeof originalPctRaw === "number"
            ? Math.max(0, Math.min(100, Math.round(originalPctRaw)))
            : null;

        await tx.story.upsert({
          where: { slug },
          update: {
            id: storyId,
            canonicalUrl: story.canonicalUrl || null,
            title: story.title || "",
            dek: story.dek || null,
            author: story.author || null,
            summary: story.summary || "",
            topic: story.topic || "",
            location: story.location || "",
            imageUrl: story.imageUrl || "",
            publishedAt,
            updatedAt,
            sourceCount: Number(story.sourceCount || 0) || 0,
            biasLeft: Number(story.bias?.left || 0) || 0,
            biasCenter: Number(story.bias?.center || 0) || 0,
            biasRight: Number(story.bias?.right || 0) || 0,
            originalReportingPct,
            isBlindspot: Boolean(story.blindspot),
            isLocal: Boolean(story.local),
            isTrending: Boolean(story.trending),
            lastRefreshedAt: story.lastRefreshedAt ? new Date(story.lastRefreshedAt) : updatedAt,
            staleAt: story.staleAt ? new Date(story.staleAt) : null,
            readTimeMinutes:
              typeof story.readTimeMinutes === "number" && Number.isFinite(story.readTimeMinutes)
                ? Math.max(1, Math.round(story.readTimeMinutes))
                : null,
            imageAssetKey: story.imageAssetKey || null,
            brokeTheNewsSourceId: null,
            coverageTotal: typeof coverage.totalSources === "number" ? Math.round(coverage.totalSources) : null,
            coverageLeft: typeof coverage.leaningLeft === "number" ? Math.round(coverage.leaningLeft) : null,
            coverageCenter: typeof coverage.center === "number" ? Math.round(coverage.center) : null,
            coverageRight: typeof coverage.leaningRight === "number" ? Math.round(coverage.leaningRight) : null,
          },
          create: {
            id: storyId,
            slug,
            canonicalUrl: story.canonicalUrl || null,
            title: story.title || "",
            dek: story.dek || null,
            author: story.author || null,
            summary: story.summary || "",
            topic: story.topic || "",
            location: story.location || "",
            imageUrl: story.imageUrl || "",
            publishedAt,
            updatedAt,
            sourceCount: Number(story.sourceCount || 0) || 0,
            biasLeft: Number(story.bias?.left || 0) || 0,
            biasCenter: Number(story.bias?.center || 0) || 0,
            biasRight: Number(story.bias?.right || 0) || 0,
            originalReportingPct,
            isBlindspot: Boolean(story.blindspot),
            isLocal: Boolean(story.local),
            isTrending: Boolean(story.trending),
            lastRefreshedAt: story.lastRefreshedAt ? new Date(story.lastRefreshedAt) : updatedAt,
            staleAt: story.staleAt ? new Date(story.staleAt) : null,
            readTimeMinutes:
              typeof story.readTimeMinutes === "number" && Number.isFinite(story.readTimeMinutes)
                ? Math.max(1, Math.round(story.readTimeMinutes))
                : null,
            imageAssetKey: story.imageAssetKey || null,
            brokeTheNewsSourceId: null,
            coverageTotal: typeof coverage.totalSources === "number" ? Math.round(coverage.totalSources) : null,
            coverageLeft: typeof coverage.leaningLeft === "number" ? Math.round(coverage.leaningLeft) : null,
            coverageCenter: typeof coverage.center === "number" ? Math.round(coverage.center) : null,
            coverageRight: typeof coverage.leaningRight === "number" ? Math.round(coverage.leaningRight) : null,
          },
        });

        // Replace tags (simple + prevents tag drift from partial updates).
        const tags = Array.isArray(story.tags) ? story.tags : [];
        await tx.storyTag.deleteMany({ where: { storyId } });
        if (tags.length > 0) {
          await tx.storyTag.createMany({
            data: tags
              .map((t) => String(t).trim())
              .filter(Boolean)
              .slice(0, 12)
              .map((tag) => ({ id: stableId("tag", `${storyId}:${tag}`), storyId, tag })),
            skipDuplicates: true,
          });
        }

        // Upsert outlets + source cards
        const sourceIds = [];
        const sourcePublished = [];
        for (const src of incomingSources) {
          const outletName = String(src.outlet || "").trim() || "Unknown outlet";
          const outletKey = slugify(outletName);
          const outletId = stableId("outlet", outletKey);

          const biasRating = mapBiasRating(src.biasRating || src.bias_rating || src.biasRating7 || "");
          const biasBucket =
            mapBias(src.bias) !== "unknown" ? mapBias(src.bias) : biasRating !== "unknown" ? bucket3FromRating(biasRating) : "unknown";

          const factuality = mapFactuality(src.factuality);
          const ownership = String(src.ownership || "").trim();
          const groundNewsSourceId = String(src.groundNewsSourceId || src.groundnewsSourceId || "").trim();
          const groundNewsSourceSlug = String(src.groundNewsSourceSlug || src.groundnewsSourceSlug || "").trim();
          const groundNewsUrl = String(src.outletProfileUrl || src.groundNewsUrl || "").trim();
          const websiteUrl = String(src.websiteUrl || "").trim();
          const country = String(src.country || "").trim();
          const foundedYearRaw = Number(src.foundedYear);
          const foundedYear = Number.isFinite(foundedYearRaw) ? Math.max(0, Math.round(foundedYearRaw)) : null;
          const description = String(src.description || "").trim();

          const outletUpdate = {
            name: outletName,
          };
          if (src.logoUrl) outletUpdate.logoUrl = src.logoUrl;
          if (biasBucket !== "unknown") outletUpdate.bias = biasBucket;
          if (biasRating !== "unknown") outletUpdate.biasRating = biasRating;
          if (factuality !== "unknown") outletUpdate.factuality = factuality;
          if (ownership) outletUpdate.ownership = ownership;
          if (groundNewsSourceId) outletUpdate.groundNewsSourceId = groundNewsSourceId;
          if (groundNewsSourceSlug) outletUpdate.groundNewsSourceSlug = groundNewsSourceSlug;
          if (groundNewsUrl) outletUpdate.groundNewsUrl = groundNewsUrl;
          if (websiteUrl) outletUpdate.websiteUrl = websiteUrl;
          if (country) outletUpdate.country = country;
          if (typeof foundedYear === "number" && foundedYear > 0) outletUpdate.foundedYear = foundedYear;
          if (description) outletUpdate.description = description;
          if (
            (biasRating !== "unknown" || biasBucket !== "unknown") ||
            factuality !== "unknown" ||
            Boolean(ownership) ||
            Boolean(groundNewsSourceId) ||
            Boolean(groundNewsSourceSlug) ||
            Boolean(groundNewsUrl) ||
            Boolean(websiteUrl) ||
            Boolean(country) ||
            Boolean(foundedYear) ||
            Boolean(description)
          ) {
            outletUpdate.lastEnrichedAt = updatedAt;
          }

          await tx.outlet.upsert({
            where: { slug: outletKey },
            update: {
              ...outletUpdate,
            },
            create: {
              id: outletId,
              slug: outletKey,
              name: outletName,
              logoUrl: src.logoUrl || null,
              groundNewsSourceId: groundNewsSourceId || null,
              groundNewsSourceSlug: groundNewsSourceSlug || null,
              groundNewsUrl: groundNewsUrl || null,
              websiteUrl: websiteUrl || null,
              country: country || null,
              foundedYear: foundedYear || null,
              description: description || null,
              bias: biasBucket !== "unknown" ? biasBucket : undefined,
              biasRating: biasRating !== "unknown" ? biasRating : undefined,
              factuality: factuality !== "unknown" ? factuality : undefined,
              ownership: ownership || null,
              lastEnrichedAt:
                (biasRating !== "unknown" || biasBucket !== "unknown") ||
                factuality !== "unknown" ||
                Boolean(ownership) ||
                Boolean(groundNewsSourceId) ||
                Boolean(groundNewsSourceSlug) ||
                Boolean(groundNewsUrl) ||
                Boolean(websiteUrl) ||
                Boolean(country) ||
                Boolean(foundedYear) ||
                Boolean(description)
                  ? updatedAt
                  : null,
            },
          });

          const parsedOwnershipChain = ownership ? parseOwnershipChain(ownership) : [];
          const existingOwnership = ownershipByOutletId.get(outletId);
          if (!existingOwnership || parsedOwnershipChain.length > existingOwnership.chain.length) {
            ownershipByOutletId.set(outletId, {
              outletId,
              outletName,
              chain: parsedOwnershipChain,
              country: country || null,
            });
          }

          const url = String(src.url || "").trim();
          if (!url) continue;
          const sourceId = String(src.id || stableId("src", `${storyId}:${url}`));
          sourceIds.push(sourceId);
          const srcPublishedAt = src.publishedAt ? parseDate(src.publishedAt, publishedAt.toISOString()) : null;
          sourcePublished.push({ id: sourceId, publishedAt: srcPublishedAt });

          await tx.sourceArticle.upsert({
            where: { id: sourceId },
            update: {
              storyId,
              outletId,
              url,
              excerpt: String(src.excerpt || ""),
              publishedAt: src.publishedAt ? new Date(src.publishedAt) : null,
              paywall: src.paywall || null,
              locality: src.locality || null,
              headline: src.headline || null,
              byline: src.byline || null,
              imageUrl: src.imageUrl || null,
              language: src.language || null,
              canonicalHash: src.canonicalHash || null,
              repostedBy:
                typeof src.repostedBy === "number" && Number.isFinite(src.repostedBy)
                  ? Math.max(0, Math.round(src.repostedBy))
                  : null,
            },
            create: {
              id: sourceId,
              storyId,
              outletId,
              url,
              excerpt: String(src.excerpt || ""),
              publishedAt: src.publishedAt ? new Date(src.publishedAt) : null,
              paywall: src.paywall || null,
              locality: src.locality || null,
              headline: src.headline || null,
              byline: src.byline || null,
              imageUrl: src.imageUrl || null,
              language: src.language || null,
              canonicalHash: src.canonicalHash || null,
              repostedBy:
                typeof src.repostedBy === "number" && Number.isFinite(src.repostedBy)
                  ? Math.max(0, Math.round(src.repostedBy))
                  : null,
            },
          });
        }

        // Trim old source cards for the story to avoid unbounded accumulation if IDs change.
        if (sourceIds.length > 0) {
          await tx.sourceArticle.deleteMany({
            where: { storyId, id: { notIn: sourceIds } },
          });
        } else {
          await tx.sourceArticle.deleteMany({ where: { storyId } });
        }

        let brokeTheNewsSourceId = normalizeText(story.brokeTheNewsSourceId || "");
        if (brokeTheNewsSourceId && !sourceIds.includes(brokeTheNewsSourceId)) {
          brokeTheNewsSourceId = "";
        }
        if (!brokeTheNewsSourceId && sourcePublished.length > 0) {
          const earliest = sourcePublished
            .filter((item) => item.publishedAt)
            .sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt))[0];
          if (earliest?.id) brokeTheNewsSourceId = earliest.id;
        }
        await tx.story.update({
          where: { id: storyId },
          data: { brokeTheNewsSourceId: brokeTheNewsSourceId || null },
        });

        const timelineRows = buildTimelineRows(story, storyId, publishedAt);
        await tx.storyTimelineEvent.deleteMany({ where: { storyId } });
        if (timelineRows.length > 0) {
          await tx.storyTimelineEvent.createMany({ data: timelineRows, skipDuplicates: true });
        }

        const podcastRows = buildPodcastRows(story, storyId);
        await tx.storyPodcastReference.deleteMany({ where: { storyId } });
        if (podcastRows.length > 0) {
          await tx.storyPodcastReference.createMany({ data: podcastRows, skipDuplicates: true });
        }

        const readerLinkRows = buildReaderLinkRows(story, storyId);
        await tx.storyReaderLink.deleteMany({ where: { storyId } });
        if (readerLinkRows.length > 0) {
          await tx.storyReaderLink.createMany({ data: readerLinkRows, skipDuplicates: true });
        }

        const snapshotRows = buildSnapshotRows(story, storyId);
        await tx.storySnapshot.deleteMany({ where: { storyId } });
        if (snapshotRows.length > 0) {
          await tx.storySnapshot.createMany({ data: snapshotRows, skipDuplicates: true });
        }

        const geo = pickGeo(story);
        if (geo) {
          await tx.storyGeo.upsert({
            where: { storyId },
            update: geo,
            create: { id: stableId("geo", storyId), storyId, ...geo },
          });
        }

        const related = parseRelatedEntries(story)
          .slice(0, 20)
          .map((entry) => ({
            slug: entry.slug ? slugify(entry.slug) : "",
            relatedStoryId: entry.relatedStoryId ? String(entry.relatedStoryId).trim() : "",
            reason: normalizeText(entry.reason || "related") || "related",
          }));
        if (related.length > 0) {
          relatedByStoryId.set(storyId, related);
        }
      }

      for (const [outletId, ownership] of ownershipByOutletId.entries()) {
        const names = [ownership.outletName, ...(Array.isArray(ownership.chain) ? ownership.chain : [])]
          .map((value) => normalizeText(value))
          .filter(Boolean);
        const deduped = [];
        const seen = new Set();
        for (const name of names) {
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(name);
        }

        await tx.outletOwnershipEdge.deleteMany({ where: { outletId } });
        await tx.outletOwnershipEntity.deleteMany({ where: { outletId } });

        if (deduped.length === 0) continue;
        const entityIds = deduped.map((name, idx) =>
          stableId("owner_entity", `${outletId}:${idx}:${slugify(name)}`),
        );
        await tx.outletOwnershipEntity.createMany({
          data: deduped.map((name, idx) => ({
            id: entityIds[idx],
            outletId,
            name,
            entityType: idx === 0 ? "outlet" : "owner",
            country: ownership.country || null,
          })),
          skipDuplicates: true,
        });
        if (entityIds.length > 1) {
          await tx.outletOwnershipEdge.createMany({
            data: entityIds.slice(0, -1).map((fromId, idx) => ({
              id: stableId("owner_edge", `${outletId}:${fromId}->${entityIds[idx + 1]}`),
              outletId,
              fromEntityId: fromId,
              toEntityId: entityIds[idx + 1],
              sharePct: null,
            })),
            skipDuplicates: true,
          });
        }
      }

      for (const { id: storyId, story } of runStoryBySlug.values()) {
        const existing = relatedByStoryId.get(storyId) || [];
        const inferred = [];
        for (const candidate of safeStories) {
          const candidateSlug = String(candidate?.slug || "")
            .trim()
            .toLowerCase();
          if (!candidateSlug || candidateSlug === String(story.slug || "").trim().toLowerCase()) continue;
          const score = topicScore(story, candidate);
          if (score <= 0) continue;
          inferred.push({ candidateSlug, score });
        }
        inferred
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .forEach((item) => {
            existing.push({ slug: item.candidateSlug, reason: "same-topic-coverage" });
          });
        if (existing.length > 0) relatedByStoryId.set(storyId, existing);
      }

      const slugsToResolve = new Set();
      for (const entries of relatedByStoryId.values()) {
        for (const entry of entries) {
          if (entry.slug && !entry.relatedStoryId) slugsToResolve.add(entry.slug);
        }
      }
      const resolvedBySlug = new Map();
      if (slugsToResolve.size > 0) {
        const rows = await tx.story.findMany({
          where: { slug: { in: Array.from(slugsToResolve) } },
          select: { id: true, slug: true },
        });
        for (const row of rows) resolvedBySlug.set(String(row.slug || "").toLowerCase(), row.id);
      }

      if (runStoryIds.length > 0) {
        await tx.storyRelatedStory.deleteMany({
          where: { storyId: { in: runStoryIds } },
        });
      }

      const relatedRows = [];
      for (const [storyId, entries] of relatedByStoryId.entries()) {
        const seen = new Set();
        for (const entry of entries) {
          const relatedStoryId =
            entry.relatedStoryId ||
            (entry.slug ? runStoryBySlug.get(entry.slug.toLowerCase())?.id || resolvedBySlug.get(entry.slug.toLowerCase()) : "");
          if (!relatedStoryId || relatedStoryId === storyId) continue;
          const uniq = `${storyId}:${relatedStoryId}`;
          if (seen.has(uniq)) continue;
          seen.add(uniq);
          relatedRows.push({
            id: stableId("related", uniq),
            storyId,
            relatedStoryId,
            reason: normalizeText(entry.reason || "related") || "related",
          });
          if (seen.size >= 12) break;
        }
      }

      if (relatedRows.length > 0) {
        await tx.storyRelatedStory.createMany({ data: relatedRows, skipDuplicates: true });
      }
    },
    { timeout: 180000 },
  );

  if (context.disconnect) {
    await db.$disconnect();
  }
}
