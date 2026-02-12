# OpenGroundNews Bug Audit Report

**Date:** 2026-02-11
**Auditors:** Visual UI Auditor, Data/API Auditor, Pipeline Auditor, Browser Visual Inspection
**Site:** http://localhost:3000
**Commit:** `a7993fe` (branch: main)

---

## Executive Summary

**49 distinct bugs** found across 4 audit categories: 4 critical, 12 high, 19 medium, 14 low.

The most impactful issues fall into three themes:
1. **Fabricated data** -- source excerpts, bias/factuality ratings, perspective summaries, and timestamps are all generated from hash functions, not extracted from real sources
2. **Broken UI controls** -- Edition selector and Local location filter do nothing; PerspectiveTabs have no active state
3. **Visual noise from scraped images** -- Ground News CDN images contain embedded bias bar overlays that conflict with the app's own bias visualization

---

## CRITICAL

### C1. All source excerpts are placeholder text
- **Severity:** CRITICAL
- **Scope:** All story detail pages, SourceCoveragePanel
- **Files:** `scripts/sync_groundnews_pipeline.mjs:213`, `data/store.json`
- **Description:** 320 of 324 source articles show `"Coverage excerpt from <domain>."` instead of real article excerpts. The `enrichStory` function hardcodes this template string and never fetches actual article content.
- **Impact:** The entire perspective-comparison value proposition is broken. Users cannot compare how outlets frame stories.
- **Fix:** Extract `og:description` or leading paragraph from each source URL during enrichment; or hide excerpts matching the placeholder pattern.

### C2. Bias, factuality, ownership, and paywall ratings are fabricated from domain-name hashes
- **Severity:** CRITICAL
- **Scope:** All pages displaying source metadata
- **Files:** `scripts/sync_groundnews_pipeline.mjs:79-113`
- **Description:** Every source metadata field is derived from a deterministic DJB2 hash of the outlet domain. Bloomberg is labeled "low" factuality, CTV News "very-low". None match reality.
- **Impact:** Actively misinforms users about media bias and factuality. Worse than showing no data.
- **Fix:** Parse actual bias/factuality from Ground News story pages using CDP browser (not plain fetch), or maintain a curated lookup table.

### C3. PerspectiveTabs generates fabricated perspective text
- **Severity:** CRITICAL
- **Scope:** `/story/[slug]` -- Perspective Summary section
- **File:** `components/PerspectiveTabs.tsx:8-19`
- **Description:** `buildPerspectiveText()` appends identical boilerplate strings to `story.summary` for each perspective. No actual source framing is analyzed.
- **Impact:** Presents fabricated text as genuine multi-perspective analysis, undermining credibility.
- **Fix:** Aggregate real excerpts by source bias bucket, or remove the panel until real data is available.

### C4. Root cause: enrichStory uses plain fetch on JS-rendered SPA
- **Severity:** CRITICAL
- **Scope:** Entire ingestion pipeline
- **File:** `scripts/sync_groundnews_pipeline.mjs:153-161`
- **Description:** Ground News is a Next.js SPA. A plain `fetch` + cheerio only sees the server-rendered shell, missing source listings, bias data, and tags rendered client-side. This is why C1, C2, C3, and other data issues exist.
- **Fix:** Use the already-open CDP browser session to navigate to story detail pages and extract from the fully rendered DOM.

---

## HIGH

### H1. Tags contain outlet names and bias labels instead of topical tags
- **Scope:** Homepage trending strip, story detail Related Topics
- **Files:** `scripts/sync_groundnews_pipeline.mjs:185-190`, `data/store.json`
- **Description:** Tags like `["Donald Trump", "National Post", "Lean Right", "The Straits Times"]` mix real topics with outlet names and bias labels. The trending strip shows "Center", "Lean Left", "Lean Right", "Right" as top trending topics.
- **Visually confirmed** via browser inspection.

### H2. Edition selector is non-functional
- **Scope:** All pages (TopNav)
- **File:** `components/TopNav.tsx:73-91`
- **Description:** Saves to localStorage but never read by any data-fetching function. Selecting "United States" vs "International" has zero effect.

