#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";

function readJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseAudit(markdown) {
  const text = String(markdown || "");

  const sections = [];
  const sectionRe = /^##\s+([A-Z])\.\s+(.*?)\s*$/gm;
  let m;
  while ((m = sectionRe.exec(text)) !== null) {
    sections.push({ id: m[1], title: m[2].trim(), index: m.index });
  }

  const issueRe = /^###\s+([A-Z]\d+)\.\s+(.*?)\s+\[(P[0-3])\]\s*$/gm;
  const issues = [];
  while ((m = issueRe.exec(text)) !== null) {
    issues.push({
      id: m[1],
      title: m[2].trim(),
      priority: m[3],
      index: m.index,
      headerLine: m[0],
    });
  }

  // Attach section to issue (nearest preceding section).
  for (const issue of issues) {
    const sec = sections.filter((s) => s.index < issue.index).slice(-1)[0] || null;
    issue.section = sec ? { id: sec.id, title: sec.title } : null;
  }

  // Extract per-issue blocks (between issue header and next issue/section).
  for (let i = 0; i < issues.length; i += 1) {
    const start = issues[i].index;
    const end = i + 1 < issues.length ? issues[i + 1].index : text.length;
    const block = text.slice(start, end);

    const fileHints = [];
    const fixHints = [];

    for (const line of block.split("\n")) {
      const fileMatch = line.match(/^\*\*File:\*\*\s+`([^`]+)`/);
      if (fileMatch) fileHints.push(fileMatch[1]);
      const fixMatch = line.match(/^\*\*Fix:\*\*\s+(.*)$/);
      if (fixMatch) fixHints.push(fixMatch[1].trim());
    }

    issues[i].fileHints = Array.from(new Set(fileHints));
    issues[i].fixHints = fixHints;
  }

  return issues;
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const k = keyFn(item);
    const arr = map.get(k) || [];
    arr.push(item);
    map.set(k, arr);
  }
  return map;
}

function mdEscape(s) {
  return String(s || "").replace(/\|/g, "\\|");
}

async function main() {
  const repoRoot = process.cwd();
  const auditPath = path.join(repoRoot, "audit.md");
  const donePath = path.join(repoRoot, "docs", "parity", "done_ids.json");
  const outPath = path.join(repoRoot, "docs", "parity", "PARITY_TODO.md");

  const [auditRaw, doneRaw] = await Promise.all([
    fs.readFile(auditPath, "utf8"),
    fs.readFile(donePath, "utf8").catch(() => "[]"),
  ]);

  const doneJson = readJsonSafe(doneRaw);
  const done = new Set(Array.isArray(doneJson) ? doneJson.map((x) => String(x)) : []);

  const issues = parseAudit(auditRaw);
  const doneIssues = issues.filter((i) => done.has(i.id));
  const pendingIssues = issues.filter((i) => !done.has(i.id));

  const byPriorityPending = groupBy(pendingIssues, (i) => i.priority);
  const priorities = ["P0", "P1", "P2", "P3"];

  const lines = [];
  lines.push(`# Ground News Parity TODO`);
  lines.push(``);
  lines.push(`Generated from \`audit.md\`.`);
  lines.push(``);
  lines.push(`## Status`);
  lines.push(`- Total issues in audit: **${issues.length}**`);
  lines.push(`- Marked done in \`docs/parity/done_ids.json\`: **${doneIssues.length}**`);
  lines.push(`- Remaining pending: **${pendingIssues.length}**`);
  lines.push(``);
  lines.push(`## How To Use`);
  lines.push(`- Update done list: \`docs/parity/done_ids.json\``);
  lines.push(`- Regenerate: \`npm run parity:todo\``);
  lines.push(`- Smoke verify: \`npm run parity:smoke -- --base-url http://localhost:3000\``);
  lines.push(``);

  lines.push(`## Implemented (Checked Off)`);
  lines.push(`These are checked off based on code already landed on this branch. If any are only partial, remove them from \`done_ids.json\` and they’ll reappear under Pending.`);
  lines.push(``);
  for (const p of priorities) {
    const items = doneIssues.filter((i) => i.priority === p);
    if (!items.length) continue;
    lines.push(`### ${p}`);
    for (const i of items) {
      const sec = i.section ? `${i.section.id}. ${i.section.title}` : "";
      lines.push(`- [x] **${i.id}** (${p}${sec ? `, ${mdEscape(sec)}` : ""}): ${mdEscape(i.title)}`);
    }
    lines.push(``);
  }

  lines.push(`## Pending (Implement All Remaining)`);
  lines.push(``);
  for (const p of priorities) {
    const items = (byPriorityPending.get(p) || []).slice().sort((a, b) => a.id.localeCompare(b.id));
    if (!items.length) continue;
    lines.push(`### ${p}`);
    for (const i of items) {
      const sec = i.section ? `${i.section.id}. ${i.section.title}` : "";
      const files = i.fileHints && i.fileHints.length ? ` Files: ${i.fileHints.map((f) => `\`${f}\``).join(", ")}` : "";
      const fix = i.fixHints && i.fixHints.length ? ` Fix: ${i.fixHints[0]}` : "";
      lines.push(`- [ ] **${i.id}** (${p}${sec ? `, ${mdEscape(sec)}` : ""}): ${mdEscape(i.title)}${files}${fix ? ` ${mdEscape(fix)}` : ""}`);
    }
    lines.push(``);
  }

  lines.push(`## Notes`);
  lines.push(`- This file is a tracking artifact; the source of truth for issue descriptions remains \`audit.md\`.`);
  lines.push(`- Keep each TODO item tied to an audit ID so we can verify parity systematically.`);
  lines.push(``);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, lines.join("\n") + "\n", "utf8");
  console.log(`wrote ${path.relative(repoRoot, outPath)} (pending=${pendingIssues.length})`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});

