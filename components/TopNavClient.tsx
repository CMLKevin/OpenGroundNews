"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogoLockup } from "@/components/LogoLockup";
import { DEFAULT_EDITION, EDITIONS } from "@/lib/constants";
import { FollowToggle } from "@/components/FollowToggle";

const EDITION_KEY = "ogn_edition";
const THEME_KEY = "ogn_theme";
const EDITION_COOKIE_KEY = "ogn_edition";

type SuggestResponse = {
  ok: boolean;
  q: string;
  stories: Array<{
    slug: string;
    title: string;
    topic: string;
    location: string;
    imageUrl?: string;
    sourceCount?: number;
    updatedAt?: string;
  }>;
  topics: Array<{ slug: string; label: string; count: number }>;
  outlets: Array<{ slug: string; label: string; logoUrl?: string | null }>;
};

function highlightQuery(text: string, query: string) {
  const value = String(text || "");
  const needle = String(query || "").trim();
  if (!needle) return value;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "ig");
  const chunks = value.split(re);
  const needleLower = needle.toLowerCase();
  return chunks.map((chunk, idx) =>
    chunk.toLowerCase() === needleLower ? (
      <mark className="search-highlight" key={`hl-${idx}`}>
        {chunk}
      </mark>
    ) : (
      <span key={`tx-${idx}`}>{chunk}</span>
    ),
  );
}

function initials(email: string) {
  const handle = (email || "").split("@")[0] || "?";
  return handle.slice(0, 2).toUpperCase();
}

