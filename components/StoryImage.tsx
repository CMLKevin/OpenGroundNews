"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { ImageProps } from "next/image";
import { STORY_IMAGE_FALLBACK } from "@/lib/format";

type Props = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function StoryImage({ src, fallbackSrc = STORY_IMAGE_FALLBACK, alt, ...rest }: Props) {
  const normalizedSrc = useMemo(() => {
    if (!src || !src.trim()) return fallbackSrc;
    return src;
  }, [src, fallbackSrc]);
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
        if (activeSrc !== fallbackSrc) setActiveSrc(fallbackSrc);
      }}
    />
  );
}
