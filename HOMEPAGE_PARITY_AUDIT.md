# OpenGroundNews Homepage vs Ground News -- Complete Parity Audit

**Audit Date:** February 13, 2026
**OGN URL:** http://localhost:3000/
**GN URL:** https://ground.news/
**Viewport tested:** 2304x1150 (desktop)

---

## EXECUTIVE SUMMARY

OpenGroundNews has achieved a working 3-column homepage with Daily Briefing, Hero card, feed stories, Blindspot sidebar, My News Bias widget, topic pills, dark mode, and a footer. However, there are **significant visual and feature gaps** when compared to Ground News. The most critical issues are:

1. **All story images are fallback SVG placeholders** -- no real images load anywhere on the homepage
2. **Wrong font family** -- OGN uses Bricolage Grotesque instead of GN's universalSans
3. **Wrong color palette** -- the subscribe button is green (#2d6a4f) instead of dark (#262626); bias bar colors differ
4. **Bias bar shape is pill-rounded** instead of GN's flat rectangular bars
5. **Missing promotional banner** -- GN has a gold/tan banner; OGN has a dark utility bar instead
6. **Missing several sidebar features**: Similar News Topics, Blindspot email signup, per-topic section blocks
7. **Feed items have "See the Story" buttons** that GN doesn't use (GN makes the entire row clickable)
8. **Hero card has rounded corners** (18px) instead of GN's sharp corners (0px)

---

## 1. MISSING FEATURES (GN has, OGN does not)

### 1.1 Gold/Tan Promotional Banner
- **GN:** Full-width bar at the very top with background `#D1BD91` (warm gold/tan), text "See every side of every news story", and a "Get Started" button with dark background and cream text.
- **OGN:** Instead of a gold promotional banner, OGN has a dark (#262626) utility bar that combines the promo text and date with utility links. There is no separate gold banner with a CTA button.
- **Impact:** The gold banner is one of GN's most distinctive visual elements. Its absence changes the entire top-of-page identity.

### 1.2 Separate Utility Bar
- **GN:** A thin dark bar below the gold banner with: Enable Notifications, Browser Extension, Theme toggle (Light/Dark/Auto), Date, Location, International Edition selector, User avatar.
- **OGN:** The utility bar is combined into a single dark row with the promo text. It shows links to Methodology, Get started, Extension, Notifications on the right side. Theme toggle is in the nav bar instead. Location display is only shown if configured.
- **Missing elements:** Enable Notifications bell icon, Browser Extension as separate link in utility bar, Location button (e.g., "Shanghai, China"), User avatar circle in utility bar.

### 1.3 Topic Section Blocks (Israel-Gaza News, Politics News)
- **GN:** Below the main 3-column area, GN shows horizontal carousel sections for each followed topic (e.g., "Israel-Gaza News", "Politics News") with a feature card on the left and topic-specific blindspot cards on the right, plus Unfollow/Read More buttons.
- **OGN:** These per-topic section blocks are completely absent. The page goes straight from the hero grid to the "Latest Stories" feed.

### 1.4 Blindspot Email Signup Box
- **GN:** A dark (#262626) box with an eye icon, "Blindspot" heading, description text about the weekly report, email input field, and Subscribe button.
- **OGN:** No email signup section exists anywhere on the homepage.

### 1.5 Similar News Topics Sidebar
- **GN:** A sidebar section with the heading "Similar News Topics" showing a list of topic items, each with a circular avatar icon, topic name, and follow/unfollow button.
- **OGN:** No similar topics sidebar exists. The closest equivalent is the "Explore" sidebar in the lower section, which shows topic links as pills/chips rather than the circular-icon list format.

### 1.6 Hamburger Menu
- **GN:** A hamburger menu button is present on the left side of the navigation bar, before the logo.
- **OGN:** The hamburger menu button exists (ref_22 in the accessibility tree) but it is not visible on desktop. Its placement in the nav row is correct.

### 1.7 Image Attribution Button
- **GN:** Hero card has a small (i) info icon in the top-right corner for image attribution.
- **OGN:** No image attribution mechanism on the hero card.

### 1.8 "For You" Accent Mark
- **GN:** The "For You" nav link has a small superscript accent mark.
- **OGN:** No accent mark on "For You".

### 1.9 "More Stories" Button at End of Feed
- **GN:** A "More stories" button with specific styling (transparent bg, dark border, 4px radius, 16px font, weight 680).
- **OGN:** Has a "Load more stories" link instead, styled as a button but with different wording and linking to `/?page=2` (pagination vs infinite load).

### 1.10 Original Reporting Badge in Daily Briefing
- **GN:** Daily Briefing card shows "78% of sources are Original Reporting" with a shield/medal icon.
- **OGN:** No original reporting badge or metric in the Daily Briefing section.

### 1.11 Bullet Items in Daily Briefing
- **GN:** Additional bullet items prefixed with "+" showing summarized content (e.g., "Iran purchases X premium features; Ring drops Flock Safety integration; and more.") with underlined links.
- **OGN:** Daily Briefing only shows story cards with thumbnails and bias data; no "+"-prefixed bullet summary items.

### 1.12 App Store Badges in Footer
- **GN:** Footer includes Apple App Store and Google Play Store download buttons.
- **OGN:** Footer has placeholders for iOS/Android links (via environment variables) but they are text links, not badge images, and are not configured.

### 1.13 Social Media Icons in Footer
- **GN:** Footer bottom bar has icons for Facebook, X (Twitter), Instagram, LinkedIn, Reddit.
- **OGN:** Footer shows text links for GitHub, X, Email only if configured via environment variables. Currently shows "Community links will appear here once they are configured."

### 1.14 Footer Link Columns Parity
- **GN:** Five columns: News, International, Trending Internationally, Trending in U.S., Trending in U.K. (upper footer). Four columns in lower footer: Logo, Company, Help, Tools.
- **OGN:** Four columns: About, Features, Support, Legal. Completely different link structure. No trending topics by region. No company/history/mission/blog links.

### 1.15 Footer Bottom Bar
- **GN:** Links to Gift, Privacy Policy, Manage Cookies, Privacy Preferences, Terms and Conditions. Edition selector. Copyright "(c) 2026 Snapwise Inc".
- **OGN:** Shows "OpenGroundNews - Open-source Ground News parity build - Remote-browser ingestion via Browser Use CDP". No cookie management or privacy preferences links.

### 1.16 "My Account" Button in Nav
- **GN:** An outlined "My Account" button next to Subscribe in the nav bar.
- **OGN:** Has a "Sign in" text link instead, which links to `/login`.

### 1.17 Expanded Search Box
- **GN:** Search expands to show a longer placeholder "Enter an article's Web Address, URL, or type to search..."
- **OGN:** Search box is always visible as a full-width input field below the nav links, not in the collapsed pill-shape format GN uses.

---

## 2. VISUAL BUGS AND QUALITY GAPS

### 2.1 ALL IMAGES ARE FALLBACK PLACEHOLDERS (CRITICAL)
- **Every single image** on the homepage (hero card, Daily Briefing thumbnails, feed story thumbnails, Blindspot cards, Latest Stories cards) renders the same SVG fallback (`/images/story-fallback-thumb.svg`) instead of real news images.
- The fallback is a gray skeleton-loader graphic (dark rounded rectangles and circles on a muted background).
- Root cause: `StoryImage.tsx` filters out Ground News-hosted URLs (`ground.news/images/`, `webMetaImg`), and the image proxy may be failing for external URLs.
- **This is the single biggest quality gap.** The site looks like a wireframe/prototype rather than a production news aggregator.

### 2.2 Wrong Font Family
- **GN:** Uses `universalSans` ("universalSans Fallback") throughout.
- **OGN:** Uses `Bricolage Grotesque` (Google Font). This is a completely different typeface with different character widths, x-height, and personality. Bricolage Grotesque is more quirky/decorative; universalSans is more neutral/editorial.
- **Impact:** Affects the entire feel of the site. Headlines, body text, nav links, buttons all look different.

### 2.3 Wrong Background Color / Body Treatment
- **GN:** Flat cream background `#EEEFE9` (rgb(238, 239, 233)).
- **OGN:** Uses a complex gradient background: `radial-gradient(circle at 80% 0%, #dce8d8 ...)` + `radial-gradient(circle at 10% 0%, #f8ead7 ...)` + `linear-gradient(180deg, #ecefe8 ...)`. The base color `#ecefe8` is close but the gradient treatment adds green and warm tints that GN doesn't have.
- **Impact:** Subtle but noticeable difference, especially in areas where the gradient shows through.

### 2.4 Wrong Subscribe Button Color
- **GN:** Subscribe button has dark background `#262626` with cream text `#eeefe9`.
- **OGN:** Subscribe button has green background `#2d6a4f` (teal/forest green) with light text. Border-radius is `999px` (fully round pill) instead of GN's `4px`.
- **Impact:** A major brand-color deviation. The green subscribe button doesn't exist in GN's design system.

### 2.5 Bias Bar Shape: Rounded vs Flat
- **GN:** Bias bars are flat rectangles with `border-radius: 0px` and no border. Height ~24px for full-size, ~8px for mini bars. No border/outline.
- **OGN:** Bias bars have `border-radius: 999px` (fully rounded pill shape), `height: 10px`, and a `border: 1px solid #bcc6bc` outline. Background fill `#e6ebe1`.
- **Impact:** This is GN's signature UI element. The rounded pill shape with a border looks completely different from GN's flat, borderless segments.

### 2.6 Bias Bar Colors
- **GN:** Left = `#802727` (maroon), Center = `#FFFFFF` (white), Right = `#204986` (dark blue). Solid colors, no gradients.
- **OGN:** Left = `linear-gradient(90deg, #802727, #a04040)`, Right = `linear-gradient(90deg, #204986, #2f6aa9)`. The base colors match but OGN applies gradients within each segment.
- CSS custom properties: `--bias-left: #994040` (lighter), `--bias-far-left: #802727` (matches GN). The `--left` alias points to `--bias-far-left` which is correct, but the CSS gradient adds the lighter tones.

### 2.7 Bias Bar Label Format
- **GN:** Labels inside the bar segments: "Left 29%", "Center 49%", "R 22%" (text is INSIDE the colored segments).
- **OGN:** Labels are BELOW the bar: "46% left", "37% center", "17% right" (lowercase, percentage first, separated by the bar). The percentage-first format ("46% left") differs from GN's label-first format ("Left 46%").

### 2.8 Bias Bar Label Colors
- **GN:** Left label text is cream `#eeefe9` (on maroon background), Center label is dark `#262626` (on white), Right label is cream `#eeefe9` (on blue).
- **OGN:** Left label color `#8f3a33`, Center `#5d6a74`, Right `#2d5a83`. These are muted/desaturated tones shown below the bar, not inside it.

### 2.9 Hero Card Border Radius
- **GN:** `border-radius: 0px` (sharp corners).
- **OGN:** `border-radius: 18px` (rounded). Also has `border: 1px solid var(--line)` and `box-shadow`.

### 2.10 Hero Card Gradient Overlay
- **GN:** `linear-gradient(to top in oklab, rgb(38, 38, 38) 0%, rgba(0, 0, 0, 0) 100%)` -- a single gradient from dark at bottom to transparent at top using oklab color space.
- **OGN:** A two-layer gradient: `linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.62) 78%)` + `radial-gradient(circle at 50% 20%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.52) 70%)`. This creates a different visual effect (vignette-like).

### 2.11 Hero Card Headline Size/Weight
- **GN:** 32px, weight 800, line-height 35px.
- **OGN:** `clamp(1.35rem, 2.5vw, 2.1rem)` (~33.6px at large viewport), weight 700, `line-height: 1.05`. Close but the weight is 700 instead of 800.

### 2.12 Hero Card Meta Line
- **GN:** No meta line above the headline on the hero card. The hero card only has the image, headline, and bias bar.
- **OGN:** Shows a full meta line above the headline: "Instagram - International - Updated Feb 12, 2026, 6:25 PM - 29 sources". This is extra information that GN does not show on the hero card.

### 2.13 "See the Story" Buttons on Feed Items
- **GN:** Feed story rows are entirely clickable links (the entire flex container is wrapped in `<a>`). There is no explicit "See the Story" button.
- **OGN:** Each feed story item has a separate "See the Story" button at the bottom. This adds visual clutter and breaks the clean, scannable feed layout.

### 2.14 Feed Story Coverage Text Format
- **GN:** Below the mini bias bar, text reads "77% Center coverage: 13 sources" (coverage percentage, colon, source count).
- **OGN:** Shows percentage labels below the bias bar as "31% ... 37% ... 32%" (just percentages). The coverage text format is different. In the Latest Stories card format, it shows "80% Center coverage - 13 sources - ~5 min read" which is closer but uses dashes instead of colons.

### 2.15 Feed Story Thumbnail Size
- **GN:** Thumbnails are approximately 105x80px, no border radius.
- **OGN:** Thumbnails rendered at 160x100px in the list items, but the actual fallback SVG is smaller. In the hero grid section, thumbnails appear correctly sized.

### 2.16 Topic Pills Bar Styling
- **GN:** Pills have `background: rgb(218, 219, 214)` (light gray), `border-radius: 9999px`, `font-size: 12px`, `weight: 600`. Sits on the cream page background.
- **OGN:** The trending strip has a dark background `#262626`, and pills have `background: #393938` (dark), `color: #eeefe9` (cream), `border-radius: 999px`. The entire strip is dark-themed even in light mode, matching GN's utility bar style rather than GN's topic pills.
- **Impact:** In GN, the topic pills are light-colored chips on a cream background. In OGN, they are light-colored text on a dark strip. This is a significant visual departure.

### 2.17 Topic Pills Font
- **GN:** 12px, weight 600.
- **OGN:** 0.82rem (~13px), weight 400 (normal). The weight difference makes OGN pills look thinner/lighter.

### 2.18 Navigation Links Style
- **GN:** `font-size: 15px`, `weight: 680`, `color: #262626`, no text decoration.
- **OGN:** Navigation links appear to use default font sizing. The weight 680 is not available in Bricolage Grotesque (GN's universalSans supports fractional weights like 480, 680).

### 2.19 Logo Design
- **GN:** Block letters "GROUND" with "News" below. Rendered as an image/SVG.
- **OGN:** Text-based "OPENGROUNDNEWS" with "OPEN INFRASTRUCTURE, PERSPECTIVE-FIRST" tagline below. This is CSS text, not an image logo. Different brand identity.

### 2.20 Column Borders/Separators
- **GN:** Left column has `border-right` separator. Right column has `border-left` separator. These create visual column dividers.
- **OGN:** No visible column separators/borders between the three columns. The columns are separated only by the 2rem gap.

### 2.21 Section Heading Sizes
- **GN:** Section headings like "Daily Briefing" and "Top News Stories" are 32px, weight 800.
- **OGN:** Section headings are 24px, weight 800. Noticeably smaller than GN's.

### 2.22 Daily Briefing Link
- **GN:** "Daily Briefing" heading links to `/daily-briefing`.
- **OGN:** "Daily Briefing" heading is plain text (not linked). There is no `/daily-briefing` route.

### 2.23 Top News Stories Mini Bias Bars
- **GN:** In the Top News Stories section, mini bias bars are 8px height, horizontal segments side by side, with center shown as a small gold/tan dot ~6px.
- **OGN:** The Top News Stories section shows text-only bias data: "43 sources - ~7 min - 63% L - 29% C - 8% R" rather than visual mini bars.

### 2.24 Three-Column Grid Proportions
- **GN:** Uses a 12-column CSS grid: `col-span-3 | col-span-6 | col-span-3` (25% | 50% | 25%).
- **OGN:** Uses `grid-template-columns: 1fr 2fr 1fr` which produces `344px | 688px | 344px` at the measured viewport. This is roughly `25% | 50% | 25%` so the proportions are correct, but using `1fr` instead of the 12-column grid system.

### 2.25 Dark Mode -- Body Background
- **GN:** Dark mode uses `dark:bg-ground-black` which is `#262626`. Single flat color.
- **OGN:** Dark mode sets `--bg: #262626` and `body { background: var(--bg) }`. This correctly removes the light-mode gradient. The dark mode behavior appears correct.

### 2.26 Dark Mode -- Default Theme
- **GN:** Defaults to Light theme. Users can switch to Dark or Auto.
- **OGN:** Defaults to Dark theme (line 54 of `layout.tsx`: `initialTheme` defaults to `"dark"`). First-time visitors see dark mode, which is the opposite of GN.

### 2.27 Daily Local News Widget
- **GN:** Not explicitly called out in the audit as a sidebar widget, but GN has local content accessible through the nav.
- **OGN:** Has a "Daily Local News" widget in the right sidebar showing "No city selected" with a "Set up Local" link. This is an OGN-specific addition.

### 2.28 Feed Filters Sidebar
- **GN:** No explicit filter sidebar on the homepage. Filtering is done through navigation (Home, For You, Blindspot, Local).
- **OGN:** Has a "Feed Filters" sidebar in the "Latest Stories" section with View (All/Trending/Blindspot/Local), Bias (All/Left/Center/Right), and Topic dropdowns with an Apply button. This is an OGN-specific addition that adds utility but doesn't exist in GN.

### 2.29 "Explore" Sidebar
- **GN:** No "Explore" sidebar on the homepage.
- **OGN:** Has an "Explore" section as the left sidebar in the feed section with quick links (Local, For You, Blindspot, Rating system), Popular topics, and Most covered outlets. This is an OGN addition.

### 2.30 Blindspot Widget Design
- **GN:** Blindspot sidebar cards are branded with maroon/blue colored borders (8px padding of the bias color), inner white card with image, "Blindspot" badge, source count badge, headline, and bias bar. Uses the BLINDSPOT TM logo with eye icon as SVG.
- **OGN:** Blindspot widget shows story cards with the skeleton fallback images, a "BLINDSPOT TM" wordmark, severity labels (Severe/High/Moderate/Low), percentage breakdown rows (Left/Center/Right with horizontal bars), and text summaries. The design is more data-rich but visually different from GN's cleaner card format.

### 2.31 "View Blindspot Feed" Button
- **GN:** Full-width bordered button reading "View Blindspot Feed" below the Blindspot cards.
- **OGN:** Has a small "open" text link next to the "Blindspot" heading. No full-width button.

### 2.32 My News Bias Widget
- **GN:** Shows user avatar, username ("CMLKevin"), stats "17 Stories - 0 Articles", bias bar, and "See what you're reading" bordered button linking to `/my-news-bias?timeRange=days7`.
- **OGN:** Shows "G" avatar with "Guest", "34 read", bias bar with percentages, "Based on reading on this device." note, and "Open full dashboard" button. The guest/anonymous reading tracker is an OGN-specific feature. No user avatar or article count breakdown.

### 2.33 Container Max Width
- **GN:** Content area constrained to approximately 1344px.
- **OGN:** Container set to `min(1440px, calc(100% - 2rem))` which is 96px wider at maximum. At the tested viewport (2304px), the content area is slightly wider.

### 2.34 Card Shadows
- **GN:** Cards do not appear to have box shadows; they use flat design with borders.
- **OGN:** Hero card has `box-shadow: 0 6px 20px rgba(24, 32, 38, 0.06)`. Other panels also have shadows. This gives a more material/elevated feel vs GN's flat design.

### 2.35 Latest Stories Card Layout
- **GN:** The "Latest News Stories" section uses the same horizontal row format as the main feed (headline + mini bias bar + thumbnail).
- **OGN:** The "Latest Stories" section uses a 2-column card grid for the first 4 stories (full image cards with summaries) and then switches to list items. This is a different layout pattern. The card format includes article summary excerpts which GN doesn't show in the feed.

### 2.36 "Load more stories" vs "More stories"
- **GN:** "More stories" button.
- **OGN:** "Load more stories" link that navigates to `/?page=2`. GN's button likely loads more stories inline (infinite scroll or append), while OGN does full page navigation.

### 2.37 Footer Structure
- **GN:** Two-section footer: upper (cream background, 5 link columns) and lower (dark #262626 background, 4 columns + social icons + app badges + copyright).
- **OGN:** Single-section footer with a brand column on the left and a 4-column grid on the right, plus a thin bottom bar. No dark/light dual-section split.

### 2.38 Footer Background Color
- **GN:** Upper footer on cream `#EEEFE9`, lower footer on dark `#262626`.
- **OGN:** Footer uses the page background color (the gradient), not the distinct cream/dark split.

### 2.39 Mobile Bottom Navigation
- Both GN and OGN have a bottom nav with 5 items (News, For You, Search, Blindspot, Local). This is correctly implemented in OGN.

### 2.40 Sticky Header Behavior
- **GN:** Header sticks to top on scroll with total height ~146px (utility + nav + topic pills).
- **OGN:** Header appears sticky (`.topbar` class), total height ~167px. The utility bar, nav, and trending strip all stick together. Correct behavior.

---

## 3. SUMMARY OF DIFFERENCES BY PRIORITY

### P0 -- CRITICAL (Breaks core experience)
1. **All images are fallback placeholders** -- no real news images render
2. **Bias bar shape is completely wrong** -- rounded pill vs flat rectangle
3. **Subscribe button is green instead of dark** -- wrong brand color

### P1 -- HIGH (Major visual/feature gaps)
4. Missing gold/tan promotional banner
5. Wrong font family (Bricolage Grotesque vs universalSans)
6. Hero card has rounded corners (18px) vs sharp (0px)
7. Topic pills bar is dark-themed instead of light pills on cream
8. Section headings are 24px instead of 32px
9. "See the Story" buttons on every feed item (should be clickable rows)
10. Default theme is Dark instead of Light
11. Missing Topic Section Blocks (Israel-Gaza News, Politics News)
12. Missing Blindspot email signup
13. Bias bar labels are below the bar instead of inside it

### P2 -- MEDIUM (Noticeable gaps)
14. Missing column separators/borders
15. Feed story coverage text format differs
16. Logo is text-based instead of image-based
17. Missing "Similar News Topics" sidebar
18. Body background uses gradient instead of flat cream
19. Footer structure completely different
20. "My Account" button replaced with "Sign in" link
21. Container max width 1440px vs 1344px
22. Missing original reporting badge in Daily Briefing
23. Missing bullet items in Daily Briefing
24. Cards have box shadows (GN uses flat design)
25. Nav link font weight differs (680 in GN)

### P3 -- LOW (Minor polish)
26. "For You" accent mark missing
27. Hero card meta line showing extra info
28. Search box layout differs (always visible vs collapsible pill)
29. Pagination vs infinite scroll for more stories
30. "Load more stories" vs "More stories" wording
31. Image attribution button missing on hero card
32. Daily Briefing heading not linked to `/daily-briefing`
33. App store badges and social media icons missing from footer
34. "Blindspot Watch" text list in right rail (OGN addition, not in GN)
35. "Feed Filters" sidebar (OGN addition, not in GN)

---

## 4. TECHNICAL DETAILS

### Framework Comparison
| Aspect | Ground News | OpenGroundNews |
|--------|-------------|----------------|
| CSS Framework | Tailwind CSS | Custom CSS (utility classes) |
| Grid System | 12-column CSS grid (`col-span-3`, `col-span-6`) | `1fr 2fr 1fr` shorthand |
| Font | universalSans (custom) | Bricolage Grotesque (Google Font) |
| Primary Color | `#262626` (near black) | `#182026` (slightly different dark) |
| Background | `#EEEFE9` (flat cream) | `#ecefe8` + gradient overlays |
| Bias Left | `#802727` (flat) | `#802727` to `#a04040` (gradient) |
| Bias Right | `#204986` (flat) | `#204986` to `#2f6aa9` (gradient) |
| Subscribe Btn | `#262626` bg, 4px radius | `#2d6a4f` bg, 999px radius |
| Dark Mode | opt-in (Light default) | opt-out (Dark default) |
| Images | Real news images | Fallback SVG placeholders |

### CSS Custom Properties (OGN)
```
--bg: #ecefe8           (GN: #EEEFE9 -- close but different)
--ink: #182026          (GN: #262626 -- different shade)
--bias-far-left: #802727 (matches GN)
--bias-far-right: #204986 (matches GN)
--bias-left: #994040    (lighter than GN)
--bias-right: #406699   (lighter than GN)
--subscribe-accent: #2d6a4f (GN: #262626 -- completely different)
```

### Image Pipeline Issue
The `StoryImage.tsx` component:
1. Filters out `ground.news/images/` URLs (treats as unusable)
2. Filters out `webMetaImg` URLs (to avoid baked-in bias bars)
3. Attempts to proxy external URLs via `buildImageProxyUrl()`
4. Falls back to `/images/story-fallback-thumb.svg` on any failure

Since ALL images are showing fallbacks, either:
- The `imageUrl` fields in the database are all Ground News URLs being filtered
- The image proxy is failing/misconfigured
- The external image URLs are all returning errors

---

## 5. WHAT OGN HAS THAT GN DOES NOT (OGN Additions)

1. **"Explore" sidebar** with popular topics and most covered outlets
2. **"Feed Filters" sidebar** with view/bias/topic dropdowns
3. **"Daily Local News" widget** in the right sidebar
4. **"Blindspot Watch" text list** in the right rail of Latest Stories
5. **Story summary excerpts** on Latest Stories cards
6. **Read time estimates** on story cards and list items
7. **Guest reading tracking** (anonymous bias tracking without login)
8. **Rating system** link in footer and explore section
9. **Compare Sources** feature link
10. **Calendar, Maps, Reader** feature links
11. **Methodology** link in utility bar
