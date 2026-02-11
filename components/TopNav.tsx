"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const EDITION_KEY = "ogn_edition";

export function TopNav() {
  const [edition, setEdition] = useState("International");

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(EDITION_KEY);
    if (saved) setEdition(saved);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-utility">
        <div className="container topbar-utility-inner">
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <span>Ground-level coverage comparison</span>
            <span>•</span>
            <span>{todayLabel}</span>
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
          <nav className="navlinks">
            <Link href="/">Home</Link>
            <Link href="/blindspot">Blindspot</Link>
            <Link href="/local">Local</Link>
            <Link href="/rating-system">Ratings</Link>
            <Link href="/subscribe">Plans</Link>
            <Link href="/admin">Admin</Link>
          </nav>

          <form action="/" method="get" className="searchbar">
            <input
              name="q"
              placeholder="Search stories, topics, outlets"
              className="btn"
              style={{ textAlign: "left", background: "#fff" }}
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
              className="btn"
              value={edition}
              onChange={(e) => {
                setEdition(e.target.value);
                window.localStorage.setItem(EDITION_KEY, e.target.value);
              }}
            >
              <option value="International">International</option>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Europe">Europe</option>
            </select>
          </label>
          <Link className="btn" href="/subscribe">
            Subscribe
          </Link>
        </div>
      </div>
    </header>
  );
}
