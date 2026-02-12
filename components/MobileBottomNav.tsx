"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { ReactNode } from "react";

type Item = { href: string; label: string; icon: ReactNode; match: (pathname: string) => boolean };

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const editionSuffix = useMemo(() => {
    const edition = searchParams.get("edition");
    return edition ? `?edition=${encodeURIComponent(edition)}` : "";
  }, [searchParams]);

  const items: Item[] = useMemo(
    () => [
      {
        href: `/${editionSuffix}`,
        label: "News",
        icon: <Icon d="M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2zm0 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z" />,
        match: (p) => p === "/",
      },
      {
        href: `/my${editionSuffix}`,
        label: "For You",
        icon: <Icon d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.42 0-8 2-8 4v2h16v-2c0-2-3.58-4-8-4z" />,
        match: (p) => p.startsWith("/my"),
      },
      {
        href: `/search${editionSuffix}`,
        label: "Search",
        icon: <Icon d="M10 2a8 8 0 1 0 4.9 14.32l4.39 4.39 1.41-1.41-4.39-4.39A8 8 0 0 0 10 2zm0 2a6 6 0 1 1-6 6 6 6 0 0 1 6-6z" />,
        match: (p) => p.startsWith("/search"),
      },
      {
        href: `/blindspot${editionSuffix}`,
        label: "Blindspot",
        icon: <Icon d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 5-5 5 5 0 0 1-5 5zm0-8a3 3 0 1 0 3 3 3 3 0 0 0-3-3z" />,
        match: (p) => p.startsWith("/blindspot"),
      },
      {
        href: `/local${editionSuffix}`,
        label: "Local",
        icon: <Icon d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z" />,
        match: (p) => p.startsWith("/local"),
      },
    ],
    [editionSuffix],
  );

  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom navigation">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.label}
            href={item.href.replace("//", "/")}
            className={`mobile-bottom-nav-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="mobile-bottom-nav-icon">{item.icon}</span>
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