export function TopNavClient() {
  const [edition, setEdition] = useState(DEFAULT_EDITION);
  const [theme, setTheme] = useState<"dark" | "light" | "auto">("light");
  const [user, setUser] = useState<null | { id: string; email: string; role: "user" | "admin" }>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState<SuggestResponse | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  const suggestAbort = useRef<AbortController | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showHeaderSearch = pathname !== "/search";

  useEffect(() => {
    const fromQuery = searchParams.get("edition");
    if (fromQuery && EDITIONS.includes(fromQuery as (typeof EDITIONS)[number])) {
      setEdition(fromQuery);
      window.localStorage.setItem(EDITION_KEY, fromQuery);
      document.cookie = `${EDITION_COOKIE_KEY}=${encodeURIComponent(fromQuery)}; Path=/; Max-Age=31536000; SameSite=Lax`;
      return;
    }
    const saved = window.localStorage.getItem(EDITION_KEY);
    if (saved && EDITIONS.includes(saved as (typeof EDITIONS)[number])) {
      setEdition(saved);
      document.cookie = `${EDITION_COOKIE_KEY}=${encodeURIComponent(saved)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const cookieMatch = document.cookie.match(/(?:^|; )ogn_theme=([^;]+)/);
      const cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1] || "") : "";
      const fromCookie = cookieTheme === "light" || cookieTheme === "dark" || cookieTheme === "auto" ? cookieTheme : "";
      const saved = window.localStorage.getItem(THEME_KEY) as any;
      const fromLocal = saved === "light" || saved === "dark" || saved === "auto" ? saved : "";

      const next = (fromCookie || fromLocal || "light") as "light" | "dark" | "auto";
      setTheme(next);
      document.documentElement.dataset.theme = next;

      // One-time sync: if cookie missing but localStorage has a value, persist it to cookie for SSR alignment next load.
      if (!fromCookie && fromLocal) {
        document.cookie = `ogn_theme=${encodeURIComponent(fromLocal)}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }
    } catch {
      setTheme("auto");
      document.documentElement.dataset.theme = "auto";
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; user: any };
        if (!alive) return;
        setUser(data?.user || null);
      } catch {
        if (!alive) return;
        setUser(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSuggestOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function hrefWithEdition(target: string) {
    const params = new URLSearchParams();
    if (edition) params.set("edition", edition);
    return params.toString() ? `${target}?${params.toString()}` : target;
  }

  function updateEdition(nextEdition: string) {
    setEdition(nextEdition);
    window.localStorage.setItem(EDITION_KEY, nextEdition);
    document.cookie = `${EDITION_COOKIE_KEY}=${encodeURIComponent(nextEdition)}; Path=/; Max-Age=31536000; SameSite=Lax`;

    const params = new URLSearchParams(searchParams.toString());
    params.set("edition", nextEdition);
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function applyTheme(next: "dark" | "light" | "auto") {
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
    document.cookie = `ogn_theme=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.dataset.theme = next;
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.refresh();
    }
  }

  const searchActionUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("edition", edition);
    if (q.trim()) params.set("q", q.trim());
    return `/search?${params.toString()}`;
  }, [edition, q]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setSuggest(null);
      setSuggestOpen(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        suggestAbort.current?.abort();
        const controller = new AbortController();
        suggestAbort.current = controller;
        setLoadingSuggest(true);
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await res.json()) as SuggestResponse;
        setSuggest(json);
        setSuggestOpen(true);
      } catch {
        setSuggest(null);
        setSuggestOpen(false);
      } finally {
        setLoadingSuggest(false);
      }
    }, 150);

    return () => window.clearTimeout(handle);
  }, [q]);

  const navLinks = (
    <>
      <Link className={pathname === "/" ? "is-active" : ""} href={hrefWithEdition("/")}>
        Home
      </Link>
      <Link className={pathname.startsWith("/my") ? "is-active" : ""} href={hrefWithEdition("/my")}>
        For You <span className="for-you-dot" aria-hidden="true" />
      </Link>
      <Link className={pathname.startsWith("/my-news-bias") ? "is-active" : ""} href={hrefWithEdition("/my-news-bias")}>
        My Bias
      </Link>
      <Link className={pathname.startsWith("/local") ? "is-active" : ""} href={hrefWithEdition("/local")}>
        Local
      </Link>
      <Link className={pathname.startsWith("/blindspot") ? "is-active" : ""} href={hrefWithEdition("/blindspot")}>
        Blindspot
      </Link>
      {user?.role === "admin" ? (
        <Link className={pathname.startsWith("/admin") ? "is-active" : ""} href={hrefWithEdition("/admin")}>
          Admin
        </Link>
      ) : null}
    </>
  );

  return (
    <div className="container topbar-main">
      <Link href="/" className="logo" aria-label="OpenGroundNews home">
        <LogoLockup />
      </Link>

      <div className="nav-center">
        <nav className="navlinks" aria-label="Primary">
          {navLinks}
          <Link className="btn btn-subscribe nav-desktop-only" href={hrefWithEdition("/subscribe")}>
            Subscribe
          </Link>
        </nav>

        {showHeaderSearch ? (
          <div className="searchwrap" role="search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Enter an article's title, URL, or type to search..."
              className="input-control"
              type="search"
              aria-label="Search stories, topics, outlets"
              onFocus={() => {
                if (suggest) setSuggestOpen(true);
              }}
            />
            <Link className="btn" href={searchActionUrl} onClick={() => setSuggestOpen(false)}>
              Search
            </Link>

            {suggestOpen && suggest ? (
              <div className="suggest-pop" role="listbox" aria-label="Search suggestions">
                <div className="suggest-head">
                  <span className="story-meta">Suggestions</span>
                  <span className="story-meta">{loadingSuggest ? "Loading..." : ""}</span>
                </div>

                {suggest.stories.length > 0 ? (
                  <div className="suggest-section">
                    <div className="suggest-title">Stories</div>
                    {suggest.stories.map((s) => (
                      <Link
                        key={s.slug}
                        className="suggest-item"
                        href={`/story/${encodeURIComponent(s.slug)}`}
                        onClick={() => setSuggestOpen(false)}
                      >
                        <span className="suggest-item-main">
                          {s.imageUrl ? <img src={s.imageUrl} alt={s.title} className="suggest-story-thumb" /> : null}
                          <span>{highlightQuery(s.title, q)}</span>
                        </span>
                        <span className="suggest-item-sub">
                          {s.topic} • {s.location}
                          {typeof s.sourceCount === "number" ? ` • ${s.sourceCount} sources` : ""}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {suggest.topics.length > 0 ? (
                  <div className="suggest-section">
                    <div className="suggest-title">Topics</div>
                    <div className="suggest-rich-list">
                      {suggest.topics.map((t) => (
                        <div key={t.slug} className="suggest-rich-item">
                          <Link
                            className="suggest-rich-main"
                            href={`/interest/${encodeURIComponent(t.slug)}`}
                            onClick={() => setSuggestOpen(false)}
                          >
                            <span className="topic-avatar">{t.label.slice(0, 1).toUpperCase()}</span>
                            <span>{t.label}</span>
                            <span className="story-meta">{t.count.toLocaleString()} stories</span>
                          </Link>
                          <FollowToggle kind="topic" slug={t.slug} label={t.label} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {suggest.outlets.length > 0 ? (
                  <div className="suggest-section">
                    <div className="suggest-title">Sources</div>
                    <div className="suggest-rich-list">
                      {suggest.outlets.map((o) => (
                        <div key={o.slug} className="suggest-rich-item">
                          <Link
                            className="suggest-rich-main"
                            href={`/source/${encodeURIComponent(o.slug)}`}
                            onClick={() => setSuggestOpen(false)}
                          >
                            <span className="topic-avatar">
                              {o.logoUrl ? <img src={String(o.logoUrl)} alt={o.label} className="u-avatar-24" /> : o.label.slice(0, 1).toUpperCase()}
                            </span>
                            <span>{o.label}</span>
                          </Link>
                          <FollowToggle kind="outlet" slug={o.slug} label={o.label} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {suggest.stories.length === 0 && suggest.topics.length === 0 && suggest.outlets.length === 0 ? (
                  <p className="story-meta u-m0">
                    No suggestions yet.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="nav-actions">
        <button
          className="btn nav-hamburger"
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"
            />
          </svg>
        </button>

        <label className="story-meta nav-desktop-only u-grid u-grid-gap-02">
          <span className="nav-edition-label">
            <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm7.9 9h-3.1a15.6 15.6 0 0 0-1.2-5 8 8 0 0 1 4.3 5zM12 4c1 1.3 2 3.8 2.5 7H9.5C10 7.8 11 5.3 12 4zM8.4 6a15.6 15.6 0 0 0-1.2 5H4.1a8 8 0 0 1 4.3-5zM4.1 13h3.1a15.6 15.6 0 0 0 1.2 5 8 8 0 0 1-4.3-5zm7.9 7c-1-1.3-2-3.8-2.5-7h5c-.5 3.2-1.5 5.7-2.5 7zm3.6-2a15.6 15.6 0 0 0 1.2-5h3.1a8 8 0 0 1-4.3 5z" />
            </svg>
            {edition}: Edition
          </span>
          <select
            className="select-control"
            value={edition}
            onChange={(e) => updateEdition(e.target.value)}
            aria-label="Edition"
          >
            {EDITIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="theme-toggle nav-desktop-only" aria-label="Theme selector">
          <span className="story-meta">Theme:</span>
          <button
            type="button"
            className={`theme-link ${theme === "light" ? "is-active" : ""}`}
            onClick={() => applyTheme("light")}
          >
            Light
          </button>
          <span className="theme-dot" aria-hidden="true">|</span>
          <button
            type="button"
            className={`theme-link ${theme === "dark" ? "is-active" : ""}`}
            onClick={() => applyTheme("dark")}
          >
            Dark
          </button>
          <span className="theme-dot" aria-hidden="true">|</span>
          <button
            type="button"
            className={`theme-link ${theme === "auto" ? "is-active" : ""}`}
            onClick={() => applyTheme("auto")}
          >
            Auto
          </button>
        </div>

        {user ? (
          <>
            <Link className="avatar-chip nav-desktop-only" href={hrefWithEdition("/my")} aria-label="Open profile">
              <span className="avatar-circle" aria-hidden="true">
                {initials(user.email)}
              </span>
            </Link>
            <button className="btn nav-desktop-only" type="button" onClick={logout} aria-label="Sign out">
              Sign out
            </button>
          </>
        ) : (
          <Link
            className="btn nav-desktop-only"
            href={`/login?next=${encodeURIComponent(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ""))}`}
          >
            My Account
          </Link>
        )}
      </div>

      {menuOpen ? (
        <div
          className="nav-drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setMenuOpen(false);
          }}
        >
          <aside className="nav-drawer">
            <div className="nav-drawer-head">
              <strong>OpenGroundNews</strong>
              <button className="btn" type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                Close
              </button>
            </div>

            <div className="nav-drawer-section">
              <div className="nav-drawer-title">Navigation</div>
              <div className="nav-drawer-links" onClick={() => setMenuOpen(false)}>
                {navLinks}
              </div>
            </div>

            <div className="nav-drawer-section">
              <div className="nav-drawer-title">Topic Categories</div>
              <div className="nav-drawer-links" onClick={() => setMenuOpen(false)}>
                <Link href="/interest/politics">International Politics</Link>
                <Link href="/interest/business">Finance</Link>
                <Link href="/interest/science">Science</Link>
                <Link href="/interest/technology">Technology</Link>
                <Link href="/interest/health">Health</Link>
                <Link href="/interest/sports">Sports</Link>
              </div>
            </div>

            <div className="nav-drawer-section">
              <div className="nav-drawer-title">More</div>
              <div className="nav-drawer-links" onClick={() => setMenuOpen(false)}>
                <Link href="/rating-system">Rating system</Link>
                <Link href="/about/methodology">Methodology</Link>
                <Link href="/newsletters">Newsletters</Link>
                <Link href="/compare">Compare</Link>
                <Link href="/calendar">Calendar</Link>
                <Link href="/maps">Maps</Link>
                <Link href="/extension">Extension</Link>
                <Link href="/notifications">Notifications</Link>
                <Link href="/subscribe">Subscribe</Link>
              </div>
            </div>

            <div className="nav-drawer-section">
              <div className="nav-drawer-title">Search</div>
              <Link className="btn" href={searchActionUrl} onClick={() => setMenuOpen(false)}>
                Search for “{q.trim() || "..." }”
              </Link>
            </div>

            <div className="nav-drawer-section">
              <div className="nav-drawer-title">Preferences</div>
              <label className="story-meta u-grid u-grid-gap-02">
                <span className="nav-edition-label">{edition}: Edition</span>
                <select className="select-control" value={edition} onChange={(e) => updateEdition(e.target.value)}>
                  {EDITIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="theme-toggle" aria-label="Theme selector">
                <span className="story-meta">Theme:</span>
                <button type="button" className={`theme-link ${theme === "light" ? "is-active" : ""}`} onClick={() => applyTheme("light")}>
                  Light
                </button>
                <span className="theme-dot" aria-hidden="true">|</span>
                <button type="button" className={`theme-link ${theme === "dark" ? "is-active" : ""}`} onClick={() => applyTheme("dark")}>
                  Dark
                </button>
                <span className="theme-dot" aria-hidden="true">|</span>
                <button type="button" className={`theme-link ${theme === "auto" ? "is-active" : ""}`} onClick={() => applyTheme("auto")}>
                  Auto
                </button>
              </div>
            </div>

            <div className="nav-drawer-section">
              <div className="nav-drawer-title">Account</div>
              {user ? (
                <>
                  <div className="story-meta">Signed in as {user.email}</div>
                  <button className="btn" type="button" onClick={() => { setMenuOpen(false); logout(); }}>
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  className="btn"
                  href={`/login?next=${encodeURIComponent(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ""))}`}
                  onClick={() => setMenuOpen(false)}
                >
                  My Account
                </Link>
              )}
            </div>

            <div className="nav-drawer-section">
              <div className="nav-drawer-title">Contact Us</div>
              <div className="nav-drawer-links" onClick={() => setMenuOpen(false)}>
                <Link href="/help">Help Center</Link>
                <Link href="/about/methodology">About OpenGroundNews</Link>
                <a href={`mailto:${process.env.NEXT_PUBLIC_OGN_SUPPORT_EMAIL || "support@opengroundnews.com"}`}>Email support</a>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
