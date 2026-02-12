"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { ImageProps } from "next/image";
import { pickStoryFallbackImage, STORY_IMAGE_FALLBACK } from "@/lib/format";

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

  const normalizedSrc = useMemo(() => {
    const clean = (src || "").trim();
    if (!clean || clean === STORY_IMAGE_FALLBACK) return derivedFallback;
    const lower = clean.toLowerCase();
    // Ground News "webMetaImg" endpoints bake bias bars into the image; treat as unusable to avoid
    // duplicating our own bias bars and to fix rounding artifacts in the UI.
    if (lower.includes("webmetaimg") || (lower.includes("webmeta") && lower.includes("img"))) return derivedFallback;
    return clean;
  }, [src, derivedFallback]);
  const [activeSrc, setActiveSrc] = useState(normalizedSrc);

  useEffect(() => {
    setActiveSrc(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <Image
      {...rest}
      src={activeSrc}
      alt={alt}
      onError={() => {
        if (activeSrc !== derivedFallback) setActiveSrc(derivedFallback);
      }}
    />
  );
}
