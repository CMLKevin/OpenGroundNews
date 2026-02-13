export function buildImageProxyUrl(rawUrl: string) {
  const clean = (rawUrl || "").trim();
  if (!clean) return "";
  return `/api/images/proxy?url=${encodeURIComponent(clean)}`;
}
