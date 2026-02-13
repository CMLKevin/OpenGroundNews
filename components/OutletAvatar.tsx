"use client";

import { useEffect, useMemo, useState } from "react";
import { outletInitials, outletLogoCandidates } from "@/lib/media/outletLogo";

type Props = {
  outlet: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  sourceUrl?: string | null;
  className: string;
  fallbackClassName?: string;
  title?: string;
};

export function OutletAvatar({
  outlet,
  logoUrl,
  websiteUrl,
  sourceUrl,
  className,
  fallbackClassName,
  title,
}: Props) {
  const candidates = useMemo(
    () => outletLogoCandidates({ logoUrl, websiteUrl, sourceUrl }),
    [logoUrl, websiteUrl, sourceUrl],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const active = candidates[index] || "";

  if (!active) {
    return (
      <span className={fallbackClassName || className} title={title || outlet} aria-hidden="true">
        {outletInitials(outlet)}
      </span>
    );
  }

  return (
    <img
      src={active}
      alt={outlet}
      title={title || outlet}
      className={className}
      onError={() => {
        setIndex((current) => current + 1);
      }}
    />
  );
}
