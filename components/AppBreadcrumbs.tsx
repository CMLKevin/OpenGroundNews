"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  about: "About",
  admin: "Admin",
  blindspot: "Blindspot",
  blog: "Blog",
  calendar: "Calendar",
  compare: "Compare",
  discover: "Discover",
  help: "Help",
  interest: "Topic",
  login: "Sign In",
  manage: "Manage",
  maps: "Maps",
  my: "For You",
  "my-news-bias": "My News Bias",
  newsletters: "Newsletters",
  privacy: "Privacy",
  rating: "Ratings",
  "rating-system": "Rating System",
  reader: "Reader",
  reset: "Reset",
  search: "Search",
  signup: "Sign Up",
  source: "Source",
  story: "Story",
  terms: "Terms",
  testimonials: "Testimonials",
};

function segmentLabel(segment: string) {
  const clean = String(segment || "").trim().toLowerCase();
  if (!clean) return "";
  if (LABELS[clean]) return LABELS[clean];
  return clean
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AppBreadcrumbs() {
  const pathname = usePathname() || "/";
  if (pathname === "/" || pathname.startsWith("/api/")) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <div className="container">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">
          Home
        </Link>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = segmentLabel(segment);
          return (
            <span key={`${href}-${segment}`} className="u-inline-flex u-items-center u-gap-052">
              <span className="breadcrumb-sep" aria-hidden="true">
                /
              </span>
              {isLast ? (
                <span className="breadcrumb-current">{label}</span>
              ) : (
                <Link href={href} className="breadcrumb-link">
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
