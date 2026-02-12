# OpenGroundNews Parity Audit v2

**Date**: February 13, 2026
**Baseline**: https://ground.news/ (live production)
**Target**: OpenGroundNews (localhost:3000, branch `main`)
**Previous audit**: `docs/parity/PARITY_TODO.md` (120 issues, all marked done)

This audit identifies **new** issues found after the v1 parity sweep was completed. Issues are organized by severity (P0 Critical, P1 High, P2 Medium, P3 Low) and grouped by page/feature area.

---

## Summary

| Severity | Count |
|----------|-------|
| P0 (Critical) | 8 |
| P1 (High) | 18 |
| P2 (Medium) | 22 |
| P3 (Low) | 14 |
| **Total** | **62** |

---

## A. Global / Cross-Page Issues

### A-01 (P0) Broken story images: cross-origin `ground.news` URLs

Many story `imageUrl` values in the data store point to `https://ground.news/images/story-fallback.svg`. This is an external domain that will either 403 or serve Ground News's own branded SVG. The result is that the hero image and many story thumbnails show either a broken image or another site's branding.

**Files**: `components/StoryImage.tsx`, ingestion pipeline
**Fix**: During ingestion, strip or rewrite any `imageUrl` that points to `ground.news/images/*`. Map these to the local fallback set (`/images/fallbacks/story-fallback-{1..5}.svg`). In `StoryImage`, add an allowlist check so `ground.news` URLs are treated as missing.

---

### A-02 (P0) No real news photographs on any page

Every story on every page shows either a local SVG placeholder or the broken `ground.news` URL. No actual news photography is displayed anywhere in the app. Ground News shows real images on hero cards, story cards, and thumbnails.

**Files**: Ingestion pipeline, `lib/types.ts` (Story.imageUrl)
**Fix**: The ingestion pipeline must extract and proxy/cache actual article `og:image` URLs. Store them locally or via a CDN. When `og:image` is unavailable, fall back to the SVG set.

---

### A-03 (P0) Three of five trending interest topics are empty

`/interest/us-news`, `/interest/world`, and `/interest/science` return zero stories. These are the most common entry-point topics from the trending strip. Users clicking trending topics land on empty pages.

**Files**: Ingestion pipeline topic mapping, `lib/lookup.ts`
**Fix**: Ensure the ingestion pipeline maps stories to all standard topic slugs. Add aliases so e.g. `us-news` matches stories with topic "US Politics", "United States", etc. Consider adding a fallback that redirects empty topics to a search results page.

---

### A-04 (P1) Raw slugs displayed as topic page titles

Empty interest pages show "News about us-news" / "News about world" / "News about science" instead of human-readable display names like "US News", "World", "Science".

**Files**: `app/interest/[slug]/page.tsx` lines ~30-35, `generateMetadata()`
**Fix**: Add a `topicDisplayName(slug)` lookup function that converts slugs to proper title-case display names. Use this in both the page heading and metadata.

---

### A-05 (P1) Desktop nav links have no active state

Desktop navigation links (Home, For You, Local, Blindspot) do not show any visual indicator for the current page. The mobile bottom nav correctly applies `is-active` based on pathname, but the desktop `navlinks` do not.

**Files**: `components/TopNavClient.tsx`
**Fix**: Compare `pathname` against each nav link's `href` and add an `is-active` class. Style with the gold underline treatment used elsewhere.

---

### A-06 (P1) Footer social links are placeholder URLs

- GitHub links to `https://github.com` (root, not the project repo)
- X links to `https://x.com` (root)
- Email uses `hello@opengroundnews.local` (`.local` is non-routable)

**Files**: `components/SiteFooter.tsx`
**Fix**: Replace with actual project URLs or remove until real accounts exist.

---

### A-07 (P2) Promo banner has no dismiss mechanism

The gold promo banner appears unconditionally on every page load, pushing content down ~40px. Ground News allows closing promotional banners.

**Files**: `components/TopNav.tsx` or the promo banner section
**Fix**: Add a dismiss button that sets a localStorage flag. Hide the banner when the flag is set.

---

### A-08 (P2) Topbar consumes ~180-200px of viewport height

