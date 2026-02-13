import { slugify } from "@/lib/format";

type TopicDef = {
  slug: string;
  label: string;
  aliases: string[];
  keywords: string[];
};

const TOPIC_DEFS: TopicDef[] = [
  {
    slug: "us-news",
    label: "US News",
    aliases: [
      "us news",
      "us politics",
      "u.s. politics",
      "united states",
      "american politics",
      "washington",
      "congress",
      "white house",
      "u.s.",
      "usa",
    ],
    keywords: ["us", "u.s", "united states", "american", "washington", "congress", "white house"],
  },
  {
    slug: "world",
    label: "World",
    aliases: ["international", "global", "world news", "foreign affairs", "geopolitics", "europe", "asia", "middle east"],
    keywords: ["international", "global", "world", "foreign", "geopolitics", "europe", "asia", "middle east"],
  },
  {
    slug: "science",
    label: "Science",
    aliases: ["science & technology", "research", "space", "physics", "biology", "medical research"],
    keywords: ["science", "research", "space", "physics", "biology", "scientists"],
  },
  {
    slug: "technology",
    label: "Technology",
    aliases: ["tech", "cybersecurity", "software", "internet"],
    keywords: ["technology", "tech", "software", "internet", "cybersecurity"],
  },
  {
    slug: "artificial-intelligence",
    label: "Artificial Intelligence",
    aliases: ["ai", "artificial intelligence", "generative ai", "machine learning", "large language model"],
    keywords: ["artificial intelligence", "ai", "machine learning", "generative ai", "llm"],
  },
  {
    slug: "business",
    label: "Business",
    aliases: ["markets", "economy", "finance", "business & markets", "wall street"],
    keywords: ["business", "markets", "economy", "finance", "stocks", "wall street"],
  },
  {
    slug: "health",
    label: "Health",
    aliases: ["health & medicine", "medicine", "public health", "healthcare"],
    keywords: ["health", "medicine", "healthcare", "public health", "hospital"],
  },
  {
    slug: "sports",
    label: "Sports",
    aliases: ["sport", "athletics", "nfl", "nba", "mlb", "soccer"],
    keywords: ["sports", "sport", "athletics", "football", "basketball", "baseball", "soccer"],
  },
  {
    slug: "climate",
    label: "Climate",
    aliases: ["environment", "climate change", "global warming", "energy transition"],
    keywords: ["climate", "environment", "warming", "emissions", "energy transition"],
  },
  {
    slug: "politics",
    label: "Politics",
    aliases: ["government", "elections", "policy", "law"],
    keywords: ["politics", "government", "election", "policy", "lawmakers"],
  },
  {
    slug: "entertainment",
    label: "Entertainment",
    aliases: ["culture", "music", "movies", "film", "tv", "celebrity", "arts", "arts & entertainment"],
    keywords: ["entertainment", "music", "movie", "film", "tv", "celebrity", "arts"],
  },
];

const TOPIC_BY_SLUG = new Map(TOPIC_DEFS.map((topic) => [topic.slug, topic]));
const ALIAS_TO_SLUG = new Map<string, string>();

for (const topic of TOPIC_DEFS) {
  ALIAS_TO_SLUG.set(topic.slug, topic.slug);
  ALIAS_TO_SLUG.set(topic.label.toLowerCase(), topic.slug);
  ALIAS_TO_SLUG.set(slugify(topic.label.replace(/&/g, "and")), topic.slug);
  ALIAS_TO_SLUG.set(slugify(topic.label.replace(/\band\b/gi, "&")), topic.slug);
  for (const alias of topic.aliases) {
    ALIAS_TO_SLUG.set(alias.toLowerCase(), topic.slug);
    ALIAS_TO_SLUG.set(slugify(alias), topic.slug);
    ALIAS_TO_SLUG.set(slugify(alias.replace(/&/g, "and")), topic.slug);
    ALIAS_TO_SLUG.set(slugify(alias.replace(/\band\b/gi, "&")), topic.slug);
  }
}

function normalizeTopicKey(value: string) {
  return String(value || "").trim().toLowerCase();
}

export function canonicalTopicSlug(input: string) {
  const key = normalizeTopicKey(input);
  if (!key) return "";
  const direct = ALIAS_TO_SLUG.get(key);
  if (direct) return direct;
  const slug = slugify(key);
  return ALIAS_TO_SLUG.get(slug) || slug;
}

export function topicDisplayName(input: string) {
  const slug = canonicalTopicSlug(input);
  const topic = TOPIC_BY_SLUG.get(slug);
  if (topic) return topic.label;
  const raw = String(input || "").trim();
  if (!raw) return "Top Stories";
  return raw
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");
}

export function inferTopicSlugFromText(text: string, fallback: string) {
  const normalized = normalizeTopicKey(text);
  if (!normalized) return canonicalTopicSlug(fallback);
  const byAlias = canonicalTopicSlug(normalized);
  if (TOPIC_BY_SLUG.has(byAlias)) return byAlias;

  for (const topic of TOPIC_DEFS) {
    if (topic.keywords.some((keyword) => normalized.includes(keyword))) return topic.slug;
  }
  return canonicalTopicSlug(fallback);
}

export function topicMatchesSlug(input: string, slug: string) {
  const target = canonicalTopicSlug(slug);
  if (!target) return false;
  return canonicalTopicSlug(input) === target;
}
