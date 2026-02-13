"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { ImageProps } from "next/image";
import { pickStoryFallbackImage, STORY_IMAGE_FALLBACK } from "@/lib/format";
import { buildImageProxyUrl } from "@/lib/media/imageProxyUrl";

type Props = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function StoryImage({ src, fallbackSrc, alt, ...rest }: Props) {
  const derivedFallback = useMemo(() => {
    if (fallbackSrc && fallbackSrc.trim()) return fallbackSrc.trim();
    const width = typeof rest.width === "number" ? rest.width : 0;
    const height = typeof rest.height === "number" ? rest.height : 0;
    const kind = Math.min(width || Infinity, height || Infinity) <= 120 ? "thumb" : "story";
    return pickStoryFallbackImage(String(alt || "story"), { kind });
  }, [fallbackSrc, rest.width, rest.height, alt]);

  const { normalizedSrc, directExternalSrc } = useMemo(() => {
    const clean = (src || "").trim();
    const lower = clean.toLowerCase();
    if (
      !clean ||
      clean === STORY_IMAGE_FALLBACK ||
      lower.includes("ground.news/images/story-fallback") ||
      lower.includes("ground.news/images/fallbacks/story-fallback")
    ) {
      return { normalizedSrc: derivedFallback, directExternalSrc: "" };
    }
    const looksLikePath = clean.startsWith("/") && !/\s/.test(clean);
    const looksLikeHttp = /^https?:\/\//i.test(clean);
    if (!looksLikePath && !looksLikeHttp) {
      return { normalizedSrc: derivedFallback, directExternalSrc: "" };
    }
    if (
      lower.includes("ground.news") &&
      (lower.includes("placeholder") || lower.includes("no-image") || lower.includes("image-unavailable"))
    ) {
      return { normalizedSrc: derivedFallback, directExternalSrc: "" };
    }
    // Ground News "webMetaImg" endpoints bake bias bars into the image; treat as unusable to avoid
    // duplicating our own bias bars and to fix rounding artifacts in the UI.
    if (lower.includes("webmetaimg") || (lower.includes("webmeta") && lower.includes("img"))) {
      return { normalizedSrc: derivedFallback, directExternalSrc: "" };
    }
    if (clean.startsWith("/images/cache/")) {
      return { normalizedSrc: clean, directExternalSrc: `https://ground.news${clean}` };
    }
    if (lower.startsWith("https://ground.news/images/cache/") || lower.startsWith("https://www.ground.news/images/cache/")) {
      return { normalizedSrc: buildImageProxyUrl(clean, { kind: "story" }), directExternalSrc: clean };
    }
    if (/^https?:\/\//i.test(clean)) {
      return { normalizedSrc: buildImageProxyUrl(clean, { kind: "story" }), directExternalSrc: clean };
    }
    return { normalizedSrc: clean, directExternalSrc: "" };
  }, [src, derivedFallback]);
  const [activeSrc, setActiveSrc] = useState(normalizedSrc);
  const [triedDirectExternal, setTriedDirectExternal] = useState(false);

  useEffect(() => {
    setActiveSrc(normalizedSrc);
    setTriedDirectExternal(false);
  }, [normalizedSrc, directExternalSrc]);

  return (
    <Image
      {...rest}
      src={activeSrc}
      alt={alt}
      onError={() => {
        if (!triedDirectExternal && directExternalSrc && activeSrc !== directExternalSrc) {
          setActiveSrc(directExternalSrc);
          setTriedDirectExternal(true);
          return;
        }
        if (activeSrc !== derivedFallback) setActiveSrc(derivedFallback);
      }}
    />
  );
}
