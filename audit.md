# OpenGroundNews → Ground News Parity Audit

> **Date:** 2026-02-13
> **Methodology:** Automated multi-agent exploration of ground.news (baseline) + Chrome-based audit of OpenGroundNews (localhost:3000). 12 agents total: 6 exploring Ground News design/features, 6 auditing OGN pages and code.

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [Visual & UI Parity Gaps](#2-visual--ui-parity-gaps)
3. [Feature Gaps](#3-feature-gaps)
4. [Data Ingestion Pipeline](#4-data-ingestion-pipeline)
5. [Page-by-Page Breakdown](#5-page-by-page-breakdown)
6. [Architecture & Technical Debt](#6-architecture--technical-debt)
7. [Recommended Fix Priorities](#7-recommended-fix-priorities)

---

## 1. Critical Issues

These are show-stopping bugs or security vulnerabilities that need immediate attention.

### 1.1 All Images Show SVG Fallback Placeholders

**Severity:** CRITICAL
**Location:** Site-wide (every page with story cards)

Every story card across the entire site displays a generic SVG fallback placeholder instead of actual news article images. This affects 51+ images on the homepage alone and makes the entire site look broken/incomplete.

**Root Cause:** The `<img>` tags reference image URLs that fail to load. The CSS fallback SVG kicks in universally. Likely causes:
- Image URLs from Ground News are proxied/CDN URLs that reject cross-origin requests
- The ingestion pipeline captures image URLs but doesn't download/cache them locally
- No image proxy or CDN rewrite layer exists in the OGN stack

**Fix:**
1. Add an image proxy route (`/api/img?url=...`) that fetches and caches remote images server-side
2. Alternatively, download images during ingestion and store them locally or in S3/R2
3. Implement `next/image` with a custom loader that routes through the proxy
4. Add proper fallback behavior that shows a styled placeholder with the outlet logo rather than a raw SVG

---

### 1.2 Remote Code Execution via `Function()` Constructor

**Severity:** CRITICAL (Security)
**Location:** `scripts/sync_groundnews_pipeline.mjs:1164`

The pipeline uses `new Function()` to evaluate JavaScript extracted from scraped HTML:

```js
const fn = new Function(scriptContent);
fn();
```

This evaluates arbitrary JavaScript from untrusted web content. A malicious or compromised page could execute arbitrary code on the server running the ingestion pipeline.

**Fix:**
1. Replace `Function()` with a JSON parser or regex extraction for the specific data structures needed (likely `__NEXT_DATA__` or inline JSON)
2. If dynamic evaluation is truly required, use `vm2` or Node's `vm` module with a sandboxed context
3. Add input validation and sanitization before any evaluation

---

### 1.3 Hero Card Dark Mode Bug

**Severity:** CRITICAL (Visual)
**Location:** `app/globals.css` — `.hero-lead` class (~line 565)

The hero/lead story card has `background: #fff` hardcoded, which doesn't adapt to dark mode. In dark mode, this creates a jarring white rectangle against the dark background.

**Fix:**
```css
.hero-lead {
  background: var(--card-bg); /* or use a CSS custom property */
}
```

---

### 1.4 No Dedicated "My News Bias" Page

**Severity:** CRITICAL (Feature)
**Location:** Missing — only `components/MyNewsBiasWidget.tsx` exists

Ground News's marquee feature is the My News Bias dashboard — a full page with 10+ analysis modules:
- Overall bias distribution (pie chart)
- Bias over time (line chart)
- Most-read outlets ranked by bias
- "Blind spots" analysis (what you're missing)
- Political leaning spectrum
- Factuality score breakdown
- Reading history timeline
- Recommendations to diversify

OGN reduces this to a compact sidebar widget showing just an L/C/R bar and read count. This is Ground News's core differentiator and its absence is a major parity gap.

**Fix:**
1. Create `app/my-news-bias/page.tsx` as a full dashboard page
2. Track per-user article reads with bias metadata in the database
3. Implement chart components (recharts or Chart.js) for:
   - Bias distribution pie/donut chart
   - Bias-over-time line chart
   - Most-read outlets table
   - Factuality breakdown
4. Add "Diversify your reading" recommendations engine
5. Keep the existing widget as a compact summary that links to the full page

---

## 2. Visual & UI Parity Gaps

### 2.1 Typography

| Property | Ground News | OpenGroundNews | Gap |
|----------|-------------|----------------|-----|
| Primary font | `universalSans` (custom) | `Bricolage Grotesque` (Google) | Different typeface entirely |
| Heading weight | 800 (extra-bold) | 700 (bold) | Thinner headings |
| Page title size | 42px | 36.8px | ~12% smaller |
| Body text | 16px / 1.6 line-height | 16px / 1.5 line-height | Slightly tighter |

**Fix:** Update CSS custom properties to use `font-weight: 800` for headings and `font-size: 42px` for page titles. Consider sourcing a closer match to universalSans or licensing it.

### 2.2 Color System

Ground News uses a precise 7-bucket bias color system:

| Bias | Ground News Color | Usage |
|------|-------------------|-------|
| Far Left | `#802727` (dark red) | Badge background |
| Left | `#994040` | Badge background |
| Lean Left | `#B35959` | Badge background |
| Center | `#FFFFFF` (white) | Badge with border |
| Lean Right | `#5980B3` | Badge background |
| Right | `#406699` | Badge background |
| Far Right | `#204986` (dark blue) | Badge background |

OGN uses simplified red/white/blue but lacks the graduated tints. Bias badges on article cards don't use color coding at all — they're plain text.

**Fix:**
1. Add the full 7-color palette to CSS custom properties
2. Apply colored backgrounds to bias badges on article cards
3. Use the 3-bucket simplified system (red/white/blue) for bias bars, 7-bucket for detailed views

### 2.3 Missing Visual Elements

- **Subscribe/CTA button** in the top navigation bar — Ground News has a prominent green "Subscribe" button
- **App store badges** in footer — Ground News links to iOS/Android apps
- **Social proof counters** — Ground News shows "X sources" prominently on cards
- **Outlet logos** — Ground News shows small circular logos next to outlet names; OGN shows text only
- **"See the Story" links** on homepage story cards — Ground News cards have an explicit link below the headline

---

## 3. Feature Gaps

### 3.1 Missing Pages / Routes

| Ground News Page | OGN Equivalent | Status |
|------------------|----------------|--------|
| `/my-news-bias` | None | **MISSING** — Only a widget exists |
| `/search` (global) | `/search` | Exists but limited |
| `/newsletters` | None | **MISSING** |
| `/about/methodology` | None | **MISSING** — Important for credibility |
| `/compare` (source comparison) | None | **MISSING** |
| `/calendar` (news calendar) | None | **MISSING** |
| `/maps` (geographic view) | None | **MISSING** |
| Terms of Service | `/legal/terms` | Placeholder content |
| Privacy Policy | `/legal/privacy` | Placeholder content |

### 3.2 Missing Interactive Features

1. **Article search within story pages** — Ground News lets you search/filter the source list on a story page. OGN has no search input.
2. **Share buttons** — Ground News has share-to-social on every story. OGN has none.
3. **Bookmark/save stories** — Ground News lets users save stories for later. OGN has no save functionality.
4. **Email digest/notifications** — Ground News sends daily/weekly bias-aware email digests. OGN has web-push scaffolding but no email integration.
5. **OAuth/social login** — Ground News supports Google/Apple/Facebook login. OGN only has email/password with scrypt hashing.
6. **Reading time estimates** — Ground News shows "X min read" on articles. OGN does not.
7. **"Broke the news" indicator** — Ground News highlights which outlet first reported a story. Not captured in ingestion.
8. **Timeline/chronology view** — Ground News shows how a story evolved over time. Not implemented.
9. **Podcast references** — Ground News shows podcast coverage. Extracted in pipeline but never persisted.

### 3.3 Blindspot Page Differences

| Feature | Ground News | OGN |
|---------|-------------|-----|
| Card layout order | Image → Headline → Metadata → Bias | Badge → Image → Metadata → Headline → Bias |
| Filter tabs | Dedicated tab UI with counts | Basic tab styling |
| Blind spot explanation | Detailed methodology popover | Brief static text |
| Card click behavior | Opens story page | Works correctly |
| Weather widget | Icon-based with visual indicators | Text-only "Partly cloudy" |

### 3.4 Source Page Gaps

- Missing two-column layout (Ground News has content + sidebar)
- Missing sidebar sections: "Related Sources", "Similar Bias", "Also Covers"
- Missing visual factuality indicator (Ground News uses a colored bar/meter)
- Ownership information is text-only (Ground News shows corporate hierarchy)
- No historical bias tracking or trend visualization

---

## 4. Data Ingestion Pipeline

### Overview

The ingestion pipeline is the backbone of OGN and currently has the most technical debt. It consists of:

```
Browser-Use Cloud API → Playwright CDP → groundnews_scrape_cdp.mjs
    → sync_groundnews_pipeline.mjs (3,639-line monolith)
        → persist_db.mjs → PostgreSQL
        → *.json flat-file store (dual-write)
```

### 4.1 Architecture Issues

#### 4.1.1 The 3,639-Line Monolith

**File:** `scripts/sync_groundnews_pipeline.mjs`

This single file handles: discovery, URL normalization, extraction, enrichment, bias parsing, outlet matching, deduplication, and persistence. It should be decomposed into focused modules:

```
scripts/pipeline/
  ├── discover.mjs       — URL collection and routing
  ├── extract.mjs        — HTML parsing and data extraction
  ├── enrich.mjs         — Bias scoring, outlet matching, factuality
  ├── normalize.mjs      — Data cleaning, deduplication
  ├── persist.mjs        — Database writes
  └── validate.mjs       — Schema validation between stages
```

#### 4.1.2 Dual-Write Consistency Risk

The pipeline writes to both JSON flat files AND PostgreSQL. These can drift apart with no reconciliation mechanism. The JSON store appears to be the "source of truth" for some operations while PostgreSQL serves the webapp.

**Fix:** Pick one canonical store (PostgreSQL) and deprecate the JSON flat-file store, or implement a write-ahead log pattern where JSON is the WAL and PG is the materialized view.

#### 4.1.3 Zero Test Coverage

The entire `scripts/` directory has no test files. For a 3,600+ line data pipeline, this is a significant reliability risk. Any refactoring is high-risk without tests.

**Fix:**
1. Add unit tests for pure functions (bias parsing, URL normalization, deduplication)
2. Add integration tests with fixture data (sample Ground News HTML → expected DB rows)
3. Add snapshot tests for the extraction layer (detect when Ground News changes their HTML structure)

### 4.2 Data Not Being Captured

The following data is extracted from Ground News but never persisted to the database:

| Data | Extracted? | Persisted? | Notes |
|------|-----------|------------|-------|
| Article images | Yes (URLs) | Yes (URLs only) | But they fail to load — no proxy/cache |
| Podcast references | Yes | **NO** | Extracted then discarded |
| Reader links | Yes | **NO** | Extracted then discarded |
| Timeline headers | Yes | **NO** | Extracted then discarded |
| "Broke the news" outlet | **NO** | N/A | Not scraped at all |
| Article publish timestamps | Partial | Partial | Often missing/null |
| Outlet ownership chain | **NO** | N/A | Not in schema |
| Story geographic locality | Partial | Yes | Shows "Locality unavailable" everywhere |
| Full article text | **NO** | N/A | Only headline + URL captured |
| Source factuality score | Hardcoded | Yes | Uses `OUTLET_REFERENCE_DATA` instead of scraping |
| Related stories | **NO** | N/A | Ground News shows "Related stories" |

### 4.3 Pipeline Code Quality Issues

#### 4.3.1 Silent Error Swallowing (32 empty catch blocks)

```js
try {
  // complex extraction logic
} catch (e) {
  // nothing — error silently swallowed
}
```

This means extraction failures are invisible. Stories may have missing data with no way to diagnose why.

**Fix:** At minimum, add structured logging to every catch block. Ideally, implement a pipeline-level error accumulator that reports all extraction failures in a summary.

#### 4.3.2 Hardcoded Outlet Bias Data

`OUTLET_REFERENCE_DATA` in the pipeline hardcodes bias ratings for 30+ outlets instead of scraping them from Ground News's source pages. This data goes stale immediately.

**Fix:**
1. Scrape outlet metadata (bias, factuality, ownership) from Ground News source pages during ingestion
2. Store in the `Outlet` table with a `lastScrapedAt` timestamp
3. Fall back to hardcoded data only for outlets not yet scraped

#### 4.3.3 O(n²) Deduplication

The deduplication algorithm compares every story against every other story, resulting in O(n²) complexity. With thousands of stories, this becomes a bottleneck.

**Fix:** Use a hash-based approach:
1. Generate a normalized fingerprint (lowercase title, remove punctuation, sort words)
2. Use a `Map` or `Set` for O(1) lookups
3. For fuzzy matching, use locality-sensitive hashing (LSH) or trigram similarity

#### 4.3.4 Hardcoded Debug Filters

`refreshExisting` contains hardcoded test filters: `valentine|olympics|pam bondi`. These should be environment variables or CLI arguments, not embedded in source code.

#### 4.3.5 Bot User-Agent Strings

Fetch calls use recognizable bot user-agent strings that can trigger anti-scraping protections. Use realistic browser user-agents with rotation.

#### 4.3.6 `stableId` Argument Order Inconsistency

The `stableId()` function is called with different argument orders in different files, which could produce different IDs for the same story.

**Fix:** Standardize on named parameters or a config object:
```js
stableId({ title, outlets, date })
```

#### 4.3.7 No Archive Cache TTL

When an archive lookup returns "not_found", that result is cached forever. If the archive site later has the content available, OGN will never retry.

**Fix:** Add a TTL (e.g., 24 hours) for "not_found" cache entries. Successful entries can have a longer TTL.

#### 4.3.8 Topic Alias Duplication

Topic slug → display name mappings are duplicated between `scripts/sync_groundnews_pipeline.mjs` and `lib/topics.ts`. They can drift apart.

**Fix:** Create a single source of truth in `lib/topics.ts` and import it in the pipeline.

#### 4.3.9 `FALLBACK_IMAGE_VARIANTS` Count Mismatch

The pipeline defines 5 fallback image variants while another file references 6. This causes index-out-of-bounds edge cases.

#### 4.3.10 No Story Staleness/TTL

Stories are ingested but never expire or get refreshed. A story from 6 months ago looks the same as one from today, with no indication of age or relevance.

**Fix:**
1. Add `lastRefreshedAt` to the Story model
2. Implement a staleness threshold (e.g., stories older than 7 days get a "stale" badge)
3. Add a refresh job that re-scrapes active stories periodically

### 4.4 Browser-Use Cloud Specific Issues

- **15-minute session limit** (free tier) — Long ingestion runs get cut off mid-scrape with no resume capability
- **No retry/resume mechanism** — If a session dies, progress is lost
- **No rate limiting awareness** — The pipeline doesn't track API usage or respect rate limits
- **CDP connection fragility** — The Playwright CDP connection to Browser-Use Cloud can drop without clean error handling

**Fix:**
1. Implement checkpointing — save progress after each page so ingestion can resume
2. Add session rotation — when approaching the 15-min limit, start a new session
3. Implement exponential backoff for transient failures
4. Add a session health monitor that detects dropped connections early

---

## 5. Page-by-Page Breakdown

### 5.1 Homepage (`/`)

| Element | Ground News | OGN | Status |
|---------|-------------|-----|--------|
| Hero story card | Full-bleed image, overlay text | White card, no image loads | **BROKEN** |
| Story card images | Actual article images | SVG fallback placeholders | **BROKEN** |
| Navigation bar | Logo + Topics + Search + Subscribe | Logo + Topics + Search | Missing Subscribe |
| Story card bias bar | 3-color gradient (L/C/R) with percentages | Present and functional | OK |
| "See the Story" link | Below headline on each card | Missing | **MISSING** |
| Trending sidebar | "Trending" with ranked stories | Present | OK |
| Topic chips | Colored topic pills above story | Present | OK |
| Source count | "12 sources" badge on cards | Present | OK |
| Dark mode | Full theme toggle | Toggle exists, hero card broken | **PARTIAL** |

### 5.2 Story Page (`/story/[slug]`)

| Element | Ground News | OGN | Status |
|---------|-------------|-----|--------|
| Bias distribution bar | Full-width gradient bar with percentages | Present and functional | OK |
| Source tabs (L/C/R) | Tabs with colored indicators + counts | Present, functional | OK |
| Article cards | Image + Headline + Outlet + Date | Image(broken) + Outlet + Date — **no headline** | **BROKEN** |
| Bias badges on articles | Color-coded (red/white/blue) | Plain text, no color | **MISSING** |
| "Broke the News" | First reporter highlighted | Not captured | **MISSING** |
| Article search | Search/filter input in source list | Not present | **MISSING** |
| Share button | Social sharing options | Not present | **MISSING** |
| Related stories | "Related stories" section at bottom | Not present | **MISSING** |
| Timeline view | Chronological story evolution | Not present | **MISSING** |

### 5.3 Blindspot Page (`/blindspot`)

| Element | Ground News | OGN | Status |
|---------|-------------|-----|--------|
| Header | "BLINDSPOT™" with binoculars icon | SVG binoculars + "BLINDSPOT TM" text | OK (close) |
| Card layout | Image → Headline → Meta → Bias | Badge → Image → Meta → Headline → Bias | **DIFFERENT** |
| Filter tabs | Styled tabs with story counts | Basic tab buttons | **PARTIAL** |
| Bias breakdown | 3-row colored bars per card | 3-row colored bars per card | OK |
| Methodology popup | Detailed explanation of algorithm | Brief text description | **PARTIAL** |

### 5.4 Topic/Interest Pages (`/interest/[slug]`)

| Element | Ground News | OGN | Status |
|---------|-------------|-----|--------|
| Page title | 42px, weight 800 | 36.8px, weight 700 | **WRONG** |
| Topic description | Dynamic, contextual | Static generic text | **PARTIAL** |
| Featured stories | 2-up layout with large images | Present but images broken | **BROKEN** |
| "Covered Most By" sidebar | Top 5 outlets | Shows 18 outlets (no limit) | **WRONG** |
| "Media Bias Breakdown" | Pie/donut chart | Present (implementation TBD) | **PARTIAL** |
| Blindspot section | Inline blindspot stories | Present | OK |

### 5.5 Source Pages (`/source/[slug]`)

| Element | Ground News | OGN | Status |
|---------|-------------|-----|--------|
| Layout | Two-column (content + sidebar) | Single column | **MISSING** |
| Bias indicator | Visual colored bar/meter | Text label only | **PARTIAL** |
| Factuality score | Visual indicator | Text label | **PARTIAL** |
| Ownership | Corporate hierarchy visualization | Text only | **PARTIAL** |
| Related sources sidebar | "Similar Bias", "Also Covers" | Not present | **MISSING** |
| Historical coverage | Coverage stats over time | Not present | **MISSING** |
| Story cards | Standard cards with images | Cards present, images broken | **BROKEN** |

### 5.6 Auth & User Pages

| Element | Ground News | OGN | Status |
|---------|-------------|-----|--------|
| Login | Email + OAuth (Google/Apple/Facebook) | Email/password only | **PARTIAL** |
| Registration | Email + OAuth with onboarding flow | Email/password, no onboarding | **PARTIAL** |
| My News Bias | Full dashboard page (10+ modules) | Sidebar widget only | **MISSING** |
| Settings | Account, notifications, subscriptions | Basic account settings | **PARTIAL** |
| Legal pages | Full terms and privacy policy | Placeholder text | **PLACEHOLDER** |

---

## 6. Architecture & Technical Debt

### 6.1 CSS Architecture

- **2,900+ lines** in `globals.css` — Should be broken into component-level CSS modules or Tailwind utilities
- Dark mode rules tacked on at line 2806+ rather than integrated with custom properties throughout
- Multiple hardcoded color values instead of CSS custom properties
- No design token system — colors, spacing, and typography are scattered

### 6.2 Database Schema Gaps

The Prisma schema is missing models for:
- User reading history (needed for My News Bias)
- Bookmarks/saved stories
- Notification preferences (beyond basic push)
- Story timeline events
- Outlet ownership relationships
- Podcast references

### 6.3 API Layer

- No public API documentation
- No rate limiting on API routes
- No API versioning strategy
- Archive fetch (`lib/archive.ts`) has no circuit breaker — if archive.is is down, every request will timeout

### 6.4 Caching

- `lib/dbStore.ts` uses a 45-second in-memory cache TTL — this is very short and will cause high DB load under traffic
- No CDN or edge caching strategy
- No HTTP cache headers on API responses
- Image caching is non-existent (root cause of the broken images)

---

## 7. Recommended Fix Priorities

### P0 — Fix Immediately (Broken/Security)

1. **Fix image loading** — Implement server-side image proxy or download during ingestion
2. **Remove `Function()` constructor** — Replace with safe JSON extraction
3. **Fix hero card dark mode** — Use CSS custom property instead of hardcoded `#fff`

### P1 — High Priority (Core Parity)

4. **Add article headlines to story page source cards** — Currently showing outlet + date but no headline
5. **Add color-coded bias badges** — Apply the 7-color system to all bias indicators
6. **Cap "Covered Most By" to 5 outlets** — Add `LIMIT 5` to the query
7. **Fix heading typography** — 42px / weight 800 to match Ground News
8. **Persist podcast references, reader links, timeline headers** — Add to schema and persist layer
9. **Add "Broke the news" scraping** — Capture first-reporter data during ingestion
10. **Fix locality data** — Currently shows "Locality unavailable" everywhere

### P2 — Important (Feature Parity)

11. **Build My News Bias page** — Full dashboard with charts and analysis modules
12. **Add source page sidebar** — Two-column layout with related sources
13. **Add article search in story pages** — Filter/search within source list
14. **Add share buttons** — Social sharing on stories
15. **Implement OAuth login** — Google + Apple at minimum
16. **Add story staleness/TTL** — Mark old stories, implement refresh jobs
17. **Split pipeline monolith** — Decompose into focused modules
18. **Add pipeline tests** — Unit + integration + snapshot tests
19. **Fix blindspot card layout order** — Match Ground News ordering

### P3 — Nice to Have (Polish)

20. **Add Subscribe button** to navigation
21. **Fix font** — Source a closer match to universalSans
22. **Implement "See the Story" links** on homepage cards
23. **Add reading time estimates**
24. **Weather widget icons** instead of text
25. **Improve blindspot methodology popup**
26. **Break up globals.css** into component-level styles
27. **Add pipeline checkpointing** for Browser-Use Cloud session resilience
28. **Remove hardcoded debug filters** from pipeline
29. **Fix deduplication algorithm** — O(n²) → hash-based O(n)
30. **Add structured logging** to replace 32 empty catch blocks
31. **Eliminate dual-write** — Pick one canonical data store
32. **Write actual legal page content** for terms and privacy

---

## Appendix: Ground News Design Reference

### Color Palette
```
Page Background:  #EEEFE9
Card Background:  #FFFFFF
Text Primary:     #262626
Text Secondary:   #6B7280
Left Bias:        #802727 → #994040 → #B35959
Center:           #FFFFFF (bordered)
Right Bias:       #5980B3 → #406699 → #204986
Accent Green:     #2D6A4F (Subscribe button)
```

### Typography
```
Font Family:      universalSans (custom)
Heading Weight:   800
Body Weight:      400
Page Title:       42px
Section Title:    24px
Card Title:       18px
Body Text:        16px / 1.6
Small Text:       14px
```

### Layout
```
Max Width:        1440px
Grid:             12-column
Gutter:           24px
Card Border:      1px solid #E5E7EB
Card Radius:      8px
Card Shadow:      0 1px 3px rgba(0,0,0,0.1)
```
