export function validateStoryCandidate(story) {
  if (!story || typeof story !== "object") return { ok: false, reason: "invalid_story" };
  if (!String(story.title || "").trim()) return { ok: false, reason: "missing_title" };
  if (!String(story.slug || "").trim()) return { ok: false, reason: "missing_slug" };
  return { ok: true };
}
