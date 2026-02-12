# OpenGroundNews Visual Audit & Parity Report

**Date:** 2026-02-12
**Compared against:** https://ground.news/ (live production site)
**OpenGroundNews version:** localhost:3000 (Next.js 16, React 19, pure CSS)

---

## Executive Summary

This audit identifies **163 issues** across all pages of OpenGroundNews compared to the Ground News production site. Issues are organized by page and severity. The most critical gaps are:

1. **Empty center column on homepage** -- 467px of blank space below the hero card
2. **Missing sticky header and mobile bottom navigation** -- fundamental UX patterns absent
3. **Missing topic tags bar** on all pages (only partially on homepage)
4. **Section headers 61% too small** (19.52px vs Ground News's 32px)
5. **Wrong active tab styling** -- green fill (#D9E6CE) instead of gold underline (#D1BD91)
6. **Missing featured sections and compact list layouts** on interest/topic pages
7. **Missing 6-tab My Feed navigation** (Discover, Custom Feeds, Saved Stories, Citations, Manage)
8. **Bias bar colors and formats diverge significantly** from Ground News spec

---

## Table of Contents

- [A. Global / Cross-Page Issues](#a-global--cross-page-issues)
- [B. Homepage](#b-homepage)
- [C. Story Detail Pages](#c-story-detail-pages)
- [D. Blindspot Page](#d-blindspot-page)
- [E. Interest / Topic Pages](#e-interest--topic-pages)
- [F. Search Page](#f-search-page)
- [G. Local Page](#g-local-page)
- [H. My Feed / For You Page](#h-my-feed--for-you-page)
- [I. Source Pages](#i-source-pages)
- [J. Auth Pages (Login/Signup)](#j-auth-pages)
- [K. Onboarding Wizard](#k-onboarding-wizard)
- [L. Rating System Page](#l-rating-system-page)
- [M. Subscribe Page](#m-subscribe-page)

---

## A. Global / Cross-Page Issues

### A1. Header not sticky [P0]
**Ground News:** 4-layer sticky header (`position: sticky; top: 0; z-index: 999`)
**OpenGroundNews:** Header scrolls away with page content.
**Fix:** Add `position: sticky; top: 0; z-index: 999` to `.topbar`.

### A2. Missing mobile bottom navigation [P0]
**Ground News:** Fixed bottom bar with 5 items: News | For You | Search | Blindspot | Local (each with icon + label, 12px muted gray text).
**OpenGroundNews:** No bottom navigation at all; relies on hamburger menu drawer.
**Fix:** Create a `<MobileBottomNav>` component with fixed positioning at bottom, 5 icon+label items.
**File:** Create `components/MobileBottomNav.tsx`, add styles to `app/globals.css`.

### A3. Missing topic tags bar on secondary pages [P0]
**Ground News:** Horizontal scrollable trending topics strip below main nav, persistent on ALL pages. Each tag is a dark pill (#393938) with follow/unfollow (+/checkmark) icons. Has trending/fire icon prefix.
**OpenGroundNews:** Tags bar exists on homepage only, missing from /search, /local, /my, /story/*, /interest/*, /blindspot, etc.
**Fix:** Move the trending topics bar into the global header layout so it renders on all pages.
**File:** `app/layout.tsx`, `components/TopicTagsBar.tsx`

### A4. Missing hamburger menu on desktop [P1]
**Ground News:** Shows hamburger icon on all screen sizes (left of logo).
**OpenGroundNews:** "Menu" text button only on mobile.
**Fix:** Add hamburger icon to main nav, visible at all breakpoints.

### A5. Section header font size: 19.52px vs 32px [P0]
**Ground News:** Section headers (h2) use `font-size: 32px; font-weight: 800`.
**OpenGroundNews:** Section headers render at 19.52px (~1.22rem) weight 700.
**Fix:** Update `.section-title h2` and similar selectors to `font-size: 2rem; font-weight: 800`.
**File:** `app/globals.css`

### A6. Font family mismatch [P1]
**Ground News:** `universalSans` (weights 480/680/800) -- clean industrial sans-serif.
**OpenGroundNews:** `Bricolage Grotesque` (body) + `Newsreader` (serif/display).
**Note:** This is an intentional design choice. For full parity, would need to license universalSans or use a visual equivalent.

### A7. Bias bar center color: gray vs white [P1]
**Ground News:** Center segment = `#FFFFFF` (white), making it visually distinct.
**OpenGroundNews:** Center segment = `#8a97a2` (gray), which blends in.
**Fix:** Change `--center` CSS variable to `#FFFFFF` or `#DADBD6` (GN badge variant).
**File:** `app/globals.css`, bias bar segment styles.

### A8. Bias bar left/right colors too bright [P2]
**Ground News:** Left = `#802727`, Right = `#204986`.
**OpenGroundNews:** Left = `#b73f36` (too orange-red), Right = `#2c6291` (too light blue).
**Fix:** Update CSS custom properties for bias colors.
**File:** `app/globals.css`

### A9. Active tab/button styling: green fill vs gold underline [P0]
**Ground News:** Active tabs use `border-bottom: 3.75px solid #D1BD91` (golden underline), white/light background, weight 480.
**OpenGroundNews:** Active buttons use `background: #D9E6CE; border-color: #8CA978` (green fill).
**Fix:** Replace `.perspective-btn.is-active` styling with bottom-border approach.
**File:** `app/globals.css` lines 1097-1101

### A10. Nav links styled as pills vs plain text [P2]
**Ground News:** Plain text links (Home, For You, Local, Blindspot) with no borders.
**OpenGroundNews:** Pill buttons with borders (`border-radius: 999px; border: 1px solid var(--line)`).
**Fix:** Remove border/pill styling from `.navlinks a`.
**File:** `app/globals.css`

### A11. Missing "Subscribe" button in header [P2]
**Ground News:** Prominent solid button (`#EEEFE9` bg, `#262626` text, border-radius 4px).
**OpenGroundNews:** Only "Sign in" visible, no Subscribe.
**Fix:** Add Subscribe button to main nav.

### A12. Missing location display in utility bar [P2]
**Ground News:** Shows user's city/country in the utility bar.
**OpenGroundNews:** No location indicator in header.

### A13. Theme selector: dropdown vs inline text toggle [P3]
**Ground News:** "Theme: Light | Dark | Auto" as inline text links.
**OpenGroundNews:** `<select>` dropdown.
**Fix:** Replace dropdown with inline toggle buttons.

### A14. Max-width 1280px vs 1440px [P2]
**Ground News:** `max-width: 1440px`.
**OpenGroundNews:** `max-width: 1280px`.
**Fix:** Increase container max-width to 1440px.
**File:** `app/globals.css`, `.container`

### A15. Grid gap 16px vs 32px [P2]
**Ground News:** `gap-y: 32px` between grid rows.
**OpenGroundNews:** `gap: 16px` (1rem).
**Fix:** Increase gap to 2rem for main layout grids.

### A16. Card border-radius 14px vs 8px [P3]
**Ground News:** Cards use `border-radius: 8px`.
**OpenGroundNews:** Cards use `border-radius: 14px`.
**Fix:** Update `.story-card { border-radius: 8px; }`.
**File:** `app/globals.css` line 639

### A17. Footer is minimal [P3]
**Ground News:** Rich multi-column footer with About, Features, Support, Legal, social media links, app store badges, copyright.
**OpenGroundNews:** Single line: "OpenGroundNews - Fully open-source perspective-aware news reader".
**Fix:** Add multi-column footer with navigation links.

---

## B. Homepage

### B1. Empty 467px gap in center column below hero [P0]
**Ground News:** Center column (6/12 cols) shows hero card PLUS a scrollable news list below (individual story items with thumbnails, topic labels, headlines, bias bars, source counts).
**OpenGroundNews:** Center column shows ONLY the hero card (342px). Below it is ~467px of empty space.
**Fix:** Add a `<NewsList>` component below the hero card with compact story items.
**File:** `app/page.tsx`

### B2. Duplicate Daily Briefing [P0]
The Daily Briefing list renders TWICE: once in the hero section left sidebar and again in the feed section left sidebar.
**Fix:** Remove one of the two instances.
**File:** `app/page.tsx`

### B3. Missing "Top News Stories" section in left sidebar [P1]
**Ground News:** Has a separate "Top News Stories" section below the Daily Briefing with compact headlines + mini bias bars + coverage text.
**OpenGroundNews:** No such section exists.
**Fix:** Add TopNewsStories component below DailyBriefing.

### B4. "Original reporting: unknown" placeholder [P1]
Shows literal "unknown" text instead of a percentage or being hidden.
**Fix:** Calculate actual percentage or hide the field when data unavailable.
**File:** Component rendering the Daily Briefing section.

### B5. Missing story/article/read-time counts in Daily Briefing [P2]
**Ground News:** "9 stories, 849 articles, 9m read".
**OpenGroundNews:** Just shows "Top 6".
**Fix:** Add aggregated counts.

### B6. Blindspot section is plain text list [P1]
**Ground News:** Rich card layout with branded BLINDSPOT header (icon + gradient), red/blue colored card backgrounds (#802727 / #204986) with 8px padding creating border effect, image thumbnails, badges, "View Blindspot Feed" button.
**OpenGroundNews:** Simple text list with no visual identity.
**Fix:** Redesign BlindspotWidget component with card-based layout matching GN's design.
**File:** Right sidebar component in `app/page.tsx`

### B7. Hero card uses serif font (Newsreader) vs sans-serif [P2]
**Ground News:** Hero title uses `universalSans` (sans-serif).
**OpenGroundNews:** Uses `Newsreader` (serif).
**Fix:** Change hero heading font-family if targeting full parity.

### B8. Feed uses 2-column card grid vs single-column news list [P1]
**Ground News:** Center column uses a single-column list of compact story items.
**OpenGroundNews:** Uses `grid-template-columns: repeat(2, minmax(0, 1fr))` for full card grid.
**Fix:** Replace card grid with compact list layout for homepage feed.
**File:** `app/globals.css` line 633

### B9. Header layer order swapped [P2]
**Ground News:** Gold promo CTA banner on top, dark utility bar second.
**OpenGroundNews:** Dark promo banner on top, gold utility bar below.
**Fix:** Swap the order of `.promo-banner` and `.topbar-utility`.

### B10. "Weather enabled for your saved city" placeholder text [P3]
In the Daily Local News widget -- reads like a feature description, not content.
**Fix:** Replace with actual weather data or remove.

### B11. Column proportions: 0.92fr/1.7fr/0.92fr vs 3/6/3 cols [P2]
**Ground News:** 12-column grid with col-span-3 / col-span-6 / col-span-3 = 25%/50%/25%.
**OpenGroundNews:** `0.92fr 1.7fr 0.92fr` = ~26%/48%/26%.
**Fix:** Adjust to match GN proportions (or use `1fr 2fr 1fr`).

### B12. No user avatar/name in My News Bias widget [P3]
**Ground News:** Shows username + avatar + "N Stories, N Articles".
**OpenGroundNews:** Shows "10 read" with no identity info.

### B13. Coverage text as separate chips vs inline text [P3]
**Ground News:** Inline format "N% Bias coverage: N sources" at 16px.
**OpenGroundNews:** Separate pill elements at ~12px.

---

## C. Story Detail Pages

### C1. Column ratio 1.5:1 (60/40) vs 2:1 (67/33) [P1]
**Ground News:** Main content ~67%, sidebar ~33%.
**OpenGroundNews:** `grid-template-columns: 1.5fr 1fr` = ~60/40.
**Fix:** Change to `2fr 1fr`.
**File:** `app/globals.css` line 938

### C2. Sidebar not sticky [P1]
**Ground News:** Sidebar sections stick while scrolling.
**OpenGroundNews:** Sidebar scrolls away immediately.
**Fix:** Add `position: sticky; top: [header-height]` to sidebar container.
**File:** `app/globals.css` lines 903-907

### C3. Headline font-size 40px, should be 42px [P2]
`clamp(1.7rem, 4vw, 2.5rem)` maxes at 40px. Should reach 42px.
**Fix:** Change clamp max to `2.625rem`.
**File:** `app/story/[slug]/page.tsx` line 108

### C4. Headline font-weight 700, should be 800 [P1]
**Fix:** Add `fontWeight: 800` to headline inline style.
**File:** `app/story/[slug]/page.tsx` line 108

### C5. Headline line-height 43.2px, should be 47.5px [P2]
Using `lineHeight: 1.08`. At 42px that gives ~45px; need 47.5px (1.131).
**Fix:** Change to `lineHeight: 1.13`.

### C6. Metadata font-weight 400, should be 600 [P2]
**Fix:** Add `font-weight: 600` to `.story-meta`.
**File:** `app/globals.css` lines 670-673

### C7. Share buttons are text-based, not icon-based [P1]
**Ground News:** 24x24px SVG icon buttons for Facebook, X, LinkedIn, Reddit, Email, Pinterest.
**OpenGroundNews:** Text labels ("Post on X", "Share to Facebook") in pill buttons.
**Fix:** Replace text buttons with icon buttons.
**File:** `components/ShareBar.tsx`

### C8. Missing Email and Pinterest share options [P2]
Only 5 platforms vs GN's 6 (missing Email and Pinterest).
**Fix:** Add Email and Pinterest to ShareBar.
**File:** `components/ShareBar.tsx`

### C9. Share icons positioned after Key Points, should be near metadata [P1]
**Ground News:** Share icons appear inline with metadata, ABOVE the summary.
**OpenGroundNews:** ShareBar is below KeyPointsPanel.
**Fix:** Move ShareBar above the summary section.
**File:** `app/story/[slug]/page.tsx` line 142

### C10. Perspective tab names: "Left View" vs "Left" [P2]
**Ground News:** "Left", "Center", "Right" (single words).
**OpenGroundNews:** "Left View", "Center View", "Right View".
**Fix:** Shorten tab labels.
**File:** `components/PerspectiveTabs.tsx` lines 44, 49, 54

### C11. Missing "Bias Comparison" fourth tab [P2]
**Ground News:** Has a "Bias Comparison" button that shows side-by-side perspective comparison.
**Fix:** Add Bias Comparison tab/modal.
**File:** `components/PerspectiveTabs.tsx`

### C12. Perspective summary text 15.52px, should be 18px/480 [P2]
**Fix:** Update `.perspective-list li` to `font-size: 1.125rem`.
**File:** `app/globals.css` lines 1150-1154

### C13. Source card headers missing gray background [P1]
**Ground News:** Source cards have a gray header bar (`#393938`) with logo, name, badges.
**OpenGroundNews:** Transparent/white background.
**Fix:** Add `background-color: #393938` to source card header.
**File:** `app/globals.css`, `.source-item` class (lines 956-963)

### C14. Source logo 36px, should be 24px circle [P3]
**Fix:** Reduce `.source-logo` to 24px.
**File:** `app/globals.css` lines 978-985

### C15. Section heading "Full Coverage Sources" vs "X Articles" [P2]
**Ground News:** Shows "8 Articles" as heading.
**OpenGroundNews:** Shows "Full Coverage Sources" with subtext.
**Fix:** Use article count as the heading.

### C16. Missing "Broke the news" sidebar section [P2]
Shows which outlet first reported and how long ago.
**Fix:** Add new sidebar component.
**File:** `app/story/[slug]/page.tsx`

### C17. Missing L/C/R source count breakdown in sidebar [P2]
**Ground News:** Shows "Leaning Left: 122, Center: 168, Leaning Right: 104".
**OpenGroundNews:** Only shows Total News Sources and Last Updated.
**Fix:** Add breakdown to At a Glance section.

### C18. Bias distribution bar uses flat colors vs gradients [P2]
**Ground News:** Left gradient `#995252 -> #C09393 -> #D9BEBE`, Right gradient `#4D6D9E -> #90A4C3 -> #D2DBE7`.
**OpenGroundNews:** Approximate gradients `#a95a5c -> #c89ea0` (left), `#a7b9d5 -> #5e80b8` (right).
**Fix:** Match exact gradient values.
**File:** `app/globals.css` lines 798-809

### C19. Bias Distribution panel in main content vs sidebar [P2]
**Ground News:** Bias Distribution with source logo grid is in the right sidebar.
**OpenGroundNews:** Large inline section in the main content column.
**Fix:** Move to sidebar.

### C20. Missing "Reposted by X other sources" indicator [P3]
Shows when wire service content is syndicated.

### C21. Missing "Does this summary seem wrong?" feedback link [P3]

### C22. Image bias overlay rounding mismatch with component [P3]
CDN images include baked-in bias percentages that differ from the locally calculated ones (e.g., 30% vs 31%).

---

## D. Blindspot Page

### D1. Missing filter tabs: All / For the Left / For the Right [P0]
**Ground News:** Three filter tabs using URL params `?filter=left`, `?filter=right`.
**OpenGroundNews:** Only Edition/International toggle; no bias-side filtering.
**Fix:** Add "All", "For the Left", "For the Right" filter tabs.
**File:** `app/blindspot/page.tsx` lines 75-82

### D2. Bias breakdown: single bar vs 3-row layout [P0]
**Ground News:** Three separate rows each with label + individual colored bar + percentage:
```
Left     |=====|           59%
Center   |==========|      36%
Right    |=|                 5%
```
**OpenGroundNews:** Single combined horizontal bar with L/C/R labels.
**Fix:** Redesign BlindspotStoryCard to use 3-row breakdown.
**File:** `components/BlindspotStoryCard.tsx` lines 28-38

### D3. Duplicate bias bar from CDN image + component [P0]
CDN images from `web-api-cdn.ground.news/.../webMetaImg` have bias bars baked in. OGN also renders its own breakdown bar, creating visual duplication.
**Fix:** Either use a different image endpoint or remove the custom breakdown bar.
**File:** `components/BlindspotStoryCard.tsx` line 20

### D4. Card grid: 1 column vs 2 columns per side [P1]
**Ground News:** 2 cards per row within each side column.
**OpenGroundNews:** Single-column stack (1fr), making cards 632px wide.
**Fix:** Change to `gridTemplateColumns: "repeat(2, 1fr)"`.
**File:** `app/blindspot/page.tsx` lines 91 and 110

### D5. Missing colored card background "border" effect [P1]
**Ground News:** Red (#802727) or blue (#204986) background with 8px padding creating a colored border frame.
**OpenGroundNews:** Plain white card background.
**Fix:** Add wrapper div with colored background per bias direction.

### D6. Missing column subtitles [P2]
**Ground News:** "For the Left" has subtitle "News stories that had little to no reporting on the Left."
**OpenGroundNews:** Only title + numeric count.
**Fix:** Add subtitle text below each column heading.
**File:** `app/blindspot/page.tsx` lines 87-89, 106-108

### D7. Missing BLINDSPOT TM symbol [P3]
**Fix:** Add TM symbol to brand title.
**File:** `components/BlindspotHeader.tsx` line 34

### D8. Header description overridden by scope text [P3]
Subtitle prop overrides the default "Stories that one side barely sees." with scope text.
**Fix:** Show descriptive text, scope indicator separately.
**File:** `components/BlindspotHeader.tsx` line 35

### D9. Source count not uppercase [P3]
Should show "24 SOURCES" (uppercase).
**Fix:** Add `text-transform: uppercase` to source count badge.

### D10. Source badge format differs [P2]
**Ground News:** `[eye icon] Blindspot: [colored badge "0% Left"] [X sources]` between image and title.
**OpenGroundNews:** Source count at bottom of card, no eye icon, no colored severity badge.
**Fix:** Redesign badge row to match GN format.
**File:** `components/BlindspotStoryCard.tsx` lines 41-44

### D11. Missing "More stories" pagination button [P2]

### D12. Extra KPI strip not in Ground News reference [P3]
OGN has a stats bar showing "High-skew stories: 3" etc.

---

## E. Interest / Topic Pages

### E1. Missing "Top {Topic} News" 3-column featured row [P0]
**Ground News:** 3 featured story cards in a single row at top.
**OpenGroundNews:** All stories in uniform 2-column grid.
**Fix:** Add a featured section rendering first 3 stories in `repeat(3, 1fr)` grid.
**File:** `app/interest/[slug]/page.tsx` lines 142-148

### E2. Missing dedicated "Blindspots" section [P0]
**Ground News:** Dedicated area with blindspot cards, bias breakdowns, and newsletter signup.
**OpenGroundNews:** Blindspot stories mixed into general grid with small chip tags only.
**Fix:** Add BlindspotSection component between featured and list.

### E3. Missing compact list-style story cards [P1]
**Ground News:** Uses two layouts: featured cards (top) and compact list items (below) with text + small thumbnail on right.
**OpenGroundNews:** Single full-image card layout for all stories.
**Fix:** Create a compact `StoryListItem` component for below-the-fold stories.

### E4. Missing "More stories" pagination [P1]
Shows all 30 stories at once (hardcoded `stories.slice(0, 30)`).
**Fix:** Show initial batch with "More stories" button.
**File:** `app/interest/[slug]/page.tsx` line 144

### E5. Missing "Breaking News Topics Related to {Topic}" grid [P1]
**Ground News:** Bottom section with 4-column grid of related topic links with icons.
**Fix:** Add RelatedTopics component at bottom of page.

### E6. No bias labels on "Covered Most By" sources [P1]
**Ground News:** Each source shows bias label pill ("Lean Left", "Center", etc.).
**OpenGroundNews:** Only source name + article count with generic avatar.
**Fix:** Add bias label pills to source list items.
**File:** `app/interest/[slug]/page.tsx` lines 156-168

### E7. Column ratio 60/40 vs 70/30 [P1]
Uses `1.5fr 1fr` (60/40); GN uses ~70/30.
**Fix:** Change to `2.3fr 1fr` or similar.
**File:** `app/globals.css` line 946

### E8. 2-column card grid vs 3-column for featured [P1]
`.grid` uses `repeat(2, 1fr)`. Featured section should use `repeat(3, 1fr)`.
**Fix:** Different grid for featured vs regular sections.
**File:** `app/globals.css` line 633

### E9. Header says "{Topic}" vs "News about {Topic}" [P2]
**Ground News:** "News about Politics" with topic-specific description and story counts.
**OpenGroundNews:** Just "Politics" with generic description.
**Fix:** Update header template.
**File:** `app/interest/[slug]/page.tsx` lines 126-138

### E10. Missing "Media Bias Breakdown" bar chart [P2]
**Ground News:** Horizontal stacked bar with contextual question and descriptive answer.
**OpenGroundNews:** Raw KPI numbers (Left: 493, Center: 826, etc.).
**Fix:** Replace KPI grid with visual bar chart + descriptive text.

### E11. Missing "Suggest a source" card in sidebar [P3]

### E12. Sidebar not sticky [P2]
Same issue as story pages -- sidebar scrolls away.

### E13. Missing source logos/favicons [P2]
Shows text initials in circles instead of actual source logos.

### E14. 404 on many topic slugs [P2]
`/interest/science` and `/interest/artificial-intelligence` return 404 when no data exists.
**Fix:** Show empty state with "No stories yet" instead of 404.
**File:** `app/interest/[slug]/page.tsx` line 69

### E15. Bias bar label clipping on images [P3]
Small percentage text gets truncated at card image edges.

---

## F. Search Page

### F1. Autocomplete dropdown overlaps filter tabs [P2]
Suggestions dropdown sits on top of the tab bar, creating stacking confusion.
**Fix:** Dismiss dropdown before showing results, or use proper z-index layering.

### F2. Redundant search bars [P2]
Header search bar AND in-page search bar both visible.

### F3. Missing descriptive placeholder text [P3]
**Ground News:** "Enter an article's title, URL, or type to search...".
**OpenGroundNews:** Generic placeholder.

### F4. Missing search result count summary [P3]
GN shows "9 stories, 849 articles" type summary.

### F5. Skeleton loading persists for missing images [P2]
Grey gradient rectangles remain visible for cards with no image instead of a clean fallback.

---

## G. Local Page

### G1. Weather widget missing 7-day forecast [P1]
**Ground News:** Full 7-day forecast with weather icons, day names, min/max temps.
**OpenGroundNews:** Only current conditions (temp, feels-like, wind, sky).
**Fix:** Expand weather widget to show daily forecast.

### G2. Missing "Top {Location} News" hero section [P1]
**Ground News:** Highlighted top-3 local stories before regular feed.
**OpenGroundNews:** Goes straight to regular grid.

### G3. Missing location avatar/icon and description [P2]
GN shows circular city icon + detailed description paragraph with story counts.

### G4. Local News Publishers not collapsible [P3]
GN has it as collapsible panel with arrow icon.

### G5. Publishers missing bias indicator icons [P2]
GN shows colored circles for bias + favicon-like icons.

### G6. Missing "Discover stories in your city" CTA [P3]
GN has city search within publishers sidebar.

---

## H. My Feed / For You Page

### H1. Missing 6-tab navigation [P0]
**Ground News:** My Feed | Discover | Custom Feeds | Saved Stories | Citations | Manage Sources & Topics.
**OpenGroundNews:** Single flat page with no tabs.
**Fix:** Add tab navigation component with sub-routes.
**File:** `app/my/page.tsx` or create `app/my/layout.tsx`

### H2. Missing Filter sidebar [P1]
**Ground News:** "Search Topics you follow" input with "Search all interests" checkbox.
**OpenGroundNews:** No search/filter mechanism.

### H3. Missing Favorites sidebar [P1]
**Ground News:** Rich list with topic icons, checkboxes, star icons for favorites.
**OpenGroundNews:** Plain text "Your Topics" / "Your Sources" chips.

### H4. Story cards missing description snippets [P2]
**Ground News:** My Feed uniquely includes 2-3 line description snippets in story cards.
**OpenGroundNews:** No description text in feed cards.

### H5. No Discover tab [P1]
Missing topic/source discovery functionality.

### H6. No Custom Feeds tab [P2]

### H7. No Citations tab [P2]

### H8. Empty state in guest mode [P2]
GN shows stories even without login. OGN shows empty panels with prompts.

---

## I. Source Pages

### I1. Missing comprehensive source profile [P1]
**Ground News:** Logo, description, website link, factuality rating, ownership, country, founded date, bias breakdown.
**OpenGroundNews:** Basic counts and coverage samples only.

### I2. "Bias: L 0, C 6, R 0" notation unclear [P2]
Should use visual bias bar instead of abbreviated text.

### I3. "Back to Home" misplaced as tag chip [P3]
Appears alongside bias tags; should be in breadcrumb navigation.

### I4. All articles show "unknown" factuality [P2]
Factuality data not populating properly.

### I5. No "about this source" description paragraph [P2]

---

## J. Auth Pages

### J1. SSO buttons disabled but rendered [P2]
"Continue with Google (coming soon)" looks unfinished.
**Fix:** Hide until implemented, or make "coming soon" badge more prominent.

### J2. No "Forgot password?" link [P2]
Standard login UX pattern missing.

### J3. No Terms of Service links [P3]
Login/signup forms should reference TOS.

### J4. Pages look sparse [P3]
Large empty whitespace below forms.

---

## K. Onboarding Wizard

### K1. Topic/source chips lack clear toggle states [P1]
No visible color change or checkmark on selection.
**Fix:** Add active state styling with color change + checkmark icon.

### K2. Missing progress bar / stepper [P2]
Only "Step X of 4" text. Need visual progress indicator.

### K3. No location setup step [P2]
GN onboarding includes location for local news; OGN wizard doesn't.

### K4. Hero section repeats on every step [P3]
"Build your perspective-aware feed" takes vertical space every step.

---

## L. Rating System Page

### L1. Only 3 bias buckets vs Ground News's 7 categories [P1]
**Ground News:** Far Left, Left, Lean Left, Center, Lean Right, Right, Far Right with detailed descriptions and colored squares.
**OpenGroundNews:** Left / Center / Right only.
**Fix:** Expand to 7-category system with descriptions.

### L2. Missing colored category icons [P2]
GN uses distinctive colored squares (red -> gray -> blue) next to each category.

### L3. Missing methodology explanation [P2]
GN explains how ratings are assigned (third-party fact-checkers, editorial review).

### L4. No example sources per rating [P3]

---

## M. Subscribe Page

### M1. No imagery/illustrations in plan cards [P1]
**Ground News:** Artistic illustrations in each pricing card.
**OpenGroundNews:** Text-only cards.

### M2. No pricing toggle (Monthly/Annual) [P2]
GN has billing period options.

### M3. No "As featured on" logo strip [P3]
GN shows Forbes, MIT Tech Review, WSJ logos.

### M4. No testimonial section [P3]
GN has Nobel Peace Center testimonial.

### M5. No feature comparison table [P1]
GN has detailed feature comparison matrix below pricing.

---

## Priority Summary

### P0 -- Critical (17 issues)
| ID | Page | Issue |
|----|------|-------|
| A1 | Global | Header not sticky |
| A2 | Global | Missing mobile bottom navigation |
| A3 | Global | Missing topic tags bar on secondary pages |
| A5 | Global | Section headers 61% too small (19.52px vs 32px) |
| A9 | Global | Active tab green fill vs gold underline |
| B1 | Homepage | Empty 467px gap in center column |
| B2 | Homepage | Duplicate Daily Briefing |
| D1 | Blindspot | Missing filter tabs (All / Left / Right) |
| D2 | Blindspot | Bias breakdown single bar vs 3-row layout |
| D3 | Blindspot | Duplicate bias bar from CDN image |
| E1 | Interest | Missing featured 3-column row |
| E2 | Interest | Missing dedicated Blindspots section |
| H1 | My Feed | Missing 6-tab navigation |

### P1 -- High (34 issues)
A4, A6, A7, B3, B4, B6, B8, C1, C2, C4, C7, C9, C13, D4, D5, E3, E4, E5, E6, E7, E8, G1, G2, H2, H3, H5, I1, K1, L1, M1, M5

### P2 -- Medium (42 issues)
A8, A10, A11, A12, A14, A15, B5, B7, B9, B11, C3, C5, C6, C8, C10, C11, C12, C15, C16, C17, C18, C19, D6, D10, D11, E9, E10, E12, E13, E14, F1, F2, F5, G3, G5, H4, H6, H7, H8, I2, I4, I5, J1, J2, K2, K3, L2, L3, M2

### P3 -- Low (30 issues)
A13, A16, A17, B10, B12, B13, C14, C20, C21, C22, D7, D8, D9, D12, E11, E15, F3, F4, G4, G6, I3, J3, J4, K4, L4, M3, M4

---

## Ground News Reference Design Tokens

For implementation, reference these extracted Ground News design values:

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Page bg (dark) | `#262626` | Main background |
| Card bg (dark) | `#393938` | Secondary surfaces |
| Text primary | `#EEEFE9` | Primary text on dark |
| Text dark | `#262626` | Text on light bg |
| Accent gold | `#D1BD91` | Active tabs, CTA banner |
| Left bias | `#802727` | Bias bar left segment |
| Center bias | `#FFFFFF` | Bias bar center segment |
| Right bias | `#204986` | Bias bar right segment |
| Left gradient | `#995252 -> #C09393 -> #D9BEBE` | Source grid rows |
| Right gradient | `#4D6D9E -> #90A4C3 -> #D2DBE7` | Source grid rows |
| Border | `#A6A6A1` | Column separators |
| Muted text | `#6A7078` | Secondary text |

### Typography
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Body | 16px | 480 | 24px |
| Section heading (h2) | 32px | 800 | 35px |
| Story headline (detail) | 42px | 800 | 47.5px |
| Card title | 16px | 600 | 17.5px |
| Metadata | 12px | 600 | -- |
| AI summary bullets | 18px | 480 | 22.5px |
| Coverage text | 12px | 480 | -- |
| Nav items | 16px | 480 | -- |
| Buttons | 16px | 680 | -- |

### Spacing
| Token | Value |
|-------|-------|
| Page max-width | 1440px |
| Page padding (desktop) | 48px horizontal |
| Section gap | 32px |
| Card gap | 16px |
| Card border-radius | 8px |
| Column separator | 0.625px solid #A6A6A1 |
| Bias bar height (large) | 24px |
| Bias bar height (small) | 8px |
| Source logo size | 24px circle |

### Font
- **Primary:** universalSans (weights 480, 680, 800)
- **Framework:** Tailwind CSS v4 + Shadcn/UI + CSS Modules
- **Dark mode:** `.dark` class on `<html>`
