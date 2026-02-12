import { slugify } from "@/lib/format";
import { SourceArticle, Story } from "@/lib/types";

export function topicSlug(label: string) {
  return slugify(label || "");
}

export function outletSlug(label: string) {
  return slugify(label || "");
}

export function storyHasTopicSlug(story: Story, slug: string) {
  const needle = (slug || "").trim().toLowerCase();
  if (!needle) return false;
  return story.tags.some((tag) => topicSlug(tag).toLowerCase() === needle);
}

export function sourceMatchesOutletSlug(source: SourceArticle, slug: string) {
  const needle = (slug || "").trim().toLowerCase();
  if (!needle) return false;
  return outletSlug(source.outlet).toLowerCase() === needle;
}

