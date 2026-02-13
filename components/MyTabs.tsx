"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const tabs = [
  { href: "/my", label: "My Feed" },
  { href: "/my/discover", label: "Discover" },
  { href: "/my/custom-feeds", label: "Custom Feeds" },
  { href: "/my/saved", label: "Saved Stories" },
  { href: "/my/citations", label: "Citations" },
  { href: "/my/manage", label: "Manage Sources & Topics" },
];

export function MyTabs() {
  const pathname = usePathname() || "/my";
  const searchParams = useSearchParams();
  const edition = (searchParams.get("edition") || "").trim();

  return (
    <nav className="my-tabs" aria-label="For You tabs">
      {tabs.map((t) => {
        const active = pathname === t.href;
        const href = edition ? `${t.href}?edition=${encodeURIComponent(edition)}` : t.href;
        return (
          <Link key={t.href} href={href} className={`my-tab ${active ? "is-active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
