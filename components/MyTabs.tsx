"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav className="my-tabs" aria-label="For You tabs">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} className={`my-tab ${active ? "is-active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