### H3. LocalFeedControls location input is non-functional
- **Scope:** `/local`
- **Files:** `components/LocalFeedControls.tsx`, `app/local/page.tsx:8`
- **Description:** Client-side component saves location to localStorage, but the server component always calls `listStories({ view: "local" })` with no location parameter.

### H4. Story card images contain embedded Ground News bias bars
- **Scope:** All story cards and lead story on homepage
- **Files:** `data/store.json` (imageUrl field), `components/StoryCard.tsx`
- **Description:** CDN images from `web-api-cdn.ground.news` include Ground News's own bias bar overlay (e.g., "56% Center", "75% Right") baked into the image. These show DIFFERENT percentages than the app's own BiasBar below, creating contradictory visual information.
- **Visually confirmed** on every card with a Ground News CDN image.

### H5. Multiple story card images completely blank
- **Scope:** Homepage grid, `/local`, `/blindspot`
- **Files:** `lib/format.ts:68-102`, `data/store.json`
- **Description:** 6+ stories render with empty white/gray rectangles. The `sanitizeStoryImageUrl` correctly falls back to an Unsplash URL, but that URL sometimes fails to load, leaving blank cards.
- **Visually confirmed** on Local page and lower homepage grid.

### H6. WCAG AA contrast failure on meta text
- **Scope:** All pages
- **File:** `app/globals.css:267-268`
- **Description:** `--ink-muted` (#6d7883) on `--bg` (#ecefe8) = 3.88:1 contrast ratio. Fails WCAG AA minimum of 4.5:1. Affects every `.story-meta` element site-wide.
- **Fix:** Darken `--ink-muted` to at least `#5c6872`.

### H7. No focus-visible styles for any interactive elements
- **Scope:** All pages
- **File:** `app/globals.css`
- **Description:** Zero `:focus`, `:focus-visible`, or `:focus-within` rules. Keyboard navigation has no visible focus indicator against the muted green/beige palette.

### H8. Ingestion and archive APIs have zero authentication
- **Scope:** `POST /api/ingest/groundnews`, `POST /api/archive/read`
- **Files:** `app/api/ingest/groundnews/route.ts`, `app/api/archive/read/route.ts`
- **Description:** No auth, no API key, no rate limiting. Anyone can trigger expensive CDP browser sessions.

### H9. store.json write lock doesn't cover read-modify-write cycle
- **Scope:** All data mutations
- **File:** `lib/store.ts:46-51, 76-91`
- **Description:** The lock only serializes `writeFile` calls. Concurrent `setArchiveEntry` or `upsertStories` calls can read the same snapshot and overwrite each other's changes.

### H10. No atomic write strategy -- crash during write corrupts store.json
- **Scope:** All data persistence
- **Files:** `lib/store.ts:48`, `scripts/sync_groundnews_pipeline.mjs:48`
- **Description:** Direct `fs.writeFile` can leave truncated/corrupted JSON if process is killed mid-write. No write-to-temp + rename pattern.

### H11. Two separate, uncoordinated store writers
- **Scope:** Ingestion pipeline vs app server
- **Files:** `scripts/sync_groundnews_pipeline.mjs:42-49` vs `lib/store.ts:46-51`
- **Description:** Pipeline script has its own `readStore`/`writeStore` with no awareness of the app's lock. Separate OS processes can race.

### H12. Duplicate story in dataset
- **Scope:** All feed views
- **File:** `data/store.json`
- **Description:** "10 dead in shootings at school and home in northeastern British Columbia" appears twice with different slugs and slightly different bias values.

---

## MEDIUM

### M1. PerspectiveTabs buttons have no active/selected state
- **Scope:** `/story/[slug]`
- **File:** `components/PerspectiveTabs.tsx:32-34`
- **Description:** All three buttons use identical `.btn` class regardless of which is active. No visual distinction.
- **Visually confirmed.**

### M2. Empty chip-row div creates phantom spacing in StoryCards
- **Scope:** Homepage grid, `/blindspot`, `/local`
- **File:** `components/StoryCard.tsx:22-26`
- **Description:** The `<div className="chip-row">` always renders, even when all conditionals return null. Creates a 0.42rem gap for an invisible element.

### M3. StoryCard bottom pill row not pinned to card bottom
- **Scope:** Homepage grid
- **File:** `app/globals.css:259-263`
- **Description:** `.story-content` uses `display: grid` without `grid-template-rows` to pin the bottom row. Pills float at different heights depending on content length.

### M4. No scroll-padding-top for sticky TopNav
- **Scope:** All pages
- **File:** `app/globals.css`
- **Description:** Browser "Find on Page" and anchor scrolls position content behind the sticky header.

### M5. BiasBar segments with 0% are invisible, no min-width
- **Scope:** All BiasBar instances
- **File:** `app/globals.css:313-326`
- **Description:** When a bias segment is 0%, it renders as zero-width with no visual indication that the category exists.

### M6. Select elements styled identically to buttons
- **Scope:** TopNav, SourceCoveragePanel
- **Files:** `components/TopNav.tsx:76`, `components/SourceCoveragePanel.tsx:70-119`
- **Description:** `<select>` and `<button>` both use `.btn` class, reducing dropdown affordance.

### M7. Sidebar list links have no hover/active state
- **Scope:** Homepage sidebar
- **File:** `app/page.tsx:148-178`
- **Description:** Daily Briefing and Blindspot Watch links appear as plain text due to global `a { text-decoration: none }`.

### M8. Rating system page documents 3 of 5 factuality buckets
- **Scope:** `/rating-system`
- **File:** `app/rating-system/page.tsx:16`
- **Description:** Lists "high, mixed, low" but the actual system uses "very-high, high, mixed, low, very-low" (all 5 actively used in data).

### M9. Ingest API leaks internal filesystem paths in error messages
- **Scope:** `POST /api/ingest/groundnews`
- **File:** `app/api/ingest/groundnews/route.ts:23-29`
- **Description:** Error responses include full server paths like `/Users/kevinlin/OpenGroundNews/scripts/...`.

### M10. Admin "Sources" KPI label is ambiguous
- **Scope:** `/admin`, homepage Pipeline Snapshot
- **File:** `lib/store.ts:107-109`
- **Description:** Shows 222 (unique outlet count) but users interpret it as total source articles (actually 324).

### M11. 73% of source articles missing publishedAt, paywall, locality
- **Scope:** `/story/[slug]` SourceCoveragePanel
- **File:** `data/store.json`
- **Description:** 236/324 sources lack optional fields. "Latest" sort falls back to epoch 0, producing meaningless ordering.

### M12. 3 stories have UUID slugs instead of human-readable slugs
- **Scope:** Story URLs
- **File:** `data/store.json`
- **Description:** URLs like `/story/f1c1bed8-e2eb-463e-a25b-a3809cf8cb91` instead of readable slugs.

### M13. Published dates fabricated from hash seeds
- **Scope:** All stories
- **File:** `scripts/sync_groundnews_pipeline.mjs:217,228`
- **Description:** Story and source `publishedAt` calculated as random offsets from `Date.now()` using hash seeds. Dates drift on each pipeline run.

### M14. No timeout on enrichStory fetch -- can hang indefinitely
- **Scope:** Ingestion pipeline
- **File:** `scripts/sync_groundnews_pipeline.mjs:154`
- **Description:** No `AbortSignal.timeout()`. A single slow URL blocks all subsequent enrichment.

### M15. Pipeline readStore crashes on corrupted JSON with no recovery
- **Scope:** Ingestion pipeline
- **File:** `scripts/sync_groundnews_pipeline.mjs:42-45`
- **Description:** No try-catch around `JSON.parse`. Corrupted store.json makes pipeline permanently fail.

### M16. DJB2 hash can produce non-unique story IDs
- **Scope:** Story data integrity
- **File:** `scripts/sync_groundnews_pipeline.mjs:51-58`
- **Description:** 32-bit hash space produces hex IDs that could collide. URL changes create duplicates.

### M17. Archive fallback ignores HTTP errors and paywall responses
- **Scope:** Archive reader
- **File:** `lib/archive.ts:10-53`
- **Description:** No check on `res.ok`. 403/451 responses parsed as article HTML, caching garbage.

### M18. No URL validation on archive API -- potential SSRF
- **Scope:** `POST /api/archive/read`
- **File:** `app/api/archive/read/route.ts:12`
- **Description:** Any user-supplied URL passed to CDP browser with no validation.

### M19. 29 stories have raw bias sums of 101 (mitigated by normalization)
- **Scope:** `data/store.json`
- **Description:** Systematic rounding errors in pipeline. Mitigated at rendering by `normalizeBiasPercentages()`.

---

## LOW

### L1. Trending strip has no scroll affordance/indicators
- **Scope:** Homepage
- **File:** `app/globals.css:181-195`

### L2. SourceCoveragePanel Reset button visual gap
- **Scope:** `/story/[slug]`
- **File:** `components/SourceCoveragePanel.tsx:122-134`

### L3. `<nav>` element lacks aria-label
- **Scope:** All pages
- **File:** `components/TopNav.tsx:51`

### L4. Global `a { text-decoration: none }` removes link affordance from inline links
- **Scope:** All pages
- **File:** `app/globals.css:39-42`

### L5. Searchbar min-width: 220px may overflow on very small viewports
- **Scope:** All pages at <400px
- **File:** `app/globals.css:129-132`

### L6. next/image with unoptimized bypasses all optimization
- **Scope:** Homepage, story cards
- **Files:** `components/StoryCard.tsx:16`, `app/page.tsx:122`

### L7. API accepts arbitrary view/limit parameter values without validation
- **Scope:** `GET /api/stories`
- **File:** `app/api/stories/route.ts:9`

### L8. Seed stories have homepage URLs instead of article URLs
- **Scope:** 2 seed stories
- **File:** `data/store.json`

### L9. Admin checklist claims Edition selector is "Done" but it's non-functional
- **Scope:** `/admin`
- **File:** `app/admin/page.tsx:13`

### L10. Raw sourceCount mismatch for 2 seed stories (mitigated)
- **Scope:** `data/store.json`
- **Description:** Two seed stories declare inflated sourceCount (11, 17) vs actual sources (2, 2). Mitigated by `normalizeStory()`.

### L11. Rotation state file has same race condition as store.json
- **Scope:** Ingestion pipeline
- **File:** `scripts/lib/browser_use_cdp.mjs:74-103`

### L12. Failed session stops silently swallowed -- sessions leak
- **Scope:** CDP browser management
- **File:** `scripts/lib/browser_use_cdp.mjs:202-213`

### L13. Sequential enrichment with no concurrency
- **Scope:** Ingestion pipeline
- **File:** `scripts/sync_groundnews_pipeline.mjs:272-281`

### L14. 6 stories with proxy image URLs fall to generic placeholder
- **Scope:** Homepage, all feeds
- **File:** `data/store.json`
- **Description:** Stories with `/_next/image` proxy URLs sanitized to identical Unsplash fallback. Mitigated by `sanitizeStoryImageUrl()` but stories lose visual distinctiveness.

---

## Priority Recommendations

### Immediate (fixes the most user-facing damage)
1. Fix C4 (use CDP for enrichment) -- resolves C1, C2, C3, H1, M13 simultaneously
2. Fix H4 (strip/replace CDN images with embedded bias bars)
3. Fix H5 (ensure fallback images actually load)
4. Fix H2/H3 (remove or wire up Edition selector and Local location filter)

### Short-term
5. Fix H6/H7 (accessibility: contrast, focus states)
6. Fix M1 (PerspectiveTabs active state)
7. Fix H8 (add auth to ingestion/archive APIs)
8. Fix H9/H10/H11 (store.json data integrity)

### Medium-term
9. Fix remaining data quality issues (M8, M10, M11, M12)
10. Fix pipeline reliability (M14, M15, M16, M17, M18)
