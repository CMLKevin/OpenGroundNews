# OpenGroundNews UX & Layout Audit

**Date:** February 13, 2026
**Viewport tested:** 1512x736 (desktop)
**Themes tested:** Light, Dark
**Pages audited:** Homepage, Story Detail, Search, Blindspot, Compare, Calendar, Maps, Newsletters, Login, For You / Discover, Help, About

---

## Critical: Routing & Broken Pages

### 1. `/about` resolves to "Story not found"
The `/about` route is caught by the dynamic `[slug]` story route instead of rendering a dedicated About page. The error message reads: *"The page may have moved, or this story slug no longer exists in the latest ingest."* This affects user trust and SEO.

**Likely affected pages:** `/blog`, `/testimonials` — any route in the footer that doesn't have a matching `app/` directory will fall into the story slug catch-all.

### 2. Console errors visible to users
A red "5 Issues" badge appears in the bottom-left corner on the For You page, and "1 Issue" on the Search page. These are Next.js dev overlay error indicators that expose internal errors to users even in a normal browsing session.

---

## High: Layout Issues

### 3. Homepage — massive empty space between left/center and right sidebar
When the left column (Daily Briefing) and center column (lead story + story feed) end, the right sidebar (Blindspot, newsletter signup, Similar News Topics) continues far below. This creates a large empty white/gray void spanning ~75% of the page width. The columns are not balanced.

**Recommendation:** Either extend center content to match sidebar length, or make the right sidebar `position: sticky` so it scrolls with the user and doesn't create dead space.

### 4. Compare page — oversized button containers
The "Swap" and "Compare" buttons sit in separate oversized containers that are far wider and taller than the input fields. The Source A/B inputs take up ~50% width while the two buttons share the other ~50% in awkward empty boxes. This looks unfinished.

**Recommendation:** Place "Swap" and "Compare" inline with the source inputs, or at minimum reduce the container size.

### 5. Calendar page — same oversized "Apply" button
The filter row (Topic, Bias, From, To) takes ~80% of the width, but the "Apply" button occupies its own disproportionately large container on the right.

### 6. Blindspot page — "For the Left" column appears empty
When scrolling the Blindspot page, the "For the Left" column has no visible story cards while "For the Right" shows content. This may be a data issue (no left-blindspot stories available) but the empty column with no explanation is confusing.

**Recommendation:** Show an explanatory message like "No left blindspot stories at this time" when the column is empty.

### 7. Story detail — right sidebar panel clips on scroll
The "Coverage Details" panel in the right sidebar appears sticky, but its heading text ("Coverage Details") gets clipped/cut off at the top of the viewport as you scroll down.

---

## Medium: Content & Data Display Issues

### 8. Skeleton/loading state stuck on story card
In the "Top Stories News" section on the homepage, the left card shows a permanent skeleton loading state (gray placeholder bars for title, description, and bias bar) with an overlay. The card image loads but the text content never renders. The right card in the same row loads fine.

### 9. "Bias data unavailable" cards with empty bars
Some story cards in the "Top Stories News" section display "Bias data unavailable" with a completely empty/invisible bias bar. This looks broken. These cards also show generic placeholder globe images instead of news photos.

**Recommendation:** Hide the bias bar entirely when data is unavailable, or show a more informative placeholder.

### 10. "Image unavailable" placeholder
In the main story feed, one story shows a light blue "Image unavailable" text placeholder. This is functional but visually jarring compared to surrounding cards with rich imagery.

**Recommendation:** Use a branded placeholder image (e.g., the OpenGroundNews halftone globe motif) instead of a text-only placeholder.

### 11. Story duplication across homepage sections
The same stories appear in multiple sections — Daily Briefing, the lead story area, topic sections (Politics News, Jeffrey Epstein News), and the story card grid. For example, "Epstein asked staff to install hidden video cameras..." appears at least 3-4 times on the homepage.

**Recommendation:** De-duplicate stories across sections, or at minimum de-duplicate between adjacent sections.

### 12. Story detail — "Link unavailable" in Podcasts & Opinions
The Podcasts & Opinions section shows a source ("La Opinion") with "UNKNOWN" bias, "BIAS UNKNOWN" badge, and "Link unavailable" text. Entries without usable links should be hidden or clearly differentiated.

### 13. Story detail — noisy metadata labels
Article cards in the source list show "Ownership: Unlabeled", "Paywall: unknown", and "Locality unavailable" prominently. Displaying unknown/unavailable data adds clutter without value.

**Recommendation:** Only show these metadata fields when they have meaningful values.

---

## Medium: UX & Interaction Issues

### 14. Trending bar — "U.k." capitalization
The trending topics bar displays "Trending In U.k." — the abbreviation should be "UK" (or "U.K.") not "U.k." with inconsistent casing.

### 15. Trending bar — "+" button purpose unclear
Each trending topic pill has a "+" button. Without a tooltip or label, it's not clear whether this follows the topic, adds it to a custom feed, or does something else.

**Recommendation:** Add a tooltip on hover (e.g., "Follow this topic") or use a more descriptive icon.