With promo banner + utility bar + main nav + trending strip all stacked, the sticky header takes significant vertical space. Ground News has a more compact header.

**Files**: `app/globals.css` (topbar styles)
**Fix**: Consider collapsing the utility bar into the main nav, or auto-hiding the trending strip on scroll.

---

### A-09 (P2) No loading skeletons for SSR Suspense boundaries

The TopNav Suspense fallback is an empty `<header className="topbar" />`. No page has skeleton loading states. Users see blank containers during server-side rendering.

**Files**: `app/layout.tsx` line 42-44, all page components
**Fix**: Add skeleton placeholder components that match the expected layout dimensions.

---

### A-10 (P2) No custom 404 page

Story pages call `notFound()` but there is no custom `not-found.tsx` in the app directory. The default Next.js 404 page is shown.

**Files**: `app/not-found.tsx` (missing)
**Fix**: Create a branded 404 page with navigation back to home and search.

---

### A-11 (P2) No React error boundaries

No pages have React error boundaries. If a server component throws, users see the default Next.js error page.

**Files**: `app/error.tsx` (missing), `app/global-error.tsx` (missing)
**Fix**: Add error boundary components with graceful fallback UI.

---

### A-12 (P3) Favicon is a generic placeholder SVG

The site favicon is set to `/images/story-fallback.svg`, which is the news story placeholder, not a branded icon.

**Files**: `app/layout.tsx` metadata
**Fix**: Create a proper favicon/icon set (16x16, 32x32, apple-touch-icon).

---

### A-13 (P3) Excessive inline styles in components

Nearly every component uses inline `style` attributes (e.g. `style={{ display: "grid", gap: "0.7rem" }}`). This creates maintenance burden and makes it harder to maintain consistent design tokens.

**Files**: Multiple components
**Fix**: Extract repeated inline styles into CSS classes in `globals.css`.

---

### A-14 (P3) Reading time estimates are uniformly "~1 min"

`storyReadTimeMinutes()` calculates from `title + dek + summary` only (not full article text), so nearly every story shows "~1 min read".

**Files**: `lib/readTime.ts` or equivalent utility
**Fix**: Calculate reading time from full source article text counts, or remove the read-time display if data is unavailable.

---

## B. Homepage

### B-01 (P0) Duplicate content between hero grid and feed

Stories 2-10 appear in both the hero center area NewsList AND again in the "Latest Stories" feed below. Users see the same stories twice when scrolling.

**Files**: `app/page.tsx`
**Fix**: Offset the feed section to start after the last hero story index, or deduplicate by slug.

---

### B-02 (P1) Daily Local News widget shows empty state by default

"No local-marked stories found. Pick a city in Local settings to improve matching." This is a dead widget for most first-time visitors.

**Files**: Homepage right sidebar, `components/DailyLocalNews.tsx` (or equivalent)
**Fix**: Show a location picker inline when no city is set, or hide the widget for guests and show a "Set up Local" CTA instead.

---

### B-03 (P1) My News Bias widget shows all-zero state for guests

0% left, 0% center, 0% right with an empty bias bar. Not useful for first-time visitors.

**Files**: `components/MyNewsBiasWidget.tsx`
**Fix**: For guests with no reading history, show an explanatory message ("Start reading to see your bias breakdown") or hide the widget.

---

### B-04 (P2) Trending topics may show generic static fallbacks

The fallback list is ["Politics", "World", "Business", "Technology", "Science", "Health", "Sports", "Climate"] -- static categories, not actual trending topics derived from real-time data.

**Files**: `components/TrendingStrip.tsx` or equivalent, API endpoint
**Fix**: Ensure the trending API returns dynamically computed trending topics based on recent story volume/velocity.

---

### B-05 (P2) "Explore" left rail in feed section is sparse

Only 5 pill links (Local, For You, Blindspot, Rating system, Support). Ground News has richer sidebar discovery content.

**Files**: `app/page.tsx` left rail section
**Fix**: Add recent topics, popular categories, or editorial picks to the left rail.

---

### B-06 (P3) Homepage does not use StoryCard grid view

