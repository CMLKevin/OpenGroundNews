#!/usr/bin/env node
/* eslint-disable no-console */
import "./lib/load_env.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getDb } from "./lib/db_client.mjs";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const AUTH_PATH = path.join(process.cwd(), "data", "auth.json");

function stableId(prefix, value) {
  const hash = crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
}

function parseDate(value, fallback = null) {
  const ts = Date.parse(String(value || ""));
  if (Number.isNaN(ts)) return fallback;
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

async function readJsonIfExists(p) {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const db = getDb();
  const store = await readJsonIfExists(STORE_PATH);
  const auth = await readJsonIfExists(AUTH_PATH);

  const stories = Array.isArray(store?.stories) ? store.stories : [];
  const archiveCache = store?.archiveCache && typeof store.archiveCache === "object" ? store.archiveCache : {};

  const users = Array.isArray(auth?.users) ? auth.users : [];
  const sessions = auth?.sessions && typeof auth.sessions === "object" ? auth.sessions : {};
  const prefs = auth?.prefs && typeof auth.prefs === "object" ? auth.prefs : {};

  console.log(`import: stories=${stories.length}, archiveEntries=${Object.keys(archiveCache).length}`);
  console.log(`import: users=${users.length}, sessions=${Object.keys(sessions).length}`);

  await db.$transaction(async (tx) => {
    // Users
    for (const u of users) {
      const id = String(u.id || "").trim();
      const email = String(u.email || "").trim().toLowerCase();
      if (!id || !email) continue;
      await tx.user.upsert({
        where: { id },
        update: {
          email,
          role: u.role === "admin" ? "admin" : "user",
          passwordSalt: u.password?.saltHex || null,
          passwordHash: u.password?.hashHex || null,
        },
        create: {
          id,
          email,
          role: u.role === "admin" ? "admin" : "user",
          createdAt: parseDate(u.createdAt, new Date()) || new Date(),
          passwordSalt: u.password?.saltHex || null,
          passwordHash: u.password?.hashHex || null,
        },
      });

      const p = prefs?.[id];
      if (p) {
        await tx.userPrefs.upsert({
          where: { userId: id },
          update: { updatedAt: parseDate(p.updatedAt, new Date()) || new Date() },
          create: { userId: id, updatedAt: parseDate(p.updatedAt, new Date()) || new Date() },
        });
        // follows
        const topics = Array.isArray(p.topics) ? p.topics : [];
        const outlets = Array.isArray(p.outlets) ? p.outlets : [];
        for (const slug of topics.map((s) => String(s).toLowerCase()).filter(Boolean)) {
          await tx.follow.upsert({
            where: { userId_kind_slug: { userId: id, kind: "topic", slug } },
            update: {},
            create: { id: stableId("follow", `${id}:topic:${slug}`), userId: id, kind: "topic", slug },
          });
        }
        for (const slug of outlets.map((s) => String(s).toLowerCase()).filter(Boolean)) {
          await tx.follow.upsert({
            where: { userId_kind_slug: { userId: id, kind: "outlet", slug } },
            update: {},
            create: { id: stableId("follow", `${id}:outlet:${slug}`), userId: id, kind: "outlet", slug },
          });
        }
      }
    }

    // Sessions
    for (const token of Object.keys(sessions)) {
      const s = sessions[token];
      const cleanToken = String(s?.token || token || "").trim();
      const userId = String(s?.userId || "").trim();
      if (!cleanToken || !userId) continue;
      await tx.session.upsert({
        where: { token: cleanToken },
        update: {
          userId,
          expiresAt: parseDate(s.expiresAt, new Date(Date.now() + 14 * 86400000)) || new Date(Date.now() + 14 * 86400000),
        },
        create: {
          token: cleanToken,
          userId,
          createdAt: parseDate(s.createdAt, new Date()) || new Date(),
          expiresAt: parseDate(s.expiresAt, new Date(Date.now() + 14 * 86400000)) || new Date(Date.now() + 14 * 86400000),
        },
      });
    }

    // Stories + outlets + sources + tags
    for (const story of stories) {
      const storyId = String(story.id || stableId("story", story.slug || story.title || Math.random()));
      const slug = String(story.slug || "").trim();
      if (!slug) continue;

      const updatedAt = parseDate(story.updatedAt, new Date()) || new Date();
      const publishedAt = parseDate(story.publishedAt, updatedAt) || updatedAt;

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
          isBlindspot: Boolean(story.blindspot),
          isLocal: Boolean(story.local),
          isTrending: Boolean(story.trending),
          coverageTotal: story.coverage?.totalSources ?? null,
          coverageLeft: story.coverage?.leaningLeft ?? null,
          coverageCenter: story.coverage?.center ?? null,
          coverageRight: story.coverage?.leaningRight ?? null,
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
          isBlindspot: Boolean(story.blindspot),
          isLocal: Boolean(story.local),
          isTrending: Boolean(story.trending),
          coverageTotal: story.coverage?.totalSources ?? null,
          coverageLeft: story.coverage?.leaningLeft ?? null,
          coverageCenter: story.coverage?.center ?? null,
          coverageRight: story.coverage?.leaningRight ?? null,
        },
      });

      // tags
      const tags = Array.isArray(story.tags) ? story.tags : [];
      for (const tag of tags.map((t) => String(t).trim()).filter(Boolean)) {
        await tx.storyTag.upsert({
          where: { storyId_tag: { storyId, tag } },
          update: {},
          create: { id: stableId("tag", `${storyId}:${tag}`), storyId, tag },
        });
      }

      // sources + outlets
      const sources = Array.isArray(story.sources) ? story.sources : [];
      for (const src of sources) {
        const outletName = String(src.outlet || "").trim() || "Unknown outlet";
        const outletSlug = String(src.outlet || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 110) || "unknown";
        const outletId = stableId("outlet", outletSlug);
        await tx.outlet.upsert({
          where: { slug: outletSlug },
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
            slug: outletSlug,
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
        await tx.sourceArticle.upsert({
          where: { id: String(src.id || stableId("src", `${storyId}:${url}`)) },
          update: {
            storyId,
            outletId: outletId,
            url,
            excerpt: src.excerpt || "",
            publishedAt: parseDate(src.publishedAt, null),
            paywall: src.paywall || null,
            locality: src.locality || null,
          },
          create: {
            id: String(src.id || stableId("src", `${storyId}:${url}`)),
            storyId,
            outletId: outletId,
            url,
            excerpt: src.excerpt || "",
            publishedAt: parseDate(src.publishedAt, null),
            paywall: src.paywall || null,
            locality: src.locality || null,
          },
        });
      }
    }

    // Archive entries
    for (const [originalUrl, entry] of Object.entries(archiveCache)) {
      const id = stableId("arch", originalUrl);
      const status = String(entry?.status || "error");
      const mapped =
        status === "success" || status === "blocked" || status === "not_found" || status === "fallback" || status === "error"
          ? status
          : "error";
      await tx.archiveEntry.upsert({
        where: { originalUrl },
        update: {
          status: mapped,
          archiveUrl: entry.archiveUrl || "none",
          title: entry.title || "Article",
          notes: entry.notes || "",
          paragraphs: entry.paragraphs || [],
          checkedAt: parseDate(entry.checkedAt, new Date()) || new Date(),
        },
        create: {
          id,
          originalUrl,
          status: mapped,
          archiveUrl: entry.archiveUrl || "none",
          title: entry.title || "Article",
          notes: entry.notes || "",
          paragraphs: entry.paragraphs || [],
          checkedAt: parseDate(entry.checkedAt, new Date()) || new Date(),
        },
      });
    }
  }, { timeout: 120000 });

  await db.$disconnect();
  console.log("Import complete.");
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});

