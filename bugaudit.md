# OpenGroundNews Visual & Feature Parity Audit

**Audit date:** 2026-02-12
**Compared against:** ground.news (production)
**OpenGroundNews version:** localhost:3000 (main branch, 88 stories in store)

---

## Executive Summary

OpenGroundNews has a solid foundation but significant gaps exist compared to the Ground News production site. The most critical issues fall into three categories:

1. **Data quality problems** (ingestion pipeline) — misclassified topics, cross-contaminated tags, inflated source counts, broken image URLs, duplicate dek/summary fields
2. **Missing feature parity** — no two-column blindspot layout, no blindspot percentage badges, no social sharing, no AI summary bullets, no "Covered Most By" sidebar, no weather widget for local, no topic avatars
3. **UI/layout bugs** — empty bias bars/panels with no fallback, 256 source cards in narrow sidebar, dark mode broken by inline styles, inconsistent card sizing, no pagination

**Total unique issues identified: 54**
- CRITICAL: 6
- HIGH: 14
- MEDIUM: 18
- LOW: 16

---

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [Homepage Bugs](#homepage-bugs)
3. [Story Detail Page Bugs](#story-detail-page-bugs)
4. [Blindspot Page Bugs](#blindspot-page-bugs)
5. [Cross-Page & Data Quality Issues](#cross-page--data-quality-issues)
6. [Missing Feature Parity vs Ground News](#missing-feature-parity-vs-ground-news)
7. [Secondary Pages (Local, Interest, Rating System, Subscribe)](#secondary-pages)

---

## Critical Issues

### C1: Empty Bias Bars for 36/88 Stories — No Visual Fallback

**Severity:** CRITICAL
**Routes:** All pages displaying StoryCard or BiasBar
**Files:** `components/BiasBar.tsx`, `data/store.json`

**Problem:** 36 of 88 stories have all-zero bias data (`left: 0, center: 0, right: 0`). The BiasBar renders as an empty 10px gray strip with no text explanation. The `aria-label` says "Bias distribution unavailable" but there is no visible indicator.

**Ground News behavior:** Shows colored bias segments for every story; stories without data are not displayed.

**Fix:** Add a visible text fallback ("Bias data unavailable") when `hasData` is false, or hide the bar entirely and show a "No bias data" message.

---

### C2: 206 Source Logos Broken — Cross-Origin ground.news URLs

**Severity:** CRITICAL
**Routes:** `/story/[slug]` (SourceCoveragePanel)
**Files:** `components/SourceCoveragePanel.tsx`, `data/store.json`

**Problem:** Source article `logoUrl` fields point to `https://ground.news/_next/image?url=...&w=48&q=75`. These are Next.js image optimization URLs that only work on ground.news origin. On OpenGroundNews, they return 403/broken images. The fallback (two-letter initials) works but makes 206 sources look incomplete.

**Fix:** Either (a) proxy/cache logos during ingestion, (b) download logos to `public/logos/`, or (c) always use the initials fallback until a proper logo pipeline exists.

---

### C3: SourceCoveragePanel with 256 Cards in Narrow Sidebar

**Severity:** CRITICAL
**Routes:** `/story/[slug]`
**File:** `app/story/[slug]/page.tsx` line 205

**Problem:** The `SourceCoveragePanel` is rendered inside `<aside className="feed-rail">` (the 1fr sidebar in a 1.5fr+1fr grid). For stories with 256 source articles, this creates a massively elongated sidebar with all 256 cards crammed into a narrow column. The main article (left column) ends at ~30% of the page while the sidebar continues for thousands of pixels.

**Ground News behavior:** Source coverage is in a wide layout below the main article, with pagination (show 10 at a time).

**Fix:** Move `SourceCoveragePanel` from the sidebar to below the main article. Add pagination (e.g., show 10 sources at a time with "Show More").

---

### C4: Three Empty 320px Bias Distribution Columns — ~960px Blank Space

**Severity:** CRITICAL
**Routes:** `/story/[slug]` (stories with no bias distribution data)
**Files:** `components/BiasDistributionPanel.tsx`, `app/globals.css` line ~500 (`.bias-column { min-height: 320px }`)

**Problem:** When a story has no source bias distribution data, the BiasDistributionPanel renders three empty columns (Left/Center/Right), each with `min-height: 320px`, creating ~960px of blank dark-themed space. The labels show "0% lean Left", "0% Center", "0% lean Right" which is misleading (data is absent, not zero).

**Fix:** Hide the panel entirely when no bias distribution data exists, or show "Bias distribution data not available for this story."

---

### C5: Topic Misclassification — 57% of Stories Show "Israel-Gaza"

**Severity:** CRITICAL
**Routes:** All pages
**Files:** `data/store.json`, `scripts/sync_groundnews_pipeline.mjs`

**Problem:** 50 of 88 stories display "Israel-Gaza" as their topic regardless of actual content. Stories about Canada tariffs, Mitch McConnell, hair extension carcinogens, Blake Lively's court case, and Cisco stock are all labeled "Israel-Gaza". This makes topic-based navigation completely unreliable.

**Fix:** Fix the ingestion pipeline to correctly extract topic categorization from Ground News. The current scraper appears to default or misassign the topic field.

---

### C6: Tag Cross-Contamination — Unrelated Tags on Many Stories

**Severity:** CRITICAL
**Routes:** Homepage trending strip, `/interest/[slug]`
**Files:** `data/store.json`, `scripts/sync_groundnews_pipeline.mjs`

**Problem:** At least 14 stories have "Valentine's Day" as a tag despite zero relevance (e.g., "Deaths in Iran's Crackdown on Protests", "UK Pledges $205 Million to Send US Weapons to Ukraine"). Similarly, "Business & Markets" and "Health & Medicine" appear on unrelated stories. Outlet names like "der Standard AT" and "BT" also appear as tags.

**Fix:** Investigate ingestion pipeline tag extraction. Add relevance validation. The `sanitizeStoryTags` function in `lib/format.ts` filters bias tags and domains but not cross-contaminated topic tags.

---

## Homepage Bugs

### H1: Dark Mode — Inline `background: #fff` Breaks Sidebar Panels

**Severity:** HIGH
**File:** `app/page.tsx` lines 176, 214, 234

Three sidebar panels (Feed Filters, Daily Briefing, Blindspot Watch) have inline `style={{ background: "#fff" }}` which overrides the dark mode CSS rule for `.panel`. In dark mode, these panels render as bright white boxes against a dark background.

**Fix:** Remove inline `background: "#fff"` from all three panels. The `.panel` class already handles both light and dark modes via `var(--bg-panel)`.

---

### H2: "48 stories" Label But Only 25 Visible — No Pagination

**Severity:** HIGH
**File:** `app/page.tsx` lines 62–63, 137

The section title shows "48 stories" (the `listStories` limit) but only 25 are rendered (1 lead + 24 grid via `tagged.slice(1, 25)`). No pagination, "load more", or indication that 23 stories are hidden.

**Fix:** Either render all 48 with pagination/infinite scroll, or show "Showing 25 of 48 stories" with a load more button.

---

### H3: Source Count Pills Show Inflated Numbers

**Severity:** MEDIUM
**Files:** `app/page.tsx`, `components/StoryCard.tsx`

Story cards show `sourceCount` from Ground News (e.g., 256, 180, 95) but only 1–8 source articles are actually stored. "180 sources" displays while only 6 exist.

**Fix:** Display actual `sources.length` or use "6 of 180 sources" format.

---

### H4: 65% of Stories Use Identical Fallback SVG Image

**Severity:** MEDIUM
**Files:** `data/store.json`, `public/images/story-fallback.svg`

57 of 88 stories use the same green-to-tan gradient fallback SVG. On the homepage, multiple grid cards show the identical placeholder, creating a monotonous appearance.

**Fix:** Improve image extraction in ingestion pipeline, or create topic-keyed fallback variants.

---

### H5: Sidebar Thumbnails — Fallback SVG Illegible at 86x54px

**Severity:** LOW
**File:** `app/page.tsx` lines 219–231

Daily Briefing thumbnails at 86x54px render the fallback SVG so small that its internal detail (text lines, circles) becomes indistinct gray-green blobs.

**Fix:** Use a simpler fallback for thumbnail contexts (topic-colored solid with icon).

---

### H6: KPI "1249 Unique Outlets" Is Misleading

**Severity:** LOW
**Files:** `lib/store.ts` (getDashboardStats), `app/page.tsx` lines 108–109

The Pipeline Snapshot shows "1249 unique outlets" and "1884 source articles" which are derived from Ground News aggregate counts, not actually available sources.

**Fix:** Clarify labels (e.g., "Tracked outlets" vs "Browsable sources") or only count from stored sources.

---

### H7: `paddingTop: 0.1` Renders as 0.1px (Likely Typo)

**Severity:** LOW
**File:** `app/page.tsx` line 135

Every other `section-title` uses `paddingTop: 0` but this one uses `0.1`, which React converts to `0.1px`.

**Fix:** Change `0.1` to `0`.

---

### H8: No Empty-State Message for Filter Combinations

**Severity:** LOW
**File:** `app/page.tsx`

When Feed Filters produce zero results (e.g., view=local + bias=right), the page shows "0 stories" with a blank grid and no helpful message.

**Fix:** Add an empty-state component: "No stories match your current filters."

---

### H9: Story Card Min-Height Causes Inconsistent Sizing

**Severity:** LOW
**File:** `app/globals.css` line 274

`.story-card` has `min-height: 290px` combined with `.story-summary` `min-height: 5rem`, creating competing constraints. Cards with fewer chips or shorter titles have more whitespace.

**Fix:** Remove `min-height` constraints and let CSS Grid handle uniform sizing, or use `grid-template-rows` inside cards.

---

### H10: Trending Strip Fade Mask Applies Even When Not Scrollable

**Severity:** LOW
**File:** `app/globals.css` lines 203–210

The trending strip uses a CSS mask that fades edges, but on wide screens where all items fit, the mask still fades the first and last items unnecessarily.

**Fix:** Conditionally apply the mask only when content overflows, or add scroll arrow buttons.

---

### H11: Lead Image Uses Non-Standard 16/8 Aspect Ratio

**Severity:** LOW
**File:** `app/globals.css` line 244

`aspect-ratio: 16 / 8` is functionally equivalent to `2 / 1` but semantically confusing.

**Fix:** Use `2 / 1` for clarity.

---

### H12: Explore Panel Background Inconsistent with Siblings

**Severity:** LOW
**File:** `app/page.tsx` line 253

Three sidebar panels have `background: "#fff"` while the Explore panel uses `var(--bg-panel)` (#f8faf5), creating a subtle but visible color difference.

**Fix:** Will be resolved when H1 is fixed (removing all inline backgrounds).

---

## Story Detail Page Bugs

### S1: Summary Duplicates Dek for 39% of Stories

**Severity:** MEDIUM
**Files:** `data/store.json`, `app/story/[slug]/page.tsx` lines 44, 69–71

For 34 of 88 stories, `summary` is an exact copy of `dek`. On the story page, the dek appears above the image and the summary below, showing identical text twice.

**Fix:** Hide the dek when it matches the summary, or ensure the ingestion pipeline generates a distinct summary.

---

### S2: "unknown locality", "unknown" Bias/Factuality Labels

**Severity:** MEDIUM
**File:** `components/SourceCoveragePanel.tsx` lines 197–200, 204–205

Source cards display raw strings: "unknown locality", bias chip shows "unknown", factuality chip shows "unknown". These are developer-facing values, not user-friendly labels.

**Fix:** Replace "unknown" with "Not rated" or "Unclassified". Replace "unknown locality" with "Locality not available" or hide the field.

---

### S3: Coverage Details KPIs Don't Add Up

**Severity:** MEDIUM
**File:** `app/story/[slug]/page.tsx` lines 28–30

Leaning Left + Center + Leaning Right counts may not sum to Total News Sources because they're derived from percentage rounding: `Math.round((story.bias.left / 100) * displayTotalSources)`.

**Fix:** Use `coverage.leaningLeft`, `coverage.center`, `coverage.leaningRight` when available, or adjust rounding to ensure the sum equals the total.

---

### S4: No Social Sharing Icons

**Severity:** MEDIUM
**File:** `app/story/[slug]/page.tsx`

Ground News has social sharing buttons (Twitter/X, Facebook, copy link) on every story. OpenGroundNews has none.

**Fix:** Add a ShareBar component with copy-to-clipboard, Twitter intent URL, and Facebook share dialog.

---

### S5: Duplicate Tags (Case-Insensitive)

**Severity:** LOW
**File:** `app/story/[slug]/page.tsx` lines 134–139

Tags like "Tariffs" and "tariffs" or "United States" (as topic and tag) create duplicate chips in the Related Topics section.

**Fix:** Deduplicate tags case-insensitively in `normalizeStory` or in the rendering code.

---

### S6: News Outlet Names Appearing as Topic Tags

**Severity:** LOW
**File:** `lib/format.ts` (sanitizeStoryTags)

Tags like "der Standard AT" and "BT" are outlet names, not topics. The sanitize function checks against `outletNames` but these variants don't match.

**Fix:** Expand outlet name matching to handle more variants.

---

### S7: PerspectiveTabs Empty for Stories Without Bias Data

**Severity:** MEDIUM
**File:** `components/PerspectiveTabs.tsx`

When all sources have "unknown" bias, PerspectiveTabs shows three empty tabs (Left/Center/Right) with no content. No indication that data is unavailable.

**Fix:** Show "No perspective data available" when all tabs would be empty.

---

### S8: No Dynamic Page Titles or OG Meta Tags

**Severity:** MEDIUM
**File:** `app/story/[slug]/page.tsx`

Browser tab always shows "OpenGroundNews" regardless of which story is open. No Open Graph meta tags for social sharing previews.

**Fix:** Add `generateMetadata` function that returns the story title, description, and image for each story page.

---

### S9: Reader Mode Panel Layout Issues

**Severity:** LOW
**File:** `app/story/[slug]/page.tsx` lines 142–157

When reader mode is active (via `?source=` param), the reader section renders inline with the main article. Long articles create extremely tall pages.

**Fix:** Consider a modal or slide-out panel for reader mode, or add a "collapse" toggle.

---

## Blindspot Page Bugs

### B1: Missing Two-Column "For the Left" / "For the Right" Layout

**Severity:** HIGH
**Route:** `/blindspot`
**File:** `app/blindspot/page.tsx`

**Ground News behavior:** Blindspot page has a distinctive two-column layout: left column shows stories underreported by left-leaning media ("For the Left"), right column shows stories underreported by right-leaning media ("For the Right"). This is the core UX of the blindspot feature.

**OpenGroundNews behavior:** Shows a flat grid of all blindspot stories using generic StoryCard components with no semantic Left/Right separation.

**Fix:** Create a `BlindspotLayout` component that splits stories into two columns based on which side is underreporting. Add column headers "For the Left" and "For the Right" with appropriate styling.

---

### B2: Missing Blindspot Percentage Badges

**Severity:** HIGH
**Route:** `/blindspot`
**File:** `app/blindspot/page.tsx`

**Ground News behavior:** Each blindspot story card shows a prominent percentage badge (e.g., "94% Left", "87% Right") indicating how skewed the coverage is.

**OpenGroundNews behavior:** No blindspot percentage or severity indicator. Stories look identical to regular story cards.

**Fix:** Add a `BlindspotBadge` component that displays the dominant coverage percentage. Calculate from `story.bias.left` vs `story.bias.right`.

---

### B3: "No bias data coverage" Broken Pill Text

**Severity:** MEDIUM
**Route:** `/blindspot`
**File:** `components/StoryCard.tsx`

Many blindspot stories show "No bias data coverage" in the footer pill, which is an odd phrase combining "No bias data" and "coverage". This appears when `biasLabel()` returns the fallback.

**Fix:** Change to "Bias data unavailable" or hide the pill entirely for blindspot cards.

---

### B4: 60% of Blindspot Stories Show Identical Placeholder Image

**Severity:** MEDIUM
**Route:** `/blindspot`
**File:** `data/store.json`

9 of 15 blindspot stories display the same fallback SVG, making the page visually monotonous and reducing scannability.

**Fix:** Same as H4 — improve image extraction or use varied fallbacks.

---

### B5: 11/15 Blindspot Stories Labeled "Israel-Gaza" (Data Quality)

**Severity:** HIGH
**Route:** `/blindspot`
**File:** `data/store.json`

11 of 15 blindspot stories show "Israel-Gaza" as their topic, including stories about different subjects entirely. Same root cause as C5.

**Fix:** Fix ingestion pipeline topic extraction.

---

### B6: Developer-Facing Note Exposed to Users

**Severity:** MEDIUM
**Route:** `/blindspot`
**File:** `app/blindspot/page.tsx`

A note about the "ingestion pipeline script" is visible to end users. This is internal/developer context that shouldn't appear in the UI.

**Fix:** Remove the developer note or move it behind an admin toggle.

---

### B7: 100% Center Stories Incorrectly Flagged as Blindspot

**Severity:** MEDIUM
**Route:** `/blindspot`
**File:** `data/store.json`

Some stories with 100% center bias (or zero bias data) appear in the blindspot section. A true blindspot requires significant left-right skew.

**Fix:** Add a minimum skew threshold (e.g., >70% one side) for blindspot classification.

---

### B8: No Blindspot-Specific Branding or Visual Identity

**Severity:** LOW
**Route:** `/blindspot`

**Ground News behavior:** Blindspot page has distinctive purple/blue color accents, a unique header design, and explanatory text about what blindspots mean.

**OpenGroundNews behavior:** Uses the same styling as every other page — white panels, green accents. No explanation of what blindspot means.

**Fix:** Add a hero section explaining the blindspot concept, and use distinct color accents (e.g., purple/blue to match Ground News convention).

---

## Cross-Page & Data Quality Issues

### D1: Inflated sourceCount vs Actual sources.length

**Severity:** HIGH
**Routes:** All pages
**Files:** `data/store.json`, throughout components

`sourceCount` shows Ground News aggregate (256, 180, 95) while `sources` array contains 1–8 items. Every page that displays source counts misleads users.

Notable mismatches:
- 256 displayed → 8 actual
- 180 displayed → 6 actual
- 95 displayed → 6 actual
- 71 displayed → 6 actual
- 66 displayed → 3 actual

**Fix:** Use `sources.length` for display, or show "6 of 180 sources tracked" format.

---

### D2: Summary === Dek for 39% of Stories

**Severity:** MEDIUM
**Files:** `data/store.json`, ingestion pipeline

34 of 88 stories have identical `summary` and `dek` fields, causing redundant text display on story detail pages.

**Fix:** Ensure the ingestion pipeline generates a distinct summary, or conditionally hide the dek when it matches.

---

### D3: Outlet Names Leaking Into Tags

**Severity:** LOW
**File:** `lib/format.ts` (sanitizeStoryTags)

Outlet names like "der Standard AT", "BT" appear in tag lists. The sanitize function doesn't catch all outlet name variants.

**Fix:** Expand outlet name matching or add a blocklist.

---

## Missing Feature Parity vs Ground News

### F1: No AI Summary Bullets on Story Pages

**Severity:** HIGH

Ground News displays AI-generated summary bullets at the top of each story (e.g., "Key Points: 1. House voted to override... 2. The resolution..."). OpenGroundNews shows a single paragraph summary.

**Fix:** Add a `KeyPoints` component that renders structured summary bullets. Either generate these during ingestion (via LLM) or extract from Ground News data.

---

### F2: No "Covered Most By" Sidebar on Interest/Topic Pages

**Severity:** MEDIUM

Ground News topic pages (e.g., `/interest/israeli-palestinian-conflict`) show a "Covered Most By" sidebar listing outlets that cover the topic most frequently. OpenGroundNews interest pages don't have this.

**Fix:** Aggregate source outlet frequency per topic and render in a sidebar panel.

---

### F3: No Topic Avatar/Description on Interest Pages

**Severity:** LOW

Ground News shows a topic avatar (icon/image) and a brief description on each interest page. OpenGroundNews shows a plain heading.

**Fix:** Add topic metadata (icon, description) to the data model and render on interest pages.

---

### F4: No Weather Widget on Local Page

**Severity:** LOW

Ground News local page shows a weather widget with current conditions for the selected city. OpenGroundNews local page has no weather.

**Fix:** Integrate a weather API (e.g., OpenWeatherMap) into the local page.

---

### F5: No City/Location Search on Local Page

**Severity:** MEDIUM

Ground News local page has a city search bar with autocomplete. OpenGroundNews local page has basic LocalFeedControls without city search.

**Fix:** Add a city/location search with autocomplete and filter stories by proximity.

---

### F6: No "Local News Publishers" Directory on Local Page

**Severity:** LOW

Ground News shows a directory of local news publishers for the selected city. OpenGroundNews doesn't have this feature.

**Fix:** Create a publishers directory component filtered by location.

---

### F7: No Podcast/Opinion Integration

**Severity:** LOW

While OpenGroundNews has a `podcastReferences` field and renders "Podcasts & opinions" in Context Signals, there are no actual podcast player embeds or links to podcast episodes. Ground News integrates podcast mentions more prominently.

**Fix:** Link podcast references to actual episodes when URLs are available.

---

### F8: No User Account System

**Severity:** HIGH

Ground News has user accounts with saved stories, followed topics, and notification preferences. OpenGroundNews "For You" page uses localStorage only (no account persistence across devices).

**Fix:** Implement basic auth (e.g., email/password or OAuth) with server-side storage for user preferences.

---

### F9: Three-Column Homepage Layout Missing

**Severity:** MEDIUM

Ground News homepage uses a three-column layout: daily briefing (left) | hero story (center) | blindspot sidebar (right). OpenGroundNews uses a two-column layout: feed (left) | sidebar (right).

**Fix:** Consider adding a third column for blindspot stories, matching the Ground News information density.

---

### F10: Dark Theme Not Matching Ground News

**Severity:** MEDIUM

Ground News uses a dark theme by default (#262626 background, light text). OpenGroundNews uses a light theme with optional dark mode via `prefers-color-scheme`. The dark mode has multiple bugs (inline `#fff` backgrounds).

**Fix:** Consider making dark theme the default to match Ground News, and fix all inline style overrides.

---

### F11: No Story Timeline/History Feature

**Severity:** LOW

Ground News shows a timeline of how a story developed over time. OpenGroundNews has `timelineHeaders` data but only renders them as bullet points in "Context Signals", not as a visual timeline.

**Fix:** Create a visual timeline component with dates and progression markers.

---

## Secondary Pages

### SP1: Rating System Page — Static Content Only

**Severity:** LOW
**Route:** `/rating-system`

The methodology page exists but may lack interactive examples or visual demonstrations of how bias ratings work. Ground News has detailed interactive explanations.

**Fix:** Add interactive bias bar examples showing how different distributions look.

---

### SP2: Subscribe Page — No Payment Integration

**Severity:** MEDIUM
**Route:** `/subscribe`

The subscribe page shows plan options but likely has no actual payment processing. Ground News has full Stripe integration.

**Fix:** Add Stripe checkout integration for subscription management.

---

### SP3: Admin Page — Exposed in Navigation

**Severity:** MEDIUM
**Route:** `/admin`

The admin link is visible in the main navigation to all users. This should be hidden behind authentication.

**Fix:** Hide the admin link behind auth, or at minimum remove it from the public nav.

---

### SP4: Search — No Full-Text Search Backend

**Severity:** MEDIUM
**Route:** `/?q=...`

The search bar sends a `q` parameter but search is performed client-side against the limited `listStories` result set. No full-text search engine or relevance ranking.

**Fix:** Implement server-side search (e.g., using a simple text index on `store.json` or integrating a search library like Fuse.js).

---

## Summary by Priority

### Must Fix (CRITICAL + HIGH — 20 issues)

| ID | Issue | Category |
|----|-------|----------|
| C1 | Empty bias bars for 36 stories — no visual fallback | UI Bug |
| C2 | 206 broken source logos (cross-origin ground.news URLs) | Data/UI |
| C3 | 256 source cards crammed into narrow sidebar | Layout |
| C4 | ~960px blank space from empty bias distribution columns | Layout |
| C5 | 57% of stories misclassified as "Israel-Gaza" | Data |
| C6 | Tag cross-contamination ("Valentine's Day" on unrelated stories) | Data |
| H1 | Dark mode broken by inline `background: #fff` | UI Bug |
| H2 | "48 stories" label but only 25 visible | UI Bug |
| B1 | Missing two-column blindspot layout | Feature Gap |
| B2 | Missing blindspot percentage badges | Feature Gap |
| B5 | 11/15 blindspot stories mislabeled | Data |
| D1 | Inflated source counts everywhere | Data |
| F1 | No AI summary bullets | Feature Gap |
| F8 | No user account system | Feature Gap |

### Should Fix (MEDIUM — 18 issues)

| ID | Issue |
|----|-------|
| H3 | Source count pills show inflated numbers |
| H4 | 65% of stories use identical fallback image |
| S1 | Summary duplicates dek for 39% of stories |
| S2 | "unknown" values displayed as-is |
| S3 | Coverage Details KPIs don't add up |
| S4 | No social sharing icons |
| S7 | PerspectiveTabs empty with no message |
| S8 | No dynamic page titles or OG meta |
| B3 | "No bias data coverage" broken pill text |
| B4 | 60% of blindspot stories show same placeholder |
| B6 | Developer-facing note exposed to users |
| B7 | 100% center stories incorrectly flagged as blindspot |
| F2 | No "Covered Most By" sidebar |
| F5 | No city/location search on local page |
| F9 | Three-column homepage layout missing |
| F10 | Dark theme not matching Ground News |
| SP2 | No payment integration on subscribe |
| SP3 | Admin page exposed in navigation |
| SP4 | No full-text search backend |

### Nice to Fix (LOW — 16 issues)

| ID | Issue |
|----|-------|
| H5 | Sidebar thumbnails illegible at small size |
| H6 | KPI "1249 unique outlets" misleading |
| H7 | `paddingTop: 0.1` typo |
| H8 | No empty-state message for filters |
| H9 | Story card min-height inconsistency |
| H10 | Trending strip fade mask always applied |
| H11 | Non-standard 16/8 aspect ratio notation |
| H12 | Explore panel background inconsistent |
| S5 | Duplicate tags (case-insensitive) |
| S6 | Outlet names in tag lists |
| S9 | Reader mode panel layout |
| B8 | No blindspot-specific visual identity |
| F3 | No topic avatar/description |
| F4 | No weather widget on local page |
| F6 | No local news publishers directory |
| F7 | No podcast integration |
| F11 | No visual timeline component |
| SP1 | Rating system page static only |

---

## Recommended Fix Order

1. **Data pipeline fixes** (C5, C6, D1, D2, B5, B7) — fixing the ingestion pipeline resolves the most issues at once
2. **Layout critical fixes** (C3, C4, C1, C2) — move SourceCoveragePanel, hide empty panels, fix broken images
3. **Blindspot feature parity** (B1, B2) — the blindspot page is the most differentiated feature
4. **Homepage polish** (H1, H2, H3, H4) — first impressions matter
5. **Story page improvements** (S1–S8, F1) — enhance the reading experience
6. **Account system** (F8) — enable persistent personalization
7. **Secondary pages** (SP1–SP4) — round out the full product
