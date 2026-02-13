type ImageProxyKind = "generic" | "logo" | "story";

type BuildImageProxyOptions = {
  kind?: ImageProxyKind;
};

export function buildImageProxyUrl(rawUrl: string, options: BuildImageProxyOptions = {}) {
  const clean = (rawUrl || "").trim();
  if (!clean) return "";
  const params = new URLSearchParams();
  params.set("url", clean);
  if (options.kind && options.kind !== "generic") params.set("kind", options.kind);
  return `/api/images/proxy?${params.toString()}`;
}
