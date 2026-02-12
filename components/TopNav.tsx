"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const EDITION_KEY = "ogn_edition";
const DEFAULT_EDITION = "International";
const EDITIONS = ["International", "United States", "Canada", "United Kingdom", "Europe"] as const;

export function TopNav() {
  const [edition, setEdition] = useState(DEFAULT_EDITION);
  const [todayLabel, setTodayLabel] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setTodayLabel(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);

  useEffect(() => {
    const fromQuery = searchParams.get("edition");
    if (fromQuery && EDITIONS.includes(fromQuery as (typeof EDITIONS)[number])) {
      setEdition(fromQuery);
      window.localStorage.setItem(EDITION_KEY, fromQuery);
      return;
    }
    const saved = window.localStorage.getItem(EDITION_KEY);
    if (saved && EDITIONS.includes(saved as (typeof EDITIONS)[number])) {
      setEdition(saved);
    }
  }, [searchParams]);

  function hrefWithEdition(target: string) {
    const params = new URLSearchParams();
    if (edition) params.set("edition", edition);
    return params.toString() ? `${target}?${params.toString()}` : target;
  }

  function updateEdition(nextEdition: string) {
    setEdition(nextEdition);
    window.localStorage.setItem(EDITION_KEY, nextEdition);

    const params = new URLSearchParams(searchParams.toString());
    params.set("edition", nextEdition);
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <header className="topbar">
      <div className="topbar-utility">
        <div className="container topbar-utility-inner">
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <span>Ground-level coverage comparison</span>
            <span>•</span>
            <span>{todayLabel || "Loading date..."}</span>
          </div>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Link href="/rating-system">Methodology</Link>
            <span>•</span>
            <Link href="/subscribe">Support OpenGroundNews</Link>
          </div>
        </div>
      </div>

      <div className="container topbar-main">
        <Link href="/" className="logo">
          OpenGroundNews
          <small>Perspective Aggregation • Open Infrastructure</small>
        </Link>

        <div className="nav-center">
          <nav className="navlinks" aria-label="Primary">
            <Link href={hrefWithEdition("/")}>Home</Link>
            <Link href={hrefWithEdition("/my")}>For You</Link>
            <Link href={hrefWithEdition("/blindspot")}>Blindspot</Link>
            <Link href={hrefWithEdition("/local")}>Local</Link>
            <Link href={hrefWithEdition("/rating-system")}>Ratings</Link>
            <Link href={hrefWithEdition("/subscribe")}>Plans</Link>
            <Link href={hrefWithEdition("/admin")}>Admin</Link>
          </nav>

          <form action="/" method="get" className="searchbar">
            <input type="hidden" name="edition" value={edition} />
            <input
              name="q"
              placeholder="Search stories, topics, outlets"
              className="input-control"
              type="search"
              aria-label="Search stories, topics, outlets"
            />
            <button className="btn" type="submit">
              Search
            </button>
          </form>
        </div>

        <div className="nav-actions">
          <label className="story-meta" style={{ display: "grid", gap: "0.2rem" }}>
            Edition
            <select
              className="select-control"
              value={edition}
              onChange={(e) => {
                updateEdition(e.target.value);
              }}
            >
              {EDITIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Link className="btn" href={hrefWithEdition("/subscribe")}>
            Subscribe
          </Link>
        </div>
      </div>
    </header>
  );
}
