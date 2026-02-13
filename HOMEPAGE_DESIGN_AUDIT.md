# Ground News Homepage - Complete Design & Feature Audit

**Audit Date:** February 13, 2026
**URL:** https://ground.news/
**Edition:** International Edition

---

## TABLE OF CONTENTS

1. [Overall Page Structure & Layout](#1-overall-page-structure--layout)
2. [Color Palette](#2-color-palette)
3. [Typography](#3-typography)
4. [Top Promotional Banner](#4-top-promotional-banner)
5. [Utility Bar](#5-utility-bar)
6. [Main Navigation Bar](#6-main-navigation-bar)
7. [Topic Pills / Tags Bar](#7-topic-pills--tags-bar)
8. [Three-Column Main Layout](#8-three-column-main-layout)
9. [Left Column: Daily Briefing & Top News Stories](#9-left-column-daily-briefing--top-news-stories)
10. [Center Column: Hero Story Card & Feed](#10-center-column-hero-story-card--feed)
11. [Right Column: Blindspot & My News Bias](#11-right-column-blindspot--my-news-bias)
12. [Bias Indicator Bar Design](#12-bias-indicator-bar-design)
13. [Topic Section Blocks (Israel-Gaza, Politics)](#13-topic-section-blocks)
14. [Blindspot Email Signup Box](#14-blindspot-email-signup-box)
15. [Similar News Topics Sidebar](#15-similar-news-topics-sidebar)
16. [Latest News Stories Section](#16-latest-news-stories-section)
17. [Footer](#17-footer)
18. [Interactive Elements & Hover Effects](#18-interactive-elements--hover-effects)
19. [CSS Architecture & Framework](#19-css-architecture--framework)
20. [Mobile Bottom Navigation](#20-mobile-bottom-navigation)

---

## 1. Overall Page Structure & Layout

The homepage uses a **CSS Grid** layout with a **12-column grid** system. The page has a sticky header that remains visible while scrolling.

### Page Container
- **Max width:** Constrained to approximately 1344px content area (at 2560px viewport)
- **Background color:** `rgb(238, 239, 233)` - a warm off-white/cream (#EEEFE9)
- **Font family:** `universalSans, "universalSans Fallback"` (custom font throughout)

### Vertical Structure (top to bottom)
1. Promotional banner (gold/tan)
2. Utility bar (dark)
3. Navigation bar (white) with logo, links, search, buttons
4. Topic pills horizontal scrolling bar
5. Three-column content area (Daily Briefing | Hero + Feed | Blindspot + My Bias)
6. Horizontal carousel sections per followed topic (Israel-Gaza News, Politics News)
7. Latest News Stories (full-width list)
8. "More stories" button
9. Footer (two sections: links on light bg, then dark bg company info)

---

## 2. Color Palette

### Primary Colors
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Near Black** | #262626 | `rgb(38, 38, 38)` | Primary text, dark backgrounds (utility bar, footer, Blindspot email box), button fills |
| **Off-White / Cream** | #EEEFE9 | `rgb(238, 239, 233)` | Page background, light text on dark backgrounds |
| **Gold / Tan** | #D1BD91 | `rgb(209, 189, 145)` | Promotional banner background, center bias mini-bar dot |
| **Tertiary Light** | #DADBDA6 | `rgb(218, 219, 214)` | Topic pill background (bg-tertiary-light) |
| **White** | #FFFFFF | `rgb(255, 255, 255)` | Center bias bar segment, card backgrounds, nav bar background |

### Bias Colors
| Bias | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Left (Red/Maroon)** | #802727 | `rgb(128, 39, 39)` | Left bias bar segment, Blindspot badge, blindspot card bg (left-leaning) |
| **Right (Dark Blue)** | #204986 | `rgb(32, 73, 134)` | Right bias bar segment, blindspot card bg (right-leaning) |
| **Center (White)** | #FFFFFF | `rgb(255, 255, 255)` | Center bias bar segment |

### Badge Colors
| Element | Background | Text Color |
|---------|-----------|------------|
| Blindspot badge | `rgb(128, 39, 39)` (maroon) | `rgb(238, 239, 233)` (cream) |
| Sources badge | `rgb(238, 239, 233)` (cream) | `rgb(38, 38, 38)` (dark) |
| "Only X% Left" badge | `rgb(128, 39, 39)` (maroon) | `rgb(238, 239, 233)` (cream) |
| "Only X% Right" badge | `rgb(32, 73, 134)` (blue) | `rgb(238, 239, 233)` (cream) |
| "0% Right" badge | `rgb(32, 73, 134)` (blue) | `rgb(238, 239, 233)` (cream) |

---

## 3. Typography

### Font Family
- **Primary:** `universalSans, "universalSans Fallback"` -- used everywhere on the page
- The font supports variable weights from 400 to 800+

### Font Weights in Use
- **400:** Body text, H1 (hidden accessibility heading)
- **480:** Coverage/source count text in feed
- **500:** Category tag text
- **600:** Topic pill text, bias bar segment labels, section headings, feed story headlines, blindspot badge
- **680:** Navigation links, Subscribe/Get Started/More Stories buttons, promo banner text
- **800:** Major headings (H2, H3, H4), section titles like "Daily Briefing", "Top News Stories"

### Heading Sizes
| Level | Font Size | Font Weight | Line Height | Usage |
|-------|-----------|-------------|-------------|-------|
| H1 | 16px | 400 | 24px | Hidden accessibility heading |
| H2 | 32px | 800 | 35px | Major section headings ("Daily Briefing", "Top News Stories") |
| H3 | 32px | 800 | 17.5px | Sub-headings |
| H4 | 22px | 800 | 25px | Card headings |

### Text Sizes
| Context | Size | Weight |
|---------|------|--------|
| Promo banner | 18px | 680 |
| Utility bar | 12px | normal |
| Nav links | 15px | 680 |
| Topic pills | 12px | 600 |
| Bias bar labels | 12px | 600 |
| Feed headline | 16px | 600 |
| Category tags in feed | 16px | 500 |
| Source count text | 16px | 480 |
| Hero headline | 32px | 800 |
| Daily Briefing meta | variable | normal |
| Subscribe/button text | 16px | 680 |
| Footer links | 22px | normal |
| Footer section headings | 22px | 600 |

---

## 4. Top Promotional Banner

The topmost bar spanning the full width.

### Visual Description
- **Background:** `rgb(209, 189, 145)` -- warm gold/tan color
- **Height:** ~60px
- **Text:** "See every side of every news story" centered
- **Text color:** `rgb(38, 38, 38)` (near black)
- **Font size:** 18px, weight 680
- **Layout:** `display: flex; align-items: center; justify-content: center`
- **Padding:** 9.6px

### "Get Started" Button
- **Background:** `rgb(38, 38, 38)` (dark)
- **Text color:** `rgb(238, 239, 233)` (cream)
- **Border radius:** 4px
- **Padding:** 9.6px
- **Font size:** 14px, weight 680
- Positioned inline to the right of the text

---

## 5. Utility Bar

A thin dark bar directly below the promotional banner.

### Visual Description
- **Background:** `rgb(38, 38, 38)` (near black)
- **Text color:** `rgb(238, 239, 233)` (cream)
- **Height:** ~39px
- **Font size:** 12px
- **Padding:** 5px 0px
- **Layout:** `display: flex`
- **Border bottom:** `0.555556px solid` subtle separator

### Elements (left to right)
1. **Enable Notifications** - bell icon + text link
2. **Browser Extension** - text link
3. **Theme:** label followed by "Light", "Dark", "Auto" toggle options (text-based, cursor: pointer)
4. **Date:** "Friday, February 13, 2026" (right-aligned area)
5. **Location:** "Shanghai, China" (button, clickable)
6. **International Edition** - globe icon + text + dropdown arrow
7. **User avatar** - small circular avatar image (links to /account)

---

## 6. Main Navigation Bar

Below the utility bar, this contains the logo and primary navigation.

### Visual Description
- **Background:** White / transparent (`rgba(0, 0, 0, 0)` on transparent, but the page background is cream)
- **Position:** `sticky` (sticks to top on scroll)
- **Total header height:** ~146px (includes utility bar + nav + topic pills)
- **Border bottom:** None visible

### Elements (left to right)

#### Hamburger Menu
- Button with "Open menu" aria label, type="button"
- Left-most element

#### Logo
- **Ground News** logo image (block letters "GROUND" with "News" below)
- Links to "/" (homepage)
- Size: approximately 60x40px

#### Navigation Links
- **Home** (href="/")
- **For You** (href="/my") -- has a small superscript accent mark
- **Local** (href="/local")
- **Blindspot** (href="/blindspot")
- **Style:** color `rgb(38, 38, 38)`, font-size 15px, font-weight 680, no text decoration

#### Search Box
- Input with placeholder "Search"
- Magnifying glass icon (left of input)
- **Background:** transparent
- **Border:** 0.555556px solid (subtle)
- **Border radius:** 9999px (fully rounded / pill shape)
- **Height:** ~40px
- **Width:** ~131px (collapsed state)
- Expandable: clicking reveals a larger text input with placeholder "Enter an article's Web Address, URL, or type to search..."

#### Subscribe Button
- **Background:** `rgb(38, 38, 38)` (dark)
- **Text:** "Subscribe" in `rgb(238, 239, 233)` (cream)
- **Border radius:** 4px
- **Padding:** 9.6px
- **Font size:** 16px, weight 680
- Links to /subscribe

#### My Account Button
- **Background:** transparent
- **Text:** "My Account" in `rgb(38, 38, 38)`
- **Border:** 0.555556px solid `rgb(38, 38, 38)`
- **Border radius:** 4px
- **Padding:** 9.6px
- Links to /account

---

## 7. Topic Pills / Tags Bar

A horizontally scrolling row of topic tags below the navigation.

### Container
- **Layout:** `display: flex; flex-wrap: nowrap; gap: 8px`
- **Overflow:** Scrolls horizontally (content wider than container: ~1892px scroll width vs ~1344px visible)
- **Height:** ~26px
- **Background:** transparent (sits on the cream page bg)
- Preceded by a small trending icon (arrow) on the far left

### Individual Topic Pill
- **Layout:** `display: flex; align-items: center; gap: 8px`
- **Background:** `rgb(218, 219, 214)` -- light gray (class `bg-tertiary-light`)
- **Border radius:** 9999px (fully rounded pill)
- **Padding:** 4px 8px
- **Height:** ~26px
- **Font size:** 12px, weight 600
- **Text color:** `rgb(38, 38, 38)`

### Topic Pill Structure
Each pill consists of:
1. **Topic name** as a link (e.g., "Israel-Gaza", "Valentine's Day", "Olympics")
2. **Follow/Unfollow button** -- small icon:
   - If followed: checkmark icon (e.g., Israel-Gaza shows a down-arrow/check)
   - If not followed: "+" (plus) icon

### Topics Visible
Israel-Gaza, Valentine's Day, Olympics, Business & Markets, Trump Administration, Artificial Intelligence, Chinese New Year, Health & Medicine, Epstein Files, Senate, Immigration and Customs Enforcement, Basketball, Donald Trump (scrollable, more off-screen)

---

## 8. Three-Column Main Layout

The primary content area uses a **12-column CSS grid**.

### Grid Configuration
- **Display:** grid
- **Grid template columns:** 12-column system
- **Gap:** 2rem (32px) between major sections

### Column Widths (at ~1344px content area)
| Column | Span | Width | Content |
|--------|------|-------|---------|
| Left | col-span-3 | ~336px | Daily Briefing, Top News Stories |
| Center | col-span-6 | ~672px | Hero card, feed stories |
| Right | col-span-3 | ~336px | Blindspot, My News Bias |

### Column Styling
- **Left column:** `pr-[1rem] border-r border-r-light-heavy` -- has right border separator
- **Center column:** `desktop:px-[1rem]` -- padding on both sides
- **Right column:** `desktop:pl-[1rem] border-l` -- has left border separator, may have light background on tablet

---

## 9. Left Column: Daily Briefing & Top News Stories

### Daily Briefing Card

#### Heading
- **Text:** "Daily Briefing"
- **Font size:** 32px, weight 800
- **Color:** `rgb(38, 38, 38)`
- Links to /daily-briefing

#### Meta Info
- **Text:** "9 stories" (line 1), "596 articles * 9m read" (line 2)
- Smaller text, lighter weight

#### Story Preview Cards
Two preview cards displayed as rows:
- **Layout:** Horizontal row with thumbnail (left) + title text (right)
- **Thumbnail:** Small image ~72x72px
- **Title:** Bold text like "US-China Tensions Rise Over Peruvian Port"

#### Additional Bullet Items
- Prefixed with "+" -- e.g., "Iran purchases X premium features; Ring drops Flock Safety integration; and more."
- These are underlined link texts

#### Original Reporting Badge
- **Text:** "78% of sources are Original Reporting"
- Small icon (shield/medal icon) preceding the text
- Regular weight text

### Top News Stories

#### Section Heading
- **Text:** "Top News Stories"
- **Font size:** 32px, weight 800
- No link

#### Story List Items
Each item is a compact row:
- **Headline:** Bold text, font-size ~16-18px, weight 600-800
  - Examples: "10 Dead in British Columbia School Shooting"
- **Mini bias bar + source text below headline:**
  - Small colored segments (8px tall) showing Left/Center/Right proportions
  - Text like "43% Center coverage: 394 sources"
  - Font-size: 16px, weight 480

#### Mini Bias Bars (in Top News Stories)
- **Height:** 8px
- **Left segment:** `rgb(128, 39, 39)` (maroon), variable width
- **Center segment:** `rgb(209, 189, 145)` (gold/tan), shown as small dot/segment ~6px
- **Right segment:** `rgb(32, 73, 134)` (dark blue), variable width
- Segments are horizontal, side by side, no gap

**Stories listed:** 5-6 items (10 Dead in British Columbia, Venezuela prosecutor, Jimmy Lai, Japan election, Islamabad bombing)

---

## 10. Center Column: Hero Story Card & Feed

### Hero Story Card

The most prominent element on the page -- a large image card with overlaid text.

#### Dimensions
- **Width:** ~640px
- **Height:** ~419px

#### Image
- Full-bleed image covering the entire card
- **Object-fit:** cover
- **Border radius:** 0px (sharp corners)

#### Gradient Overlay
- **CSS:** `linear-gradient(to top in oklab, rgb(38, 38, 38) 0%, rgba(0, 0, 0, 0) 100%)`
- A dark-to-transparent gradient from bottom to top, allowing the headline to be readable

#### Headline Text (overlaid on image)
- **Color:** White/cream (on dark gradient)
- **Font size:** 32px (scaled for the card)
- **Font weight:** 800
- Positioned at the bottom of the card
- Example: "Federal authorities announce an end to the immigration crackdown in Minnesota"

#### Image Attribution Button
- Small (i) info icon in top-right corner
- Clicking reveals attribution text (e.g., "REUTERS / Go Nakamura/Reuters")

#### Bias Bar (at bottom of hero card)
- Full-width bar at the very bottom of the card
- Three colored segments showing Left/Center/Right coverage proportions
- Segments display percentage text inside: "Left 29%", "Center 49%", "R 22%"
- See [Bias Indicator Bar Design](#12-bias-indicator-bar-design) for detailed specs

### Feed Stories (below hero)

Each story in the feed is a horizontal row with:

#### Layout
- **Display:** flex, flex-direction: row
- **Gap:** 16px between text content and thumbnail
- **Width:** ~640px (full center column width)
- **Separator:** Border between items (subtle)

#### Story Card Anatomy (left to right)
1. **Category + Location tag:** e.g., "Business * United Arab Emirates"
   - Font size: 12px, weight 600
   - Color: `rgb(38, 38, 38)`
   - Category name is bolder, location separated by " * " dot
2. **Headline:**
   - Font size: 16px (h4 level), weight 600-800
   - Color: `rgb(38, 38, 38)`
   - Multi-line, wraps naturally
3. **Mini bias bar + coverage text:**
   - Small colored segments (8px tall) + text "77% Center coverage: 13 sources"
   - Coverage text: font-size 12px, weight 480
4. **Thumbnail image** (right side):
   - Size: ~105x80px
   - Object-fit: cover
   - No border radius

#### Feed Stories Listed
- Canadian and UK finance groups pause new ventures with DP World...
- UN approves 40-member scientific panel...
- Sister of North Korea's leader says...
- Bangladesh Nationalist Party...
- Trump administration reaches a trade deal...
- Drone strike kills 2 children...
- And more...

---

## 11. Right Column: Blindspot & My News Bias

### Blindspot Section

#### Heading Area
- **Logo:** "BLINDSPOT" in large, bold condensed black text with an eye icon and "TM" superscript
- Rendered as an SVG/image logo

#### Description Text
- "Stories disproportionately covered by one side of the political spectrum."
- **"Learn more about political bias in news coverage."** -- underlined link

#### Blindspot Story Cards
Two cards stacked vertically, each is a complete interactive card:

##### Card Design
- **Width:** ~303px
- **Height:** ~339px
- **Background:** The bias direction color fills the card border:
  - Left-leaning blindspot: maroon `rgb(128, 39, 39)` border/bg padding
  - Right-leaning blindspot: blue `rgb(32, 73, 134)` border/bg padding
- **Border radius:** 8px
- **Padding:** 8px (the colored padding creates a "border" effect around the inner white card)
- **Inner card:** White background with the image and text

##### Card Content
1. **Image:** Full-width at top of card, object-fit cover
2. **Badge row:** "Blindspot" badge + "8 Sources" badge
   - **Blindspot badge:** bg maroon `rgb(128, 39, 39)`, cream text, 12px, weight 600, padding 5px 4px, border-radius 4px
   - **Sources badge:** bg cream `rgb(238, 239, 233)`, dark text, 12px, padding 5px 4px, border-radius 4px
3. **Headline:** Bold text, truncated with "..."
4. **Mini bias bar** at bottom of card showing coverage split

##### Example Cards
- "RFK Jr's vaccine agenda faces Boston judge who has handed Trump..." (Center 62% | Right 38%)
- "DEA supervisor arrested as US shutters Dominican Republic office during..." (Left 71% | C 15% | R 14%)

#### "View Blindspot Feed" Button
- **Background:** transparent
- **Border:** 0.555556px solid `rgb(38, 38, 38)`
- **Border radius:** 4px
- **Padding:** 11.2px
- **Font size:** 16px, weight 680
- **Text:** "View Blindspot Feed"
- **Width:** Full column width (~303px)
- Centered text, links to /blindspot

### My News Bias Section

#### Heading
- **Text:** "My News Bias"
- **Font size:** 32px, weight 800

#### Content
- **User avatar:** Circular profile image
- **Username:** "CMLKevin"
- **Stats:** "17 Stories * 0 Articles"
- **Bias bar:** Shows personal reading bias: "L 33%", "C 42%", "R 25%"
  - Same colored segment bar as story bias bars
- **Link:** "See what you're reading" -- bordered button linking to /my-news-bias?timeRange=days7
  - Same styling as "View Blindspot Feed" button

---

## 12. Bias Indicator Bar Design

The bias bar is one of Ground News' signature UI elements. It appears in multiple contexts with different sizes.

### Full-Size Bias Bar (Hero Card, Topic Section Cards)

#### Container
- **Display:** flex
- **Width:** Full card width (e.g., ~592px on hero)
- **Height:** ~24px
- **Border radius:** 0px (no rounding)
- **Overflow:** hidden

#### Segments
Three contiguous colored segments, proportionally sized:

| Segment | Background | Text Color | Text Format |
|---------|-----------|------------|-------------|
| Left | `rgb(128, 39, 39)` (maroon) | `rgb(238, 239, 233)` (cream) | "Left 29%" or "L 22%" |
| Center | `rgb(255, 255, 255)` (white) | `rgb(38, 38, 38)` (dark) | "Center 49%" or "C 15%" |
| Right | `rgb(32, 73, 134)` (dark blue) | `rgb(238, 239, 233)` (cream) | "R 22%" or "Right 46%" |

#### Text Style
- Font size: 12px
- Font weight: 600
- Centered within each segment
- Uses flex for alignment

#### Width Calculation
Each segment's width is proportional to its percentage. E.g., if Left = 29%, the left segment takes up 29% of the bar width.

### Mini Bias Bars (Feed List Items, Top News Stories)

Smaller versions that appear alongside coverage text in feed items.

#### Dimensions
- **Height:** 8px
- **Individual bar width:** Variable, proportional to coverage
  - Example: Left bar ~25px, Right bar ~21px
- No text inside -- just colored segments
- Displayed horizontally side by side

#### Colors
Same as full-size: maroon for Left, gold/tan dot for Center indicator, dark blue for Right.

### Blindspot Sidebar Card Bias Bars

On the sidebar Blindspot cards, bias bars span the bottom of the card with full-width segments.

---

## 13. Topic Section Blocks

Below the main 3-column area, the page shows sections for each followed topic. The observed sections were **Israel-Gaza News** and **Politics News**.

### Section Layout

#### Header Row
- **Topic heading:** e.g., "Israel-Gaza News" or "Politics News"
  - Font size: 32px, weight 800
- **Buttons (right-aligned):**
  - "Unfollow" button: transparent bg, dark border, border-radius 4px
  - "Read More" button: transparent bg, dark border, border-radius 4px, links to /interest/{topic}

#### Two Sub-sections Side by Side

##### Left: "Latest [Topic] News"
- **Sub-heading:** e.g., "Latest Israel-Gaza News" (smaller, ~16px, weight 600-800)
- **Feature card:** Large image card with:
  - Full-width image
  - Dark gradient overlay at bottom
  - Headline overlaid on image
  - Full-size bias bar at bottom
  - "Read more Israel-Gaza" link below

##### Right: "[Topic] Blindspots"
- **Sub-heading:** e.g., "Israel-Gaza Blindspots" or "Politics Blindspots"
- **Two blindspot cards side by side:**
  - Each card has:
    - Thumbnail image
    - "Blindspot:" label + badge (e.g., "Only 13% Left" or "0% Right")
    - Source count: "14 sources"
    - Headline text

#### Blindspot Badge Styles in Topic Sections
- **"Blindspot:" prefix text** in regular weight
- **"Only X% Left" badge:** maroon bg `rgb(128, 39, 39)`, cream text, rounded corners
- **"Only X% Right" badge:** blue bg `rgb(32, 73, 134)`, cream text, rounded corners
- **"0% Right" badge:** blue bg

---

## 14. Blindspot Email Signup Box

Appears after each topic section's blindspot area.

### Design
- **Background:** `rgb(38, 38, 38)` (near black)
- **Text color:** `rgb(238, 239, 233)` (cream)
- **Border radius:** 4px
- **Padding:** 40px
- **Width:** Full right-side area

### Content
- **Eye icon + "Blindspot" heading**
- **Description:** "Get the weekly Blindspot report sent to your inbox and stay up to date with your bias blindspot."
- **Email input:** Text field with placeholder "Email address"
  - Dark background input field
- **Subscribe button:** Cream/light border, cream text

---

## 15. Similar News Topics Sidebar

Appears in the right column below the feed/topic sections.

### Design
- **Heading:** "Similar News Topics" (bold, 22px)

### Topic List Items
Each item is a horizontal row:
- **Topic icon:** Circular avatar image (~40px diameter) representing the topic
- **Topic name:** e.g., "Israel-Gaza", "Valentine's Day", "Olympics"
- **Follow/Unfollow button:**
  - Checkmark icon if already followed
  - "+" (plus) icon if not followed
- Items: Israel-Gaza (followed), Valentine's Day, Olympics, Business & Markets, Trump Administration, Artificial Intelligence, Health & Medicine

---

## 16. Latest News Stories Section

A full-width section below the topic blocks.

### Heading
- **Text:** "Latest News Stories"
- Font size: 32px, weight 800

### Story List
Same format as feed stories but in a wider layout:
- **Category + Location:** e.g., "US Foreign Policy * Iran"
- **Headline:** Bold, 16px
- **Mini bias bar + source text:** Colored segments + "44% Center coverage: 25 sources"
- **Thumbnail:** Right-aligned image

### Stories Listed
Up to 10+ stories with a "More stories" button at the bottom.

### "More Stories" Button
- **Background:** transparent
- **Border:** 0.555556px solid `rgb(38, 38, 38)`
- **Border radius:** 4px
- **Padding:** 8px 11.2px
- **Font size:** 16px, weight 680
- **Color:** `rgb(38, 38, 38)`

---

## 17. Footer

The footer has two main sections.

### Upper Footer (Light Background)

Sits on the same cream page background `rgb(238, 239, 233)`.

#### Five Columns of Links
| Column | Links |
|--------|-------|
| **News** | Home Page, Local News, Blindspot Feed, International |
| **International** | North America, South America, Europe, Asia, Australia, Africa |
| **Trending Internationally** | Valentine's Day, Olympics, Business & Markets, Trump Administration, Artificial Intelligence |
| **Trending in U.S.** | Israel-Gaza, Valentine's Day, Trump Administration, Baseball, Immigration and Customs Enforcement |
| **Trending in U.K.** | Israel-Gaza, Arsenal FC, Manchester United, Premier League, Soccer |

- **Section headings:** 22px, weight 600, `rgb(238, 239, 233)` on dark or dark on light depending on context
- **Links:** 22px (desktop), no text decoration

### Lower Footer (Dark Background)

- **Background:** `rgb(38, 38, 38)` (near black)
- **Text color:** `rgb(238, 239, 233)` (cream)

#### Layout
Four columns:

1. **Ground News logo** (white version, block letters)
2. **Company:** About, History, Mission, Blog, Testimonials, Group Subscriptions, Subscribe, Gift, Free Trial, Careers, Affiliates
3. **Help:** Help Center, FAQ, Contact Us, Media Bias Ratings, Ownership and Factuality Ratings, Referral Code, News Sources, Topics
4. **Tools:** App, Browser Extension, Daily Newsletter, Blindspot Report Newsletter, Burst Your Bubble Newsletter, Timelines

#### Bottom Bar
- **Links:** Gift, Privacy Policy, Manage Cookies, Privacy Preferences, Terms and Conditions
- **Edition selector:** "International" with dropdown
- **App Store badges:** Apple App Store + Google Play Store download buttons
- **Social media icons:** Facebook, X (Twitter), Instagram, LinkedIn, Reddit
- **Copyright:** "(c) 2026 Snapwise Inc"

---

## 18. Interactive Elements & Hover Effects

### Buttons
All buttons use `border-radius: 4px` consistently.
- **Primary buttons** (Subscribe, Get Started): Dark bg, cream text
- **Secondary buttons** (My Account, View Blindspot Feed, More Stories, Unfollow, Read More): Transparent bg, dark border, dark text
- **Topic follow buttons:** Small "+" or checkmark icons within pill-shaped containers

### Links
- **Default:** No underline, color inherits from context
- **Feed story links:** Entire card row is clickable (flex container link)
- **Navigation links:** No underline, no hover decoration visible (likely subtle opacity or underline change)

### Search Box
- Collapsed state: Shows just a magnifying glass icon + "Search" text in a pill-shaped container
- Expanded state: Full text input with longer placeholder text

### Topic Pills
- Hoverable/clickable, likely subtle background change on hover
- Scrollable container (overflow-x auto)

### Bias Bars
- Each segment of the bias bar is within a clickable story card
- No individual segment interactivity

### Scroll Indicators
- The topic pills bar has a fade gradient on the right edge suggesting more content is scrollable

---

## 19. CSS Architecture & Framework

### Framework
- **Tailwind CSS** - confirmed by class names found in the DOM:
  - `flex`, `flex-col`, `gap-[2rem]`, `col-span-3`, `col-span-6`, `col-span-12`
  - `desktop:flex`, `desktop:col-span-6`, `tablet:hidden`, `tablet:my-0`
  - `border-r`, `border-r-light-heavy`, `px-marginmobile`
  - `bg-tertiary-light`, `dark:bg-ground-black`, `dark:bg-dark-light`

### Custom Tailwind Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `bg-tertiary-light` | `rgb(218, 219, 214)` | Topic pill background |
| `bg-light-primary` | light color | Right column tablet bg |
| `bg-ground-black` | `rgb(38, 38, 38)` | Dark theme background |
| `border-r-light-heavy` | subtle gray | Column separators |
| `px-marginmobile` | custom padding | Mobile margin |

### Responsive Breakpoints
- **`desktop:`** prefix -- likely >= 1024px or >= 1280px
- **`tablet:`** prefix -- likely >= 768px
- Mobile-first approach with breakpoint-prefixed utilities

### Dark Mode Support
- Classes like `dark:bg-ground-black`, `dark:bg-dark-light` indicate built-in dark mode support
- Theme switcher in utility bar provides Light / Dark / Auto options

### Grid System
```
article.grid.grid-cols-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
}

/* Left column */
section.col-span-3 { /* 3/12 = 25% */ }

/* Center column */
section.col-span-6 { /* 6/12 = 50% */ }

/* Right column */
section.col-span-3 { /* 3/12 = 25% */ }
```

### Spacing Scale
- **Gap between major sections:** 2rem (32px) -- `gap-[2rem]`
- **Gap within sections:** 1.5rem (24px) -- `gap-[1.5rem]`
- **Card internal padding:** 8px, 16px
- **Column padding:** 1rem (16px) -- `px-[1rem]`, `pr-[1rem]`, `pl-[1rem]`
- **Feed item gap:** 16px (between text and thumbnail)
- **Topic pill gap:** 8px
- **Button padding:** 9.6px (primary), 8px 11.2px (secondary)

---

## 20. Mobile Bottom Navigation

A fixed bottom navigation bar (visible on mobile, hidden on desktop) with 5 items:

| Item | Icon | Label | Link |
|------|------|-------|------|
| News | newspaper icon | "News" | / |
| For You | - | "For You" | /my |
| Search | - | "Search" | /search |
| Blindspot | - | "Blindspot" | /blindspot |
| Local | pin icon | "Local" | /local |

---

## Summary of Key Design Patterns

1. **Bias visualization** is the core differentiator -- colored bars (maroon/white/blue) appear on every story
2. **Three-column layout** with Daily Briefing (left), main feed (center), Blindspot + personal bias (right)
3. **Warm cream background** `#EEEFE9` with near-black text `#262626` creates high contrast
4. **Gold/tan accent** `#D1BD91` used in promotional banner and as center bias indicator
5. **Topic-based content sections** with follow/unfollow capability
6. **Blindspot feature** is prominently featured with dedicated sidebar, per-topic sections, and email signup
7. **Consistent button design** with 4px border radius, two styles (filled dark, outlined)
8. **universalSans** custom font used exclusively throughout
9. **Tailwind CSS** with custom tokens for the design system
10. **Sticky header** with promotional banner + utility bar + nav + topic pills
