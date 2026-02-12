import { slugify } from "@/lib/format";
import { SourceArticle, Story } from "@/lib/types";
import { canonicalTopicSlug, topicMatchesSlug } from "@/lib/topics";

export function topicSlug(label: string) {
  const normalized = canonicalTopicSlug(label || "");
  return normalized || slugify(label || "");
}

export function outletSlug(label: string) {
  return slugify(label || "");
}

export function storyHasTopicSlug(story: Story, slug: string) {
  const needle = (slug || "").trim().toLowerCase();
  if (!needle) return false;
  if (topicMatchesSlug(story.topic, needle)) return true;
  return story.tags.some((tag) => topicMatchesSlug(tag, needle));
}

export function sourceMatchesOutletSlug(source: SourceArticle, slug: string) {
  const needle = (slug || "").trim().toLowerCase();
  if (!needle) return false;
  return outletSlug(source.outlet).toLowerCase() === needle;
}