The `StoryCard` component exists (with cover image, summary, chips, bias bar) and the `.grid` CSS class (2-column card grid) is defined, but the homepage exclusively uses `StoryListItem`. Ground News mixes card and list views.

**Files**: `app/page.tsx`
**Fix**: Consider using the card grid for the first few feed stories before switching to list view.

---

## C. Story Detail Pages

### C-01 (P1) Duplicate BiasBar in main content and sidebar

The bias bar appears both in the main article area and in the sidebar "At a Glance" section, wasting vertical space.

**Files**: `app/story/[slug]/page.tsx`
**Fix**: Remove the sidebar duplicate or the main content one. Keep the more contextual placement.

---

### C-02 (P1) Low-quality auto-generated summaries

Some story summaries contain:
- Scraped metadata fragments: "Breaking News, Sports, Manitoba, Canada"
- Raw wire-service formatting: "(Adds statement in paragraphs 2 and 3, details from paragraph 4) LONDON, Feb 11 -"

**Files**: Ingestion pipeline summary extraction
**Fix**: Add summary quality validation during ingestion. Strip wire-service update markers and reject summaries that are just category/tag lists.

---

### C-03 (P1) BiasDistributionPanel has excessive min-height

The bias columns have `min-height: 320px`, creating tall empty space when there are only 1-2 sources per column. On mobile (single-column stack), this wastes ~960px of vertical space.

**Files**: `app/globals.css` (`.bias-column`)
**Fix**: Remove the `min-height` or reduce it to `120px`. Let content determine height.

---

### C-04 (P2) DailyBriefingList in sidebar is mislabeled

The sidebar "Daily Briefing" fetches recent stories and filters out the current one. It's really "Other recent stories", not a curated daily briefing.

**Files**: `components/DailyBriefingList.tsx`
**Fix**: Rename to "Related Stories" or "More Stories" to accurately describe the content.

---

### C-05 (P2) Coverage percentage rounding can produce inaccurate numbers

Lines 66-97 in the story page have complex fallback logic to compute L/C/R counts from percentage data. Integer rounding can produce numbers that don't sum correctly.

**Files**: `app/story/[slug]/page.tsx`
**Fix**: Use the `coverageLeft`/`coverageCenter`/`coverageRight` fields from the data store when available. Only fall back to percentage-based calculation when counts are missing.

---

### C-06 (P2) SummaryFeedbackLink dialog button conflict

The "Close" button uses `value="cancel"` with `method="dialog"`, which competes with the "Send feedback" submit button. Both are form submissions that could confuse users.

**Files**: `components/SummaryFeedbackLink.tsx`
**Fix**: Move the Close button outside the form, or use `type="button"` with a manual `dialogRef.current?.close()` call.

---

### C-07 (P2) ReaderDrawer shows raw status values

Users see "Status: archive_fallback" or "Status: ok" which are internal status codes, not user-friendly labels.

**Files**: `components/ReaderDrawer.tsx`
**Fix**: Map status values to user-friendly labels: "ok" -> "Archived", "archive_fallback" -> "Cached version", "error" -> "Unavailable".

---

### C-08 (P2) Timeline entries use generic labels

When `story.timelineHeaders` exists, timeline entries show generic "Update cue" text rather than actual dates/event descriptions.

**Files**: `components/TimelinePanel.tsx`
**Fix**: Extract actual event descriptions and timestamps from the timeline data.

---

### C-09 (P3) "View on Ground News" external link may confuse users

The external navigation link to `story.canonicalUrl` on Ground News could confuse users about what site they're on.

**Files**: `app/story/[slug]/page.tsx`
**Fix**: Consider making this less prominent or adding a tooltip explaining it links to the original Ground News page.

---

### C-10 (P3) KeyPointsPanel quality depends on extraction algorithm

Points are labeled "Auto-generated" with a disclaimer. Quality varies significantly.

**Files**: `components/KeyPointsPanel.tsx`, `lib/keypoints.ts`
**Fix**: Add minimum quality thresholds. Don't display the panel if fewer than 2 substantive key points can be derived.

---

## D. Blindspot Page

### D-01 (P2) BlindspotStoryCard badge row overflow risk

