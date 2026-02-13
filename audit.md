# OpenGroundNews Parity Audit

> Comprehensive audit comparing OpenGroundNews (OGN) against Ground News (GN).
> Generated: 2026-02-13
> Methodology: Automated browser exploration of both sites via Chrome DevTools Protocol with screenshot-driven visual comparison and accessibility tree analysis. 12 agents total: 6 exploring GN baseline, 6 auditing OGN pages.

---

## Table of Contents

1. [Critical Bugs (P0)](#1-critical-bugs-p0)
2. [Homepage Parity](#2-homepage-parity)
3. [Story Detail Page Parity](#3-story-detail-page-parity)
4. [Blindspot Page Parity](#4-blindspot-page-parity)
5. [Topic/Interest Page Parity](#5-topicinterest-page-parity)
6. [My Feed & User Pages Parity](#6-my-feed--user-pages-parity)
7. [Local Page Parity](#7-local-page-parity)
8. [Search Parity](#8-search-parity)
9. [Navigation & Chrome Parity](#9-navigation--chrome-parity)
10. [Footer Parity](#10-footer-parity)
11. [CSS & Visual Design System](#11-css--visual-design-system)
12. [Dark Mode](#12-dark-mode)
13. [Responsive / Mobile](#13-responsive--mobile)
14. [Missing Pages & Features](#14-missing-pages--features)
15. [Priority Summary](#15-priority-summary)
16. [OGN Strengths Beyond GN](#16-ogn-strengths-beyond-gn)

---

## 1. Critical Bugs (P0)

Issues that are functionally broken and must be fixed immediately.

### 1.1 All Homepage Images Are SVG Placeholders

- **Location**: Homepage `/`, all `StoryCard` / `StoryListItem` components
- **Problem**: Every story image on the homepage renders as `story-fallback-thumb.svg`. Not a single real news image loads. The `StoryImage.tsx` component filters out Ground News URLs and the image proxy appears to fail for all external URLs, or stories lack `imageUrl` data in the database.
- **Impact**: The homepage looks like an unfinished wireframe. This is the single biggest visual quality gap.
- **GN Baseline**: Every story card shows a real photographic thumbnail.

### 1.2 Source Card Bias/Factuality Badges Are Invisible

- **Location**: Story detail page `/story/[slug]`, source article cards
- **File**: `app/globals.css` (`.bias-tone-unknown` styles)
- **Problem**: `.bias-tone-unknown` sets text color `rgb(238, 239, 233)` on background `rgb(242, 246, 232)`. The contrast ratio is ~1.02:1 -- text is invisible. This affects ALL source cards where bias is classified as "unknown", which is the majority.
- **Impact**: Source cards appear to have empty badge areas. Users cannot read bias or factuality information.

### 1.3 Bias Distribution Panel Text Invisible in Light Mode

- **Location**: Story detail page sidebar, "Bias Distribution" section
- **File**: `app/globals.css`, line ~1062
- **Problem**: `.bias-dist-panel` hardcodes `color: #f3f5f6` (near-white) and `background: #2f3135` (dark). But `.panel` overrides the background to `var(--bg-panel)` which in light mode is `#f8faf5` (near-white). Result: near-white text on near-white background.
- **Impact**: The bias distribution heading and subtitle are invisible in light mode.

### 1.4 Blindspot Badge Shows Wrong Percentage (Inverted Semantics)

- **Location**: `/blindspot`, `BlindspotStoryCard.tsx`
- **File**: `components/BlindspotStoryCard.tsx`, lines 9-12
- **Problem**: GN shows the MISSING side's percentage as the badge (e.g., "0% Right" for a story the Right missed). OGN shows the DOMINANT side's percentage (e.g., "90% Left" instead of "0% Right"). This completely inverts the meaning of the Blindspot feature.
- **Impact**: The core value proposition of the Blindspot feature is semantically wrong.

### 1.5 Blindspot Bias Bars Have No Fill Color

- **Location**: `/blindspot`, bias distribution bars on each card
- **File**: `app/globals.css`, line ~2274
- **Problem**: `.blindspot-row-bar .seg` only sets `display: block; height: 100%` with no `background` property. The `.seg-left`, `.seg-center`, `.seg-right` backgrounds are defined for `.bias-mini-bar` and `.bias-dist-progress` contexts but NOT for `.blindspot-row-bar`. All bars render as empty gray tracks.
- **Impact**: Bias distribution bars are completely non-functional on blindspot cards.

### 1.6 Topic Slug Routing Bug -- Ampersand Topics Fail

- **Location**: `/interest/business-and-markets`, `/interest/health-and-medicine`, etc.
- **File**: `lib/topics.ts`, line ~49
- **Problem**: The alias "business & markets" slugifies to "business-&-markets" (with ampersand), not "business-and-markets". The `canonicalTopicSlug` function fails to match, treating it as a unique, empty topic. The page shows "No stories yet."
- **Impact**: Any topic with an ampersand in its name (Business & Markets, Health & Medicine, Arts & Entertainment) returns an empty page.

### 1.7 Wrong Topic Name Due to Alias Merging

- **Location**: `/interest/artificial-intelligence`
- **File**: `lib/topics.ts`, line ~43
- **Problem**: The slug "artificial-intelligence" is aliased to "technology" in `TOPIC_DEFS`. GN treats "Artificial Intelligence" as its own distinct topic, but OGN merges it into "Technology". The page title, heading, and browser tab all show "Technology" instead of "Artificial Intelligence".
- **Impact**: AI-related content is incorrectly labeled. Users navigating to `/interest/artificial-intelligence` see "News about Technology".

---

## 2. Homepage Parity

### 2.1 Missing Sections

| # | GN Feature | Status in OGN | Severity |
|---|-----------|---------------|----------|
| 1 | Gold/tan promotional banner (`#D1BD91` bg, "See every side of every news story" + "Get Started" CTA) | MISSING | Medium |
| 2 | Separate utility bar (notifications bell, user avatar, location display) | MISSING | Medium |
| 3 | Per-topic section blocks (e.g., "Israel-Gaza News", "Politics News" carousels for followed topics) | MISSING | High |
| 4 | Blindspot email signup box (dark bg with email input for weekly Blindspot Report) | MISSING | Medium |
| 5 | "Similar News Topics" sidebar section (circular icons with follow buttons) | MISSING | Medium |
| 6 | Image attribution button ("i" icon) on hero card | MISSING | Low |
| 7 | "View Blindspot Feed" full-width CTA button | MISSING | Low |
| 8 | Original Reporting badge in Daily Briefing ("78% of sources are Original Reporting") | MISSING | Medium |
| 9 | Bullet summary items in Daily Briefing (e.g., additional story teasers with links) | MISSING | Medium |
| 10 | "For You" accent mark / notification dot on nav | MISSING | Low |

### 2.2 Visual Differences

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | Bias bar shape | Flat rectangular, 24px tall, 0px border-radius | Rounded pill, 10px tall, 999px radius, 1px border | High |
| 2 | Bias bar labels | Inside the bar: "Left 46%" | Below the bar: "46% left" (lowercase) | Medium |
| 3 | Hero card corners | Sharp, 0px border-radius | 18px rounded corners | Medium |
| 4 | Topic pills strip | Light chips on cream `#EEEFE9` bg | Dark strip `#262626` with light text | Medium |
| 5 | Subscribe button | Dark `#262626` bg, 4px radius | Green `#2d6a4f` bg, pill shape (999px radius) | High |
| 6 | Section headings | 32px font-size | 24px font-size | Medium |
| 7 | Column separators | Thin vertical dividers between 3 columns | No dividers | Low |
| 8 | Card shadows | No box-shadow (flat design) | `box-shadow: rgba(24,32,38,0.04) 0px 3px 12px` | Low |
| 9 | Default theme | Light mode | Dark mode | Medium |
| 10 | Feed items | Entire row is clickable (no explicit button) | Has explicit "See the Story" buttons | Low |

---

## 3. Story Detail Page Parity

### 3.1 Missing Sections

| # | GN Feature | Status in OGN | Severity |
|---|-----------|---------------|----------|
| 1 | Sidebar "Factuality" section (colored bar chart of factuality ratings) | MISSING entirely | High |
| 2 | Sidebar "Ownership" section (corporate ownership data visualization) | MISSING entirely | High |
| 3 | Podcast/Opinion section (artwork, bias badge, quote block, "Listen to Full Episode" link) | Template exists but never renders (no podcast data flows through) | High |
| 4 | "Insights by Ground AI" attribution footer below summary | MISSING | Medium |
| 5 | Hyperlinked entities in AI summary (e.g., "Tom Homan" linking to topic page) | MISSING -- summary is plain text | Medium |
| 6 | "Reposted by N other sources" on syndicated source cards | MISSING | Medium |
| 7 | Share icons: Embed, Block/Hide, Flag/Report | MISSING (OGN has 8 icons, GN has 10) | Low |
| 8 | "Broke the News" location narrative ("Sources are mostly out of United States") | MISSING | Medium |

### 3.2 Visual Differences

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | H1 font family | `universalSans` (sans-serif) | `Newsreader` (serif) | High |
| 2 | Sidebar title | "Coverage Details" | "At a Glance" | Medium |
| 3 | Sidebar field labels | "Leaning Left", "Leaning Right" | "Left", "Right" | Low |
| 4 | Timestamps | Relative: "13 hours ago" | Absolute: "Feb 12, 2026, 10:12 AM" | Medium |
| 5 | Location in metadata | Clickable link to topic page | Plain text, not a link | Medium |
| 6 | Perspective tab styling | Flat buttons, 4px radius, transparent bg | 9px radius, green-tinted bg, 1px border | Medium |
| 7 | Sidebar bias bar gradients | Left: `rgb(153,82,82)` to `rgb(217,190,190)`, Right: `270deg, rgb(77,109,158)` to `rgb(210,219,231)` | Left: `rgb(169,90,92)` to `rgb(200,158,160)`, Right: `90deg` (reversed direction) | Medium |
| 8 | Source logo grid | 6-column grid (one per bias tier) | 3-column grid (Left/Center/Right only) | Low |
| 9 | "Read Full Article" link | Single CTA per source card | Dual links: "Read in OGN Reader" + "Open Original" | Low (OGN improvement) |
| 10 | External link to ground.news | N/A | "Open Ground News source" sends users to ground.news | Medium |

---

## 4. Blindspot Page Parity

### 4.1 Structural Issues

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | Column divider | Thin `0.56px solid rgb(166,166,161)` vertical line | No divider | Medium |
| 2 | Section headings | H3, 32px, weight 600, universalSans | H2, 24px, weight 800, Bricolage Grotesque | Medium |
| 3 | Story count next to heading | Not shown | Shows count (e.g., "3") | Low |
| 4 | Info banner bg | Dark `rgb(38,38,38)` with cream text | Light panel with dark text | Medium |
| 5 | Info banner heading | "New to the Blindspot feed?" | "New to Blindspot?" | Low |
| 6 | Info banner link target | `/blindspot/about` | `/rating-system` | Low |
| 7 | Newsletter | Single button: "Sign up for the Blindspot Report newsletter" | Full form with email input, frequency dropdown, submit button | Medium |

### 4.2 Card Design Issues

| # | Issue | Severity |
|---|-------|----------|
| 1 | Cards have colored border frames (`#802727` / `#204986`) -- GN has no card borders | High |
| 2 | Frame colors are swapped: `.is-for-right` uses `#802727` (left's color) | High |
| 3 | "SEVERE" / "High" / "Moderate" / "Low" severity system is OGN invention, not in GN | High |
| 4 | Blindspot badge is plain text, not a colored pill (should have `#802727` / `#204986` bg) | High |
| 5 | Badge text should use "Only X%" prefix from GN; OGN does not | Medium |
| 6 | Card headline font size: 15.68px/700 vs GN's 22px/800 | Medium |
| 7 | Cards include summary paragraph and metadata -- GN cards do not | Low |
| 8 | Image aspect ratio: OGN 16:9 vs GN 608:440 (~1.38:1) | Low |
| 9 | Card is not fully clickable -- only headline is a link (GN wraps entire card in `<a>`) | Low |
| 10 | "BLINDSPOT TM" wordmark appears inside each card -- GN shows only a small icon + "Blindspot:" label | Medium |

---

## 5. Topic/Interest Page Parity

### 5.1 Structural Differences

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | Topic icon | Single uppercase letter in circle | Two-letter initials (e.g., "PO" for Politics) | Low |
| 2 | Description text | Dynamic: "Stay current... **Politics**... **27,627** stories... past 3 months" | Generic: "A topic hub showing coverage splits..." | Medium |
| 3 | Bias bar in header | NOT present (only in sidebar) | Present in header area | Low (OGN enhancement) |
| 4 | Blindspots section | 3-column grid (2 cards + newsletter card in same row) | 2-column grid; newsletter below | Medium |
| 5 | "Covered Most By" labels | Granular: "Lean Left", "Center", "Lean Right" | Simplified: "LEFT", "CENTER", "RIGHT" | Medium |
| 6 | "Local News Publishers" sidebar | Present | MISSING | Medium |
| 7 | "Suggest a source" card bg | Gold/tan `#D1BD91` | Plain panel, no gold bg | Low |

### 5.2 Extra OGN Sidebar Sections (Not in GN)

- Factuality Distribution grid
- Ownership section
- Explore section

These are OGN enhancements beyond GN parity.

---

## 6. My Feed & User Pages Parity

### 6.1 My Feed (`/my`)

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | Tab labels | "Saved Stories", "Manage Sources & Topics" | "Saved", "Manage" (shorter) | Low |
| 2 | "Following: N topics" link | Present between tabs and feed | MISSING | Medium |
| 3 | Favorites sidebar | Rich: circular icons, checkboxes, star buttons per topic | Simple: pill-style text links | Medium |
| 4 | Filter position | Right sidebar | Left sidebar | Medium |
| 5 | Filter controls | Topic search + "Search all Interests" checkbox | Feed dropdown, bias dropdown, keyword search, Reset button | Low (OGN has more filters) |

### 6.2 Discover Page (`/my/discover`)

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | Topic display | Rich grid: circular photo icons, follow toggles, organized into Favorites/Following/All | Flat tag cloud: pill tags with counts, no icons, no follow buttons | High |
| 2 | Search input | "Search all Interests" at top | MISSING | Medium |
| 3 | "Topics You Follow" section | Present with "See All" button | MISSING -- no distinction between followed/unfollowed | Medium |

---

## 7. Local Page Parity

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | IP geolocation auto-detect | Yes, auto-detects on first visit | No, defaults to "United States" | High |
| 2 | Weather icons | Visual weather condition icons (sun, clouds, rain) | Text-only labels ("Overcast", "Thunderstorm") | Medium |
| 3 | Weather initial state | Shows immediately | "Weather unavailable" flash before coordinates load | Medium |
| 4 | Publisher bias ratings | Actual bias labels (even "Untracked bias") | ALL show "UNKNOWN" | High |
| 5 | Publisher bias styling | Color-coded dots/circles | Plain text "UNKNOWN" badges | Medium |
| 6 | Single-source stories | Show "Read Article" instead of "See the Story" | All show "See the Story" regardless | Medium |
| 7 | Weather position | In main content area above featured cards | In sidebar (right rail) | Low |
| 8 | Location header | "News about [City Name]" with Follow button | "Set Your Local Feed" default | Medium |
| 9 | Follow button on location | Yes | MISSING | Low |

---

## 8. Search Parity

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | Daily Briefing card below search | Present | MISSING (has "Discover" section instead) | Medium |
| 2 | Topic matches in typeahead | Circular icons, story counts ("25,276 Stories"), follow buttons | Chip pills, counts but no circular icons, no follow buttons | Medium |
| 3 | Story matches in typeahead | Thumbnails, highlighted keywords in gold/tan, source counts, dates | No thumbnails, no keyword highlighting | Medium |
| 4 | Tab navigation (Stories/Topics/Sources) | Not visible in GN | PRESENT in OGN | Low (OGN enhancement) |
| 5 | Time and Bias filters on results | Not visible in GN | PRESENT in OGN | Low (OGN enhancement) |

---

## 9. Navigation & Chrome Parity

### 9.1 Top Navigation

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | Nav items | Home, For You, Local, Blindspot | Home, For You, My Bias, Local, Blindspot | Low (OGN adds My Bias) |
| 2 | "For You" notification dot | Red dot indicator | MISSING | Low |
| 3 | Search in nav | Magnifying glass icon + "Search" text | Full inline search bar | Low |
| 4 | Subscribe button color | Dark/black `#262626` | Green `#2d6a4f` | High |
| 5 | Hamburger menu position | Left side | Right side | Low |
| 6 | Location in date bar | Shows city name (e.g., "Shanghai, China") | No city name displayed | Medium |
| 7 | Edition selector | Globe icon + "International: Edition" dropdown in header utility bar | Dropdown labeled "Edition" in nav area, no globe icon | Low |

### 9.2 Hamburger Menu

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | Slide direction | From left | From right | Low |
| 2 | Topic categories | Present (International Politics, Finance, etc.) | MISSING from drawer | Medium |
| 3 | "Contact us" submenu | Present | MISSING | Low |
| 4 | "About Ground News" collapsible submenu | Present | Flat "Methodology" link instead | Low |
| 5 | Product submenu (apps, extension, newsletters, tools) | Present with full list | Partial: Extension + Newsletters links only | Low |

### 9.3 Mobile Bottom Nav

- **Status**: AT PARITY -- 5 items (News, For You, Search, Blindspot, Local) match GN exactly.

---

## 10. Footer Parity

| # | Element | GN | OGN | Severity |
|---|---------|----|----|----------|
| 1 | Upper topic navigation grid (News, International, Trending columns by region) | Present (5-column grid) | COMPLETELY MISSING | High |
| 2 | Social media icons (Facebook, X, Instagram, LinkedIn, Reddit) | Present | Placeholder text: "Community links will appear here..." | High |
| 3 | App Store / Google Play badges | Present | MISSING | Medium |
| 4 | Footer column structure | Company / Help / Tools (15+ links per column) | About / Features / Support / Legal (3-5 links per column) | High |
| 5 | Copyright notice | "(c) 2026 Snapwise Inc" | "OpenGroundNews - Open-source..." | Low (intentional) |
| 6 | Edition switcher in footer | Present with globe icon | MISSING | Low |

---

## 11. CSS & Visual Design System

### 11.1 Color System

| Token | GN Value | OGN Value | Status |
|-------|---------|-----------|--------|
| Page background | `#EEEFE9` | `#ecefe8` (+ subtle gradient) | Close |
| Primary text | `#262626` | `#182026` | Close |
| Left bias | `#802727` (dark red/maroon) | `#802727` | MATCH |
| Right bias | `#204986` (dark navy/blue) | `#204986` | MATCH |
| Center bias | `#FFFFFF` | `#FFFFFF` | MATCH |
| Gold accent | `#D1BD91` | `#d1bd91` | MATCH |
| Lean Left | `#C85C5C` (light red) | Varies | Approximate |
| Lean Right | `#5C8EE6` (light blue) | Varies | Approximate |
| Subscribe button | `#262626` (dark) | `#2d6a4f` (green) | MISMATCH |
| Card background | White, no shadow | White + subtle shadow | Different |

### 11.2 Typography

| Element | GN | OGN | Status |
|---------|----|----|--------|
| Primary font | `universalSans` (custom sans-serif) | `Bricolage Grotesque` (sans-serif) | Different but visually similar |
| Serif accent | `sohneSerif` | `Newsreader` | Different |
| H1 story headline | universalSans, 42px, weight 800 | **Newsreader (serif!)**, 42px, weight 800 | Wrong family -- uses serif! |
| Body text | 16px, weight 400 | 16px, weight 400 | MATCH |
| Font weights | 480, 680, 800 | 400, 600, 700, 800 | Close |

### 11.3 Component Patterns

| Component | GN | OGN | Status |
|-----------|----|----|--------|
| Hero bias bar height | 24px | 10px | MISMATCH |
| Mini bias bar height | 8px | 12px | Close |
| Bias bar border-radius | 0px (flat/square) | 999px (pill) | MISMATCH |
| Card border-radius | 8px | 8px | MATCH |
| Card border | 2px solid tertiary-light | 1px solid `rgb(210,217,205)` | Different |
| Card box-shadow | None (flat design) | `rgba(24,32,38,0.04) 0px 3px 12px` | Different |
| Button border-radius | 4px | 9px | Different |
| Subscribe button radius | 4px (rounded rect) | 999px (pill) | Different |

---

## 12. Dark Mode

### 12.1 Overall Assessment: Well Implemented

- Background `#262626` matches GN baseline
- Text `#eeefe9` matches GN baseline
- Card backgrounds properly themed
- Bias bar colors remain consistent across themes (matches GN behavior)

### 12.2 Dark Mode Issues

| # | Issue | Severity |
|---|-------|----------|
| 1 | `.bias-dist-panel` text invisible in light mode (see Critical Bug 1.3) | Critical |
| 2 | `data-theme="auto"` uses different tokens (`--bg: #181b1f`) vs manual dark (`--bg: #262626`) | Low |
| 3 | Default theme is Dark instead of GN's Light | Medium |

---

## 13. Responsive / Mobile

### 13.1 Breakpoint Comparison

| Purpose | GN Breakpoint | OGN Breakpoint | Status |
|---------|--------------|----------------|--------|
| Tablet | 602px | 760px | Different (OGN stays desktop longer) |
| Desktop | 1200px | 1120px | Close |
| Max width | 1440px | 1440px | MATCH |
| Mobile bottom nav | ~600px | 860px | Different |

### 13.2 Mobile Bottom Nav

- Correctly shows 5 items matching GN: Home, For You, Search, Blindspot, Local
- Dark mode styling properly applied

---

## 14. Missing Pages & Features

### 14.1 Missing Pages

| # | GN Page | URL | Status |
|---|---------|-----|--------|
| 1 | Blindspot About | `/blindspot/about` | MISSING |
| 2 | Source bias ratings | `/interest/{source}#bias-ratings` | MISSING |
| 3 | Blog | `/blog` | MISSING |
| 4 | Help Center | `/help` | MISSING |
| 5 | Testimonials | `/testimonials` | MISSING |
| 6 | Individual newsletter pages | `/newsletters/blindspot-report`, `/newsletters/burst-your-bubble`, `/newsletters/daily-ground` | MISSING |
| 7 | Checkout / Gift / Careers | Various | N/A (non-commercial) |

### 14.2 Missing Cross-Cutting Features

| # | Feature | Description | Severity |
|---|---------|-------------|----------|
| 1 | IP geolocation | Auto-detect user location for Local feed | High |
| 2 | Weather icons | Visual weather condition icons (not just text labels) | Medium |
| 3 | Podcast context | Podcast mentions with bias badges, timestamps, "Listen" links | High |
| 4 | Factuality sidebar | Dedicated factuality visualization on story detail pages | High |
| 5 | Ownership sidebar | Corporate ownership data visualization on story detail pages | High |
| 6 | Repost tracking | "Reposted by N other sources" on source cards | Medium |
| 7 | Entity linking | Hyperlinked named entities in AI summaries linking to topic pages | Medium |
| 8 | Image attribution | "i" info icon on story card images | Low |
| 9 | "Read Article" variant | Single-source stories should link directly instead of "See the Story" | Medium |
| 10 | Per-topic feed sections | Homepage sections for each followed topic (e.g., "Israel-Gaza News") | High |
| 11 | Duplicate story dedup | Same story appearing multiple times in topic feeds | Medium |
| 12 | Edition selector display bug | Shows "International" text but "United States" is actually selected | Medium |

---

## 15. Priority Summary

### P0 -- Critical Bugs (7 issues)

1. **All homepage images are SVG placeholders** -- no real images load
2. **Source card bias/factuality badge text invisible** -- contrast ~1:1 on "unknown" badges
3. **Bias distribution panel text invisible in light mode** -- hardcoded dark theme colors
4. **Blindspot badge percentage semantics inverted** -- shows dominant side, not missing side
5. **Blindspot bias bar segments have no fill color** -- all render as empty gray tracks
6. **Topic slug routing bug** -- ampersand topics (business-and-markets, health-and-medicine) resolve to empty pages
7. **Wrong topic name due to alias merging** -- /interest/artificial-intelligence shows "Technology"

### P1 -- High Severity (15 issues)

1. Bias bar shape wrong: pill (999px radius, 10px tall) vs flat rectangle (0px radius, 24px tall)
2. Subscribe button green `#2d6a4f` instead of dark `#262626`
3. Story headline uses serif font (Newsreader) instead of sans-serif
4. Missing Factuality sidebar section on story detail pages
5. Missing Ownership sidebar section on story detail pages
6. Missing Podcast/Opinion section on story detail pages
7. Per-topic homepage sections completely missing
8. Discover page is flat tag cloud instead of rich grid with icons and follow toggles
9. Blindspot cards have wrong colored border frames (GN uses no frames)
10. Blindspot "SEVERE" severity system is OGN invention (not in GN)
11. No IP geolocation auto-detection on Local page
12. All publisher bias ratings show "UNKNOWN" on Local page
13. Footer missing upper topic navigation grid
14. Footer missing social media icons
15. Footer content depth severely lacking (3-5 links vs 15+ per column)

### P2 -- Medium Severity (25+ issues)

Includes: missing gold promotional banner, missing utility bar, missing blindspot email signup, no column dividers, section heading sizes wrong (24px vs 32px), timestamps absolute vs relative, sidebar bias bar gradient colors/direction wrong, filter sidebar position swapped, My Feed tab labels shortened, "Following: N topics" missing, weather text-only (no icons), search typeahead missing thumbnails and keyword highlighting, hamburger menu slides from wrong side and missing topic categories, location not shown in date bar, blindspot info banner wrong styling, newsletter section wrong design, "Covered Most By" uses simplified labels, topic description text is generic not dynamic, edition selector display bug, and more.

### P3 -- Low Severity / Polish (15+ issues)

Card shadows, border widths, button border-radii, topic icon initials, semantic HTML differences, image aspect ratios, column separator lines, responsive breakpoint differences, "For You" notification dot, image attribution icons, and other polish items.

---

## 16. OGN Strengths Beyond GN

While this audit focuses on parity gaps, OGN has several features that go BEYOND Ground News:

1. **Additional filters**: Factuality, Ownership, and Paywall filters on source lists
2. **Dual reader links**: "Read in OGN Reader" + "Open Original" (vs GN's single external link)
3. **Factuality Distribution** sidebar on topic pages (GN doesn't have this)
4. **Ownership** sidebar on topic pages (GN doesn't have this)
5. **Search filters**: Time range, bias filters, quick topic/outlet facets on search results
6. **Tab navigation on search**: Stories/Topics/Sources tabs
7. **Reading History** tracking in My Feed
8. **Source discovery** with follow buttons in Discover
9. **Calendar, Maps, Compare** pages (unique to OGN)
10. **Archive-first reader** with fallback extraction
11. **Browser extension** (Chrome MV3)
12. **More filter options in My Feed**: Feed type dropdown, bias filter, keyword search

---

## Appendix: GN Design Reference

### Color Palette
```
Page Background:     #EEEFE9 (cream)
Dark Background:     #262626 (near-black)
Card Background:     #FFFFFF
Text Primary:        #262626
Text on Dark:        #EEEFE9
Gold Accent:         #D1BD91

Bias Colors:
  Far Left:          #802727 (dark red/maroon)
  Left:              #994040
  Lean Left:         #B35959 / #C85C5C
  Center:            #FFFFFF (white with border)
  Lean Right:        #5980B3 / #5C8EE6
  Right:             #406699
  Far Right:         #204986 (dark navy/blue)

Bias Bar Gradients:
  Left segment:      linear-gradient(90deg, #993852 -> #D9BEBE)
  Center segment:    #FFFFFF (solid white)
  Right segment:     linear-gradient(270deg, #4D6D9E -> #D2DBE7)

Tint Columns (Source Grid):
  Left:              #C09393
  Lean Left:         #D9BEBE
  Center:            #FFFFFF
  Lean Right:        #D2DBE7
  Right:             #90A4C3

Green (Orig. Reporting): #57912B
Yellow (Search accent):  #FFD902
```

### Typography
```
Primary Font:     universalSans (custom, weights: 480, 680, 800)
Secondary Font:   sohneSans (weights: 400, 600, 700)
Serif Accent:     sohneSerif (weight: 600)

H1 (Story):       42px, weight 800, line-height 47.5px
H2 (Section):     32px, weight 800, line-height 35px
H3 (Subsection):  22px, weight 680-800
H4 (Source card):  22px, weight 800, line-height 27.5px
Body:             16px, weight 400-480, line-height 24px
Bias badges:      12px, weight 680
Bias bar labels:  12px, weight 600
Metadata:         14px
```

### Layout
```
Max Width:          1440px
Grid:               12-column CSS grid
Desktop Padding:    48px horizontal
Mobile Padding:     16px horizontal
Column Gap:         32px

Homepage Layout:    3 | 6 | 3 columns
Topic Page Layout:  9 | 3 columns
Story Page Layout:  8 | 4 columns (approx)
My Feed Layout:     Flex, max-width 1120px

Breakpoints:
  Tablet:           602px
  Desktop:          1200px
  Design Max:       1440px

Cards:
  Border-radius:    8px
  Border:           2px solid tertiary-light
  Shadow:           None (flat design)

Buttons:
  Border-radius:    4px
  Primary:          Dark filled (#262626)
  Secondary:        Outline

Bias Bar (Hero):    24px tall, 0px border-radius
Bias Bar (Mini):    8px tall, 0px border-radius
```
