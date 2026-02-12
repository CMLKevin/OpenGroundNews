/* eslint-disable no-console */
import crypto from "node:crypto";
import { getDb, requireDatabaseUrl } from "../db_client.mjs";

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

function mapFactuality(v) {
  const raw = String(v || "").toLowerCase().replace(/[\s_]+/g, "-");
  if (raw === "very-high") return "very_high";
  if (raw === "high") return "high";
  if (raw === "mixed") return "mixed";
  if (raw === "low") return "low";
  if (raw === "very-low") return "very_low";
  return "unknown";
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

  await db.$transaction(
    async (tx) => {
      for (const story of safeStories) {
        const slug = String(story.slug || "").trim();
        if (!slug) continue;

        const storyId = String(story.id || stableId("story", story.canonicalUrl || story.url || slug));
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
        for (const src of incomingSources) {
          const outletName = String(src.outlet || "").trim() || "Unknown outlet";
          const outletKey = slugify(outletName);
          const outletId = stableId("outlet", outletKey);
          await tx.outlet.upsert({
            where: { slug: outletKey },
            update: {
              name: outletName,
              logoUrl: src.logoUrl || null,
              bias: mapBias(src.bias),
              factuality: mapFactuality(src.factuality),
              ownership: src.ownership || null,
              lastEnrichedAt: updatedAt,
            },
            create: {
              id: outletId,
              slug: outletKey,
              name: outletName,
              logoUrl: src.logoUrl || null,
              bias: mapBias(src.bias),
              factuality: mapFactuality(src.factuality),
              ownership: src.ownership || null,
              lastEnrichedAt: updatedAt,
            },
          });

          const url = String(src.url || "").trim();
          if (!url) continue;
          const sourceId = String(src.id || stableId("src", `${storyId}:${url}`));
          sourceIds.push(sourceId);

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
            },
          });
        }

        // Trim old source cards for the story to avoid unbounded accumulation if IDs change.
        if (sourceIds.length > 0) {
          await tx.sourceArticle.deleteMany({
            where: { storyId, id: { notIn: sourceIds } },
          });
        }
      }
    },
    { timeout: 120000 },
  );

  if (context.disconnect) {
    await db.$disconnect();
  }
}
