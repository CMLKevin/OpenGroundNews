#!/usr/bin/env node
/* eslint-disable no-console */
import "../lib/load_env.mjs";
import { getDb, requireDatabaseUrl } from "../lib/db_client.mjs";

function estimateReadMinutes(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.min(30, Math.ceil(words / 220)));
}

async function main() {
  requireDatabaseUrl();
  const db = getDb();

  const stories = await db.story.findMany({
    select: {
      id: true,
      title: true,
      summary: true,
      updatedAt: true,
      readTimeMinutes: true,
      lastRefreshedAt: true,
      staleAt: true,
    },
    take: 5000,
  });

  let updated = 0;
  for (const story of stories) {
    const readTimeMinutes = story.readTimeMinutes || estimateReadMinutes(`${story.title} ${story.summary}`);
    const lastRefreshedAt = story.lastRefreshedAt || story.updatedAt;
    const staleAt = story.staleAt || new Date(+new Date(lastRefreshedAt) + 7 * 86400000);

    await db.story.update({
      where: { id: story.id },
      data: {
        readTimeMinutes,
        lastRefreshedAt,
        staleAt,
      },
    });
    updated += 1;
  }

  console.log(JSON.stringify({ ok: true, updated }));
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