### 16. Newsletter page — frequency contradicts header
"Daily Briefing" is labeled "Every morning" but its frequency dropdown defaults to "Weekly". Similarly, "Blindspot Report" says "Twice weekly" but defaults to "Weekly". Users will be confused about what they're actually signing up for.

**Recommendation:** Set default dropdown values to match the section headers, or clarify the relationship.

### 17. Search page — shows Daily Briefing as default content
When no search query is entered, the search page displays the full Daily Briefing. This is the same content visible on the homepage and adds no value on a search page. Users expect an empty state or search suggestions.

### 18. Search page — "Type to search" redundant
The text "Type to search" appears in the top-right corner while the search input already has placeholder text saying the same thing. Redundant guidance.

### 19. Login page — weak visual hierarchy for primary action
"Sign in" and "Create account" are rendered as the same button style (outlined, small). The primary action (Sign in) should be visually emphasized over the secondary action.

### 20. Login page — right panel gradient barely visible
The marketing panel on the right side of the login page has a subtle gradient/image that's nearly invisible in light mode. It looks like a broken image load rather than a deliberate design choice.

### 21. Blindspot hero — low contrast text
On the Blindspot page, "Stories that one side barely sees" and "EDITION BLINDSPOTS" use light/muted colors on the dark hero background, making them difficult to read.

### 22. Blindspot hero — empty/broken element
There is a blank rectangular element in the top-right corner of the "New to the Blindspot feed?" banner that appears to be an unloaded image or broken button.

---

## Low: Navigation & Information Architecture

### 23. Footer links to non-existent pages
The footer links to pages like "About", "Blog", and "Testimonials" that either don't exist or fall into the story-slug catch-all (see issue #1). Users clicking these links see "Story not found."

### 24. No breadcrumb or back navigation on inner pages
Pages like story detail, calendar, and maps have no breadcrumb trail or consistent back-navigation pattern. The only way to return is the browser back button or clicking "Home" in the nav.

### 25. "For You" red dot indicator has no tooltip
The "For You" nav link has a red dot indicator (suggesting new/unread content or that it requires login). There's no tooltip explaining what this dot means.

---

## Responsiveness Issues (Code Analysis)

### 26. Only 3 breakpoints defined
The CSS uses only three `max-width` media queries: 1120px, 860px, and 760px. This is insufficient for modern device diversity (phones, tablets, landscape orientations). Notably:
- No breakpoint between 760px–1120px for tablets
- No small phone breakpoint (< 480px)

### 27. Abrupt 3-column to 1-column collapse
At 1120px, the `.feed-shell`, `.story-shell`, and `.home-hero-grid` layouts jump from 3 columns directly to 1 column with no intermediate 2-column state. This creates a jarring layout shift.

### 28. Desktop-first approach
All media queries use `max-width` (desktop-first). A mobile-first approach (`min-width`) would better ensure baseline mobile support.

### 29. No hamburger menu for mobile
At 760px, the desktop nav links are hidden (`display: none`) with no hamburger menu alternative. The only navigation on mobile is the bottom tab bar (which appears at 860px), but this only has 4-5 items vs. the full nav structure.

### 30. Fixed spacing doesn't scale
Grid gaps (e.g., `.feed-shell` uses `gap: 2rem`) and padding values remain constant across all breakpoints. 32px gaps that work at 1440px feel cramped on smaller screens where they consume proportionally more space.

### 31. Sticky sidebar offset is hardcoded
`.sticky-rail` has `top: 132px` matching the desktop topbar height. This value isn't adjusted when the layout changes at breakpoints, potentially causing overlap or excessive gaps on different viewport sizes.

---

## Dark Mode Issues

### 32. Generally well-implemented
Dark mode colors are well-applied. The primary and secondary backgrounds, card borders, and text colors all transition cleanly. A few minor notes:
- Some secondary text (e.g., source counts, read-time metadata) has slightly low contrast in dark mode
- The bias distribution bars maintain their colors well across themes

---

## Summary Table

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 2 | Routing, console errors |
| High | 5 | Layout imbalances, empty columns, clipped elements |
| Medium | 10 | Data display, UX contradictions, interaction clarity |
| Low | 3 | Navigation, information architecture |
| Responsiveness | 6 | Breakpoints, layout collapse, spacing |
| Dark Mode | 1 | Minor contrast |
| **Total** | **27** | |

---

## Recommended Priority Order

1. Fix route conflicts (issues #1, #23) — prevents users from seeing "Story not found" on legitimate pages
2. Fix homepage column imbalance (issue #3) — most visible layout problem
3. Fix stuck skeleton state (issue #8) — looks like a data/rendering bug
4. Fix Compare/Calendar button layout (issues #4, #5) — quick CSS fix
5. Add empty state for Blindspot left column (issue #6)
6. Clean up noisy metadata (issues #12, #13) — hide "unavailable" / "unknown" values
7. Fix newsletter frequency defaults (issue #16)
8. Improve login page visual hierarchy (issues #19, #20)
9. Add intermediate responsive breakpoints (issues #26, #27)
10. De-duplicate homepage stories (issue #11)
