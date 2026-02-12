#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";

function parseChecklist(markdown) {
  const lines = String(markdown || "").split("\n");
  let currentSection = null;
  const issues = [];

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+([A-Z])\.\s+(.*)\s*$/);
    if (sectionMatch) {
      currentSection = {
        id: sectionMatch[1],
        title: sectionMatch[2].trim(),
      };
      continue;
    }

    const issueMatch = line.match(/^###\s+([A-Z]\d+)\.\s+(.*?)\s+\[(P[0-3])\]\s*$/);
    if (issueMatch) {
      issues.push({
        id: issueMatch[1],
        title: issueMatch[2].trim(),
        priority: issueMatch[3],
        section: currentSection ? { ...currentSection } : null,
        status: "open",
        verifiedAt: null,
        notes: "",
      });
    }
  }

  return issues;
}

async function main() {
  const repoRoot = process.cwd();
  const auditPath = path.join(repoRoot, "audit.md");
  const outPath = path.join(repoRoot, "docs", "parity", "audit_2026-02-12.checklist.json");

  const raw = await fs.readFile(auditPath, "utf8");
  const issues = parseChecklist(raw);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "audit.md",
    issueCount: issues.length,
    issues,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`wrote ${path.relative(repoRoot, outPath)} (issues=${issues.length})`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});

