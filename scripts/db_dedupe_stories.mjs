#!/usr/bin/env node
/* eslint-disable no-console */
import "./lib/load_env.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Pool } from "pg";

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function shortHash(value, size = 8) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, size);
}

function isoStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    maxGroups: 120,
    withinHours: 72,
    reportDir: "output/db_dedupe_reports",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--max-groups" && argv[i + 1]) {
      opts.maxGroups = Math.max(1, Math.round(Number(argv[i + 1]) || opts.maxGroups));
      i += 1;
    } else if (a === "--within-hours" && argv[i + 1]) {
      opts.withinHours = Math.max(1, Math.round(Number(argv[i + 1]) || opts.withinHours));
      i += 1;
    } else if (a === "--report-dir" && argv[i + 1]) {
      opts.reportDir = argv[i + 1];
      i += 1;
    }
  }
  return opts;
}

function chooseKeeper(rows) {
  const sorted = rows.slice().sort((a, b) => {
    const ra = Number.isFinite(Number(a.homepageRank)) ? Number(a.homepageRank) : Number.POSITIVE_INFINITY;
    const rb = Number.isFinite(Number(b.homepageRank)) ? Number(b.homepageRank) : Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return +new Date(b.updatedAt) - +new Date(a.updatedAt);
  });
  return sorted[0];
}

function clusterByPublishedAt(rows, withinHours) {
  const sorted = rows.slice().sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt));
  const clusters = [];
  const gapMs = withinHours * 3600 * 1000;
  for (const row of sorted) {
    const last = clusters[clusters.length - 1];
    if (!last) {
      clusters.push([row]);
      continue;
    }
    const prev = last[last.length - 1];
    const gap = Math.abs(+new Date(row.publishedAt) - +new Date(prev.publishedAt));
    if (gap <= gapMs) last.push(row);
    else clusters.push([row]);
  }
  return clusters.filter((c) => c.length > 1);
}

