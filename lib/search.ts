import { Story } from "@/lib/types";
import { readStore } from "@/lib/store";
import { outletSlug, topicSlug } from "@/lib/lookup";

function normalize(value: string) {
  return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 12);
}

function scoreHaystack(haystack: string, tokens: string[]): number {
  if (!haystack) return 0;
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (haystack.includes(token)) score += 1;
  }
  return score;
}

function storyScore(story: Story, tokens: string[], q: string): number {
  const title = normalize(story.title);
  const summary = normalize(story.summary);
  const dek = normalize(story.dek || "");
  const topic = normalize(story.topic);
  const tags = normalize((story.tags || []).join(" "));
  const outlets = normalize((story.sources || []).map((s) => s.outlet).join(" "));

  let score = 0;
  const phrase = normalize(q);
  if (phrase && title.includes(phrase)) score += 60;
  if (phrase && summary.includes(phrase)) score += 35;

  score += scoreHaystack(title, tokens) * 12;
  score += scoreHaystack(summary, tokens) * 8;
  score += scoreHaystack(dek, tokens) * 7;
  score += scoreHaystack(topic, tokens) * 10;
  score += scoreHaystack(tags, tokens) * 5;
  score += scoreHaystack(outlets, tokens) * 4;

  // Mild recency boost: newer stories float up among ties.
  const updated = +new Date(story.updatedAt || 0);
  if (Number.isFinite(updated) && updated > 0) score += Math.min(10, Math.floor((Date.now() - updated) / -86400000));

  return score;
}

export async function searchStories(params: { q: string; edition?: string; limit?: number }) {
  const q = (params.q || "").trim();
  const limit = Math.max(1, Math.min(200, params.limit ?? 60));
  const tokens = tokenize(q);
  const store = await readStore();

  let stories = store.stories;
  if (params.edition && params.edition.toLowerCase() !== "all") {
    const edition = params.edition.trim().toLowerCase();
    stories = stories.filter((story) => story.location.trim().toLowerCase() === edition);
  }

  if (!q) {
    return {
      q,
      count: 0,
      stories: [] as Story[],
      facets: { topics: [], outlets: [] } as const,
    };
  }

  const scored = stories
    .map((story) => ({ story, score: storyScore(story, tokens, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || +new Date(b.story.updatedAt) - +new Date(a.story.updatedAt));

  const top = scored.slice(0, limit).map((item) => item.story);

  const topicCounts = new Map<string, { slug: string; label: string; count: number }>();
  const outletCounts = new Map<string, { slug: string; label: string; count: number }>();
  for (const story of top) {
    const tSlug = topicSlug(story.topic);
    const t = topicCounts.get(tSlug) || { slug: tSlug, label: story.topic, count: 0 };
    t.count += 1;
    topicCounts.set(tSlug, t);

    for (const src of story.sources || []) {
      const oSlug = outletSlug(src.outlet);
      const o = outletCounts.get(oSlug) || { slug: oSlug, label: src.outlet, count: 0 };
      o.count += 1;
      outletCounts.set(oSlug, o);
    }
  }

  return {
    q,
    count: scored.length,
    stories: top,
    facets: {
      topics: Array.from(topicCounts.values()).sort((a, b) => b.count - a.count).slice(0, 12),
      outlets: Array.from(outletCounts.values()).sort((a, b) => b.count - a.count).slice(0, 12),
    },
  };
}