The badge row contains many inline elements (eye icon, wordmark, severity, skew, sources, column label). On narrow card widths in the 2-column grid, these can overflow or wrap awkwardly.

**Files**: `components/BlindspotStoryCard.tsx`, `app/globals.css` (`.blindspot-badge-row`)
**Fix**: Add `flex-wrap: wrap` to `.blindspot-badge-right` (already present) and ensure minimum card width accommodates the badge content. Consider moving source count to a second line.

---

### D-02 (P2) Blindspot hero subtitle contrast may be low

`.blindspot-brand-sub` uses `color: rgba(255, 243, 215, 0.82)` (light cream) on the purple gradient background. Contrast ratio may be below WCAG AA.

**Files**: `app/globals.css` (`.blindspot-brand-sub`)
**Fix**: Test contrast ratio and increase opacity to at least 0.92 or use a solid light color.

---

### D-03 (P3) No loading state for server-rendered blindspot page

Since the page uses `force-dynamic`, users see a blank page until the server responds. No skeleton or spinner.

**Files**: `app/blindspot/page.tsx`, `app/blindspot/loading.tsx` (missing)
**Fix**: Add a `loading.tsx` with skeleton cards matching the blindspot card dimensions.

---

## E. Interest / Topic Pages

### E-01 (P0) Duplicate story in Technology topic

The Instagram social media addiction story appears twice with slightly different slugs (`171254` and `0155a4`) and source counts (29 vs 28). This is a data deduplication failure.

**Files**: Ingestion pipeline deduplication logic
**Fix**: Implement title-similarity deduplication during ingestion. Use fuzzy matching (Levenshtein distance or n-gram overlap) to detect near-duplicate stories.

---

### E-02 (P0) Topic misclassification: entertainment stories under Politics

"Bad Bunny Streams Skyrocketed After the Super Bowl" appears under the Politics topic. This is a topic assignment error from ingestion.

**Files**: Ingestion pipeline topic classifier
**Fix**: Improve topic classification accuracy. Consider multi-label classification and ensure entertainment/music stories aren't assigned to Politics.

---

### E-03 (P1) "Latest" section renders empty when stories equal featured count

On the Technology topic (3 stories), the offset logic (`listStart = 3`) skips all stories since only 3 exist. Result: "Showing 3 of 3" heading with an empty list below.

**Files**: `app/interest/[slug]/page.tsx`
**Fix**: Hide the "Latest" section entirely when `stories.length <= featuredCount` instead of showing an empty container.

---

### E-04 (P1) Malformed CDN URL for source logos

GV Wire's logo URL contains `[fe1]` in the path: `groundnews.b-cdn.net/interests/[fe1]/237fb0d33cf38de742632e871e2665a21a718762.jpg`. This will fail to load.

**Files**: Ingestion pipeline CDN URL handling
**Fix**: Validate and sanitize CDN URLs during ingestion. Strip URL-encoded brackets.

---

### E-05 (P1) All outlet bias pills in sidebar show "unknown"

In the "Covered Most By" sidebar, major outlets like Reuters, CNN, Fox News all show "unknown" bias rating at the outlet level, even when their individual source cards have correct bias tags.

**Files**: Ingestion pipeline outlet enrichment, `lib/types.ts`
**Fix**: Aggregate bias ratings from source-level data to populate outlet-level `biasRating`. If 14/14 source cards for Fox News are tagged "right", the outlet should be "right".

---

## F. Search Page

### F-01 (P1) Search is entirely in-memory and not scalable

`searchStories()` calls `readStore()` which loads all stories into memory and performs tokenization-based scoring. This works for small datasets but will be slow at scale.

**Files**: `lib/search.ts`
**Fix**: For production scale, move to a database-backed full-text search (PostgreSQL `tsvector` or external search service).

---

### F-02 (P2) No discovery content when search box is empty

When no query is entered, the results area is completely empty. No "popular searches", "trending topics", or discovery content.

**Files**: `app/search/page.tsx`
**Fix**: Show trending topics, recent popular searches, or featured stories when the query is empty.

---

### F-03 (P2) Topics and Sources tabs are thin

Topics and Sources tabs only show pill lists with facet labels and counts. No additional context, descriptions, or story previews.

