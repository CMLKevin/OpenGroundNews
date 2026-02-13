export function safeAppPath(value: string | null | undefined, fallback = "/my"): string {
  const raw = String(value || "").trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  try {
    const parsed = new URL(raw, "https://opengroundnews.local");
    if (parsed.origin !== "https://opengroundnews.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
}
