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
    if (!clean || clean === STORY_IMAGE_FALLBACK) {
      return { normalizedSrc: derivedFallback, directExternalSrc: "" };
    }
    const lower = clean.toLowerCase();
    // Ground News "webMetaImg" endpoints bake bias bars into the image; treat as unusable to avoid
    // duplicating our own bias bars and to fix rounding artifacts in the UI.
    if (lower.includes("webmetaimg") || (lower.includes("webmeta") && lower.includes("img"))) {
      return { normalizedSrc: derivedFallback, directExternalSrc: "" };
    }
    if (/^https?:\/\//i.test(clean)) {
      return { normalizedSrc: buildImageProxyUrl(clean), directExternalSrc: clean };
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
