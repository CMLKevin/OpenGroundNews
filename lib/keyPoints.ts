import { Story } from "@/lib/types";

function normalizeWhitespace(value: string) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  const clean = normalizeWhitespace(text);
  if (!clean) return [];

  // Best-effort sentence splitting without pulling in heavy deps.
  return clean
    .split(/(?<=[.?!])\s+(?=[A-Z0-9"“])/g)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean);
}

function fingerprint(value: string): string {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isTooSimilar(a: string, b: string): boolean {
  const fa = fingerprint(a);
  const fb = fingerprint(b);
  if (!fa || !fb) return false;
  if (fa === fb) return true;
  // Cheap containment check catches near-duplicates.
  return fa.length >= 32 && (fa.includes(fb) || fb.includes(fa));
}

export function deriveKeyPoints(story: Story, opts?: { max?: number }): string[] {
  const max = Math.max(2, Math.min(6, opts?.max ?? 4));
  const candidates: Array<{ text: string; weight: number }> = [];

  const dek = normalizeWhitespace(story.dek || "");
  const summary = normalizeWhitespace(story.summary || "");

  for (const s of splitSentences(dek)) {
    candidates.push({ text: s, weight: 6 });
  }
  for (const s of splitSentences(summary)) {
    candidates.push({ text: s, weight: 5 });
  }

  // Pull a few source excerpts as additional material.
  for (const source of story.sources.slice(0, 10)) {
    const excerpt = normalizeWhitespace(source.excerpt || "");
    if (!excerpt) continue;
    for (const s of splitSentences(excerpt).slice(0, 2)) {
      candidates.push({ text: s, weight: 2 });
    }
  }

  const filtered = candidates
    .map((c) => ({ ...c, text: normalizeWhitespace(c.text) }))
    .filter((c) => c.text.length >= 42 && c.text.length <= 220)
    .filter((c) => !/excerpt unavailable|coverage excerpt from/i.test(c.text));

  // Rank: prefer higher-weight and earlier candidates; lightly prefer numbers and proper nouns.
  filtered.sort((a, b) => {
    const boost = (t: string) => (/\b\d{2,}\b/.test(t) ? 1 : 0) + (/[A-Z][a-z]{2,}/.test(t) ? 1 : 0);
    const scoreA = a.weight * 10 + boost(a.text);
    const scoreB = b.weight * 10 + boost(b.text);
    if (scoreA === scoreB) return a.text.length - b.text.length;
    return scoreB - scoreA;
  });

  const picked: string[] = [];
  for (const { text } of filtered) {
    if (picked.length >= max) break;
    if (picked.some((p) => isTooSimilar(p, text))) continue;
    picked.push(text);
  }

  return picked;
}