async function writeReport(dir, data) {
  await fs.mkdir(dir, { recursive: true });
  const jsonPath = path.join(dir, "report.json");
  await fs.writeFile(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  const htmlPath = path.join(dir, "report.html");
  const embedded = JSON.stringify(data).replace(/<\//g, "<\\/");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DB Story Dedupe Report</title>
  <style>
    :root{--bg:#0b0f14;--panel:#121a24;--muted:#8aa0b5;--text:#e8f0f8;--good:#46d39a;--bad:#ff6b6b;--line:#223044;--mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
    html,body{background:var(--bg);color:var(--text);font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin:0;}
    header{padding:16px 18px;border-bottom:1px solid var(--line);}
    h1{margin:0 0 6px;font-size:18px;}
    .sub{color:var(--muted);font-family:var(--mono);font-size:12px;}
    main{padding:18px;display:grid;gap:14px;}
    .card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th,td{padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top;}
    th{color:#cfe3f5;font-weight:600;text-align:left;}
    .mono{font-family:var(--mono);}
    .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-family:var(--mono);font-size:11px;border:1px solid var(--line);}
    .ok{color:var(--good);border-color: rgba(70,211,154,0.35);} .fail{color:var(--bad);border-color: rgba(255,107,107,0.35);}
  </style>
</head>
<body>
  <header>
    <h1>DB Story Dedupe Report</h1>
    <div class="sub" id="sub"></div>
  </header>
  <main>
    <section class="card">
      <div class="sub mono" id="summary"></div>
    </section>
    <section class="card">
      <h2 style="margin:0 0 8px;font-size:13px;color:#cfe3f5;">Merges</h2>
      <div style="overflow:auto;max-height:720px;border-radius:10px;">
        <table id="tbl"></table>
      </div>
    </section>
  </main>
  <script id="data" type="application/json">${embedded}</script>
  <script>
    (function(){
      var data = JSON.parse(document.getElementById('data').textContent || '{}');
      document.getElementById('sub').textContent = 'generatedAt=' + (data.generatedAt||'') + ' dryRun=' + (data.dryRun ? 'true':'false');
      document.getElementById('summary').textContent =
        'groupsConsidered=' + (data.groupsConsidered||0) +
        ' clustersMerged=' + (data.clustersMerged||0) +
        ' storiesDeleted=' + (data.storiesDeleted||0) +
        ' fkUpdates=' + (data.fkUpdates||0);
      var merges = data.merges || [];
      var rows = merges.slice(0, 400);
      var t = document.getElementById('tbl');
      t.innerHTML = '<thead><tr><th>Status</th><th>Title Key</th><th>Keeper</th><th>Deleted</th><th>FK Updates</th><th>Notes</th></tr></thead>' +
        '<tbody>' + rows.map(function(m){
          var pill = m.ok ? '<span class=\"pill ok\">ok</span>' : '<span class=\"pill fail\">err</span>';
          var keeper = (m.keeper && m.keeper.slug) ? m.keeper.slug : '';
          var deleted = (m.deleted || []).map(function(d){ return d.slug; }).join(', ');
          var notes = (m.notes || '').slice(0, 200);
          return '<tr>' +
            '<td>' + pill + '</td>' +
            '<td class=\"mono\">' + String(m.titleKey||'').slice(0, 120) + '</td>' +
            '<td class=\"mono\">' + keeper + '</td>' +
            '<td class=\"mono\">' + deleted + '</td>' +
            '<td class=\"mono\">' + String(m.fkUpdates||0) + '</td>' +
            '<td class=\"mono\">' + notes + '</td>' +
          '</tr>';
        }).join('') + '</tbody>';
    })();
  </script>
</body>
</html>`;
  await fs.writeFile(htmlPath, html, "utf8");
  return { jsonPath, htmlPath };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set; cannot run DB dedupe.");
  }

  const runId = `db-dedupe-${isoStamp()}-${shortHash(`${process.pid}:${Date.now()}`)}`;
  const reportDir = path.resolve(process.cwd(), opts.reportDir, runId);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const startedAt = new Date();
  const report = {
    generatedAt: new Date().toISOString(),
    runId,
    dryRun: opts.dryRun,
    withinHours: opts.withinHours,
    maxGroups: opts.maxGroups,
    groupsConsidered: 0,
    clustersMerged: 0,
    storiesDeleted: 0,
    fkUpdates: 0,
    merges: [],
  };

  const fkTables = [
    { table: "StoryTag", col: "storyId", uniqueGuard: true },
    { table: "SourceArticle", col: "storyId" },
    { table: "ReadingEvent", col: "storyId" },
    { table: "Feedback", col: "storyId" },
    { table: "StorySnapshot", col: "storyId" },
    { table: "StoryTimelineEvent", col: "storyId" },
    { table: "StoryPodcastReference", col: "storyId" },
    { table: "StoryReaderLink", col: "storyId" },
  ];

  try {
    const titleGroups = await pool.query(
      `SELECT LOWER(title) AS key, COUNT(*)::int AS cnt
       FROM "Story"
       GROUP BY LOWER(title)
       HAVING COUNT(*) > 1
       ORDER BY cnt DESC
       LIMIT $1`,
      [Math.max(1, Math.round(opts.maxGroups || 120))],
    );
    report.groupsConsidered = titleGroups.rows.length;
    console.log(`[db-dedupe] groups=${report.groupsConsidered} dryRun=${opts.dryRun ? "yes" : "no"}`);

    for (const group of titleGroups.rows) {
      const titleKey = normalizeText(group.key || "");
      if (!titleKey) continue;
      const rowsResult = await pool.query(
        `SELECT id, slug, title, "canonicalUrl", "homepageRank", "updatedAt", "publishedAt"
         FROM "Story"
         WHERE LOWER(title) = $1
         ORDER BY "updatedAt" DESC`,
        [titleKey],
      );
      const rows = (rowsResult.rows || []).filter((r) => r?.id && r?.slug);
      const clusters = clusterByPublishedAt(rows, opts.withinHours);
      if (clusters.length === 0) continue;

      for (const cluster of clusters) {
        const keeper = chooseKeeper(cluster);
        const dupes = cluster.filter((r) => r.id !== keeper.id);
        const mergeRecord = { ok: true, titleKey, keeper, deleted: dupes, fkUpdates: 0, notes: "" };
        if (dupes.length === 0) continue;
        report.clustersMerged += 1;

        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          // Merge each duplicate into keeper.
          for (const dupe of dupes) {
            const fromId = dupe.id;
            const toId = keeper.id;

            // Guard unique constraints for tags.
            if (!opts.dryRun) {
              await client.query(
                `DELETE FROM "StoryTag" t
                 USING "StoryTag" k
                 WHERE t."storyId" = $1 AND k."storyId" = $2 AND t.tag = k.tag`,
                [fromId, toId],
              );
            }

            // Related edges have a uniqueness constraint too: (storyId, relatedStoryId)
            if (!opts.dryRun) {
              await client.query(
                `DELETE FROM "StoryRelatedStory" d
                 USING "StoryRelatedStory" k
                 WHERE d."storyId" = $1 AND k."storyId" = $2 AND d."relatedStoryId" = k."relatedStoryId"`,
                [fromId, toId],
              );
              await client.query(
                `DELETE FROM "StoryRelatedStory" d
                 USING "StoryRelatedStory" k
                 WHERE d."relatedStoryId" = $1 AND k."relatedStoryId" = $2 AND d."storyId" = k."storyId"`,
                [fromId, toId],
              );
            }

            // Move FK references.
            for (const fk of fkTables) {
              if (opts.dryRun) continue;
              const res = await client.query(
                `UPDATE "${fk.table}" SET "${fk.col}" = $1 WHERE "${fk.col}" = $2`,
                [toId, fromId],
              );
              mergeRecord.fkUpdates += Number(res.rowCount || 0);
            }

            // Related story edges (both directions).
            if (!opts.dryRun) {
              const a = await client.query(
                `UPDATE "StoryRelatedStory" SET "storyId" = $1 WHERE "storyId" = $2`,
                [toId, fromId],
              );
              const b = await client.query(
                `UPDATE "StoryRelatedStory" SET "relatedStoryId" = $1 WHERE "relatedStoryId" = $2`,
                [toId, fromId],
              );
              mergeRecord.fkUpdates += Number(a.rowCount || 0) + Number(b.rowCount || 0);
            }

            // Geo: unique on storyId; keep keeper geo if present, otherwise adopt dupe geo.
            if (!opts.dryRun) {
              const keeperGeo = await client.query(`SELECT id FROM "StoryGeo" WHERE "storyId" = $1 LIMIT 1`, [toId]);
              if ((keeperGeo.rows || []).length === 0) {
                await client.query(`UPDATE "StoryGeo" SET "storyId" = $1 WHERE "storyId" = $2`, [toId, fromId]);
              } else {
                await client.query(`DELETE FROM "StoryGeo" WHERE "storyId" = $1`, [fromId]);
              }
            }

            if (!opts.dryRun) {
              const del = await client.query(`DELETE FROM "Story" WHERE id = $1`, [fromId]);
              report.storiesDeleted += Number(del.rowCount || 0);
            }
          }

          if (!opts.dryRun) await client.query("COMMIT");
          else await client.query("ROLLBACK");
        } catch (error) {
          mergeRecord.ok = false;
          mergeRecord.notes = error instanceof Error ? error.message : String(error);
          await client.query("ROLLBACK").catch(() => {});
        } finally {
          client.release();
        }

        report.fkUpdates += mergeRecord.fkUpdates;
        report.merges.push(mergeRecord);

        const keeperSlug = keeper.slug;
        const deletedSlugs = dupes.map((d) => d.slug).join(", ");
        console.log(
          `[db-dedupe] ${mergeRecord.ok ? "ok" : "err"} titleKey=${titleKey.slice(0, 80)} keeper=${keeperSlug} deleted=${deletedSlugs}`,
        );
      }
    }
  } finally {
    await pool.end().catch(() => {});
  }

  const artifacts = await writeReport(reportDir, report);
  const finishedAt = new Date();
  console.log(`[db-dedupe] finished in ${Math.round((finishedAt - startedAt) / 1000)}s`);
  console.log(`report: ${artifacts.htmlPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}