**Files**: `app/search/page.tsx`
**Fix**: For Topics tab, show a preview of the top 2-3 stories per topic. For Sources tab, show outlet profile info (bias, factuality, story count).

---

### F-04 (P3) Filter dropdowns require clicking "Apply"

The bias and time filter dropdowns don't auto-submit, adding unnecessary friction.

**Files**: `app/search/page.tsx`
**Fix**: Add `onChange` handlers that auto-submit the form, or use client-side filtering.

---

## G. Local Page

### G-01 (P2) Weather forecast 7-column grid is too narrow in sidebar

The `.weather-forecast` grid forces 7 columns. In the sidebar context, this creates very narrow columns that are hard to read.

**Files**: `app/globals.css` (`.weather-forecast`)
**Fix**: Add a sidebar-context override: `.feed-rail .weather-forecast { grid-template-columns: repeat(4, 1fr); }` and wrap remaining days.

---

### G-02 (P2) LocalFeedControls creates nested panels

A `.panel` inside the sidebar `.panel` causes visual double-boxing.

**Files**: `components/LocalFeedControls.tsx`
**Fix**: Remove the inner panel wrapper or use a different container class without borders.

---

### G-03 (P3) Default location "United States" is too generic

The header reads "Top United States News" which doesn't feel like a "local" experience.

**Files**: `app/local/page.tsx`
**Fix**: Prompt users to set their city before showing local content. Show a setup CTA instead of generic national news.

---

## H. My Feed / For You Page

### H-01 (P1) GuestReadingHistory makes N+1 API calls

For each unique story slug in reading history, a separate fetch to `/api/stories/{slug}` is made. 12 recent reads = 12 sequential API calls.

**Files**: `components/GuestReadingHistory.tsx` (or equivalent)
**Fix**: Create a batch endpoint `/api/stories/batch` that accepts an array of slugs and returns all stories in one response.

---

### H-02 (P1) Feed loads 240 stories as initialStories prop

The server passes 240 stories as serialized JSON in the HTML response, even though the page only displays ~80. This bloats the initial page payload.

**Files**: `app/my/page.tsx`
**Fix**: Reduce to the displayed count (80) or implement server-side pagination.

---

### H-03 (P2) Favorites sidebar uses inconsistent prefixes

Followed topics show with a `#` prefix, outlets without one. This is inconsistent.

**Files**: `components/MyFeedClient.tsx` sidebar section
**Fix**: Use a consistent format: either all with prefix icons/symbols or none.

---

### H-04 (P3) Dashboard shows empty panels for new users

If the user has no follows and no reading history, the dashboard shows two mostly-empty panels side by side.

**Files**: `app/my/page.tsx`
**Fix**: Show onboarding prompts ("Follow some topics to get started") instead of empty panels.

---

## I. Source Pages

### I-01 (P0) Outlet enrichment is incomplete for all sources

Reuters, CNN, Fox News, and others are missing:
- Outlet-level bias rating (shows "unknown" despite source-card-level bias being correct)
- Website URL (shows "Unknown")
- Country (shows "Unknown")
- Founded year (shows "Unknown")
- Description (shows "Description unavailable")
- Logo (Reuters has no logo, shows "RE" initials only)

**Files**: Ingestion pipeline, `prisma/schema.prisma` (Outlet model)
**Fix**: Run outlet enrichment against a reference dataset (e.g. AllSides, MBFC, or Ground News's own data). Populate bias, website, country, founded, and description fields.

---

### I-02 (P2) Outlet bias inconsistency between card and profile level

CNN's source cards all show `bias="left"` but the outlet-level bias shows "unknown". Fox News source cards show "right" but outlet profile shows "unknown".

**Files**: Source page rendering, outlet data model
**Fix**: Aggregate source-card bias tags to infer outlet-level bias when enrichment data is unavailable.

---

### I-03 (P2) Factuality label transforms "unknown" to "not-rated"

The display code converts `factualityLabel === "unknown"` to "not-rated" which is more user-friendly but doesn't match Ground News terminology.

**Files**: `app/source/[slug]/page.tsx`
**Fix**: Keep "not-rated" but consider adding a tooltip explaining that the outlet has not been assessed.

---

## J. Auth Pages (Login / Signup)

### J-01 (P1) Auth forms lack semantic `<form>` element

Both login and signup use `button type="button"` with `onClick` handlers instead of wrapping inputs in a `<form>`. This means:
- No keyboard Enter-to-submit
- No browser autofill form association
- Reduced accessibility for screen readers

**Files**: `app/login/page.tsx`, `app/signup/page.tsx`
**Fix**: Wrap inputs in a `<form>` element with `onSubmit` handler. Use `type="submit"` for the primary button.

---

### J-02 (P1) OAuth/social login is planned but not implemented

CSS classes exist for `.auth-oauth-row` and `.auth-divider` (Google/GitHub login row with "or" divider) but the rendered pages don't include these elements.

**Files**: `app/login/page.tsx`, `app/signup/page.tsx`, `app/globals.css`
**Fix**: Either implement OAuth login (Google, GitHub) or remove the CSS classes to avoid confusion.

---

### J-03 (P3) Signup has no password confirmation field

Only email + password fields. No password confirmation or strength indicator.

**Files**: `app/signup/page.tsx`
**Fix**: Add a confirm-password field or a password strength meter. The placeholder says "At least 10 characters" which communicates the minimum.

---

## K. Onboarding Wizard (Get Started)

### K-01 (P1) Sequential follow API calls during setup

`persistPrefs()` sends follow toggles one-by-one in a loop. Selecting 10 topics + 10 outlets = 20 sequential API calls.

**Files**: `app/get-started/page.tsx` (GetStartedWizard component)
**Fix**: Create a batch follow endpoint `/api/follows/batch` that accepts an array of `{kind, slug}` pairs.

---

### K-02 (P2) "Preview Local" link navigates away from wizard

Clicking "Preview Local" on step 2 takes the user to `/local`, losing all in-progress wizard state.

**Files**: `app/get-started/page.tsx`
**Fix**: Open the preview in a new tab (`target="_blank"`) or use a modal preview.

---

### K-03 (P2) Finish button uses full page reload

`window.location.href = "/my"` causes a full page reload instead of client-side navigation.

**Files**: `app/get-started/page.tsx`
**Fix**: Use Next.js `router.push("/my")` for client-side navigation.

---

### K-04 (P3) Edition options are hardcoded

The 5 editions (International, United States, Canada, United Kingdom, Europe) are hardcoded in the component.

**Files**: `app/get-started/page.tsx`, `components/TopNavClient.tsx`
**Fix**: Extract to a shared constant or derive from the data store's available locations.

---

### K-05 (P3) No minimum selection guidance on topic/source steps

Users can proceed from Topics and Sources steps without selecting anything, reducing the value of onboarding.

**Files**: `app/get-started/page.tsx`
**Fix**: Show a soft prompt ("Select at least 3 topics for a better experience") without blocking progression.

---

## L. Subscribe / Commercial Features

Commercial pricing/upsell parity with Ground News is now intentionally **out of scope** for OpenGroundNews.

The `/subscribe` route should remain non-commercial and focused on open-project contribution guidance. Any roadmap items about pricing tiers, testimonials, promotional strips, checkout funnels, or annual discount merchandising should be removed from implementation priorities.

---

## M. Extension Page

### M-01 (P2) Extension page is a developer-only stub

Only 3 paragraphs with developer-oriented installation instructions ("open chrome://extensions -> enable Developer mode -> Load unpacked"). No screenshots, no download button, no feature list, no browser compatibility info.

**Files**: `app/extension/page.tsx`
**Fix**: Add extension screenshots/preview images, feature list, supported browsers, and a proper download/install CTA. Keep developer instructions in a collapsible section.

---

## N. Performance / Architecture

### N-01 (P1) All pages use `force-dynamic` with full data store reads

Every page sets `export const dynamic = "force-dynamic"` and calls `readStore()` which loads the entire JSON data store into memory on every request. No caching layer exists.

**Files**: All page components, `lib/store.ts`
**Fix**: Add in-memory caching with TTL to `readStore()`. Consider using Next.js ISR (Incremental Static Regeneration) for pages that don't need real-time data.

---

### N-02 (P2) No font-display strategy or preloading

Two variable fonts (Bricolage Grotesque and Newsreader) are loaded from `@fontsource-variable`. These are substantial payloads with no visible `font-display` or `<link rel="preload">` optimization.

**Files**: `app/layout.tsx`, font imports
**Fix**: Add `font-display: swap` to font-face declarations. Add `<link rel="preload">` for the primary font files.

---

### N-03 (P2) Missing notification delivery system

The onboarding wizard has alert toggles (Daily Briefing, Blindspot Report, spike notifications) and a Notifications page exists, but no actual notification delivery system is implemented.

**Files**: `app/notifications/page.tsx`, `app/get-started/page.tsx`
**Fix**: Implement web push notifications or email-based notification delivery, or disable the alert toggles with a "Coming soon" label.

---

## O. Data Quality / Ingestion

### O-01 (P0) Outlet enrichment pipeline is non-functional or incomplete

The enrichment system exists (`enriched Feb 11, 2026, 4:52 PM` timestamp on source pages) but produces mostly empty results. Bias ratings, website URLs, country, founded year, and descriptions are all missing for major outlets.

**Files**: Ingestion/enrichment pipeline
**Fix**: Use a reference dataset (AllSides Media Bias Ratings, Media Bias/Fact Check) to enrich outlet profiles. At minimum, populate the top 100 outlets by story count.

---

### O-02 (P1) Source excerpts frequently unavailable

Multiple Reuters source cards show "Excerpt unavailable from publisher metadata". The ingestion pipeline doesn't consistently extract article excerpts.

**Files**: Ingestion pipeline, article scraping logic
**Fix**: Extract `og:description`, `meta[name=description]`, or first paragraph of article body as fallback excerpt sources.

---

---

## Checklist for Prioritized Implementation

### Phase 1: Critical Data Quality (P0)
- [x] A-01: Fix broken ground.news image URLs in data store
- [x] A-02: Implement og:image extraction and caching in ingestion
- [x] A-03: Fix topic mapping so us-news/world/science have stories
- [x] B-01: Deduplicate stories between hero and feed sections
- [x] E-01: Implement story deduplication in ingestion pipeline
- [x] E-02: Fix topic misclassification in ingestion
- [x] I-01: Run outlet enrichment for top 100 outlets
- [x] O-01: Fix enrichment pipeline to populate outlet metadata

### Phase 2: High Priority UX (P1)
- [x] A-04: Add topic display name lookup for interest pages
- [x] A-05: Add active state to desktop nav links
- [x] A-06: Fix footer social links
- [x] B-02: Fix empty Daily Local News widget for guests
- [x] B-03: Fix empty My News Bias widget for guests
- [x] C-01: Remove duplicate BiasBar
- [x] C-02: Validate summary quality in ingestion
- [x] C-03: Reduce BiasDistributionPanel min-height
- [x] E-03: Hide empty "Latest" section when no extra stories
- [x] E-04: Fix malformed CDN URLs
- [x] E-05: Aggregate source bias to outlet level
- [x] F-01: Plan for scalable search (document for future)
- [x] H-01: Create batch story lookup endpoint
- [x] H-02: Reduce initialStories payload size
- [x] J-01: Add semantic form elements to auth pages
- [x] J-02: Implement or remove OAuth login
- [x] K-01: Create batch follow endpoint
- [x] N-01: Add caching to readStore()
- [x] O-02: Improve excerpt extraction

### Phase 3: Medium Priority Polish (P2)
- [x] A-07, A-08, A-09, A-10, A-11
- [x] B-04, B-05
- [x] C-04 through C-08
- [x] D-01, D-02
- [x] F-02, F-03
- [x] G-01, G-02
- [x] H-03
- [x] I-02, I-03
- [x] K-02, K-03
- [x] M-01
- [x] N-02, N-03

### Phase 4: Low Priority (P3)
- [x] A-13
- [x] A-12, A-14
- [x] B-06
- [x] C-09, C-10
- [x] D-03
- [x] F-04
- [x] G-03
- [x] H-04
- [x] J-03
- [x] K-04, K-05
