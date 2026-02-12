# Ground News Parity TODO

Generated from `audit.md`.

## Status
- Total issues in audit: **120**
- Marked done in `docs/parity/done_ids.json`: **120**
- Remaining pending: **0**

## How To Use
- Update done list: `docs/parity/done_ids.json`
- Regenerate: `npm run parity:todo`
- Smoke verify: `npm run parity:smoke -- --base-url http://localhost:3000`

## Implemented (Checked Off)
These are checked off based on code already landed on this branch. If any are only partial, remove them from `done_ids.json` and they’ll reappear under Pending.

### P0
- [x] **A1** (P0, A. Global / Cross-Page Issues): Header not sticky
- [x] **A2** (P0, A. Global / Cross-Page Issues): Missing mobile bottom navigation
- [x] **A3** (P0, A. Global / Cross-Page Issues): Missing topic tags bar on secondary pages
- [x] **A5** (P0, A. Global / Cross-Page Issues): Section header font size: 19.52px vs 32px
- [x] **A9** (P0, A. Global / Cross-Page Issues): Active tab/button styling: green fill vs gold underline
- [x] **B1** (P0, B. Homepage): Empty 467px gap in center column below hero
- [x] **B2** (P0, B. Homepage): Duplicate Daily Briefing
- [x] **D1** (P0, D. Blindspot Page): Missing filter tabs: All / For the Left / For the Right
- [x] **D2** (P0, D. Blindspot Page): Bias breakdown: single bar vs 3-row layout
- [x] **D3** (P0, D. Blindspot Page): Duplicate bias bar from CDN image + component
- [x] **E1** (P0, E. Interest / Topic Pages): Missing "Top {Topic} News" 3-column featured row
- [x] **E2** (P0, E. Interest / Topic Pages): Missing dedicated "Blindspots" section
- [x] **H1** (P0, H. My Feed / For You Page): Missing 6-tab navigation

### P1
- [x] **A4** (P1, A. Global / Cross-Page Issues): Missing hamburger menu on desktop
- [x] **A6** (P1, A. Global / Cross-Page Issues): Font family mismatch
- [x] **A7** (P1, A. Global / Cross-Page Issues): Bias bar center color: gray vs white
- [x] **B3** (P1, B. Homepage): Missing "Top News Stories" section in left sidebar
- [x] **B4** (P1, B. Homepage): "Original reporting: unknown" placeholder
- [x] **B6** (P1, B. Homepage): Blindspot section is plain text list
- [x] **B8** (P1, B. Homepage): Feed uses 2-column card grid vs single-column news list
- [x] **C1** (P1, C. Story Detail Pages): Column ratio 1.5:1 (60/40) vs 2:1 (67/33)
- [x] **C2** (P1, C. Story Detail Pages): Sidebar not sticky
- [x] **C4** (P1, C. Story Detail Pages): Headline font-weight 700, should be 800
- [x] **C7** (P1, C. Story Detail Pages): Share buttons are text-based, not icon-based
- [x] **C9** (P1, C. Story Detail Pages): Share icons positioned after Key Points, should be near metadata
- [x] **C13** (P1, C. Story Detail Pages): Source card headers missing gray background
- [x] **D4** (P1, D. Blindspot Page): Card grid: 1 column vs 2 columns per side
- [x] **D5** (P1, D. Blindspot Page): Missing colored card background "border" effect
- [x] **E3** (P1, E. Interest / Topic Pages): Missing compact list-style story cards
- [x] **E4** (P1, E. Interest / Topic Pages): Missing "More stories" pagination
- [x] **E5** (P1, E. Interest / Topic Pages): Missing "Breaking News Topics Related to {Topic}" grid
- [x] **E6** (P1, E. Interest / Topic Pages): No bias labels on "Covered Most By" sources
- [x] **E7** (P1, E. Interest / Topic Pages): Column ratio 60/40 vs 70/30
- [x] **E8** (P1, E. Interest / Topic Pages): 2-column card grid vs 3-column for featured
- [x] **G1** (P1, G. Local Page): Weather widget missing 7-day forecast
- [x] **G2** (P1, G. Local Page): Missing "Top {Location} News" hero section
- [x] **H2** (P1, H. My Feed / For You Page): Missing Filter sidebar
- [x] **H3** (P1, H. My Feed / For You Page): Missing Favorites sidebar
- [x] **H5** (P1, H. My Feed / For You Page): No Discover tab
- [x] **I1** (P1, I. Source Pages): Missing comprehensive source profile
- [x] **K1** (P1, K. Onboarding Wizard): Topic/source chips lack clear toggle states
- [x] **L1** (P1, L. Rating System Page): Only 3 bias buckets vs Ground News's 7 categories
- [x] **M1** (P1, M. Subscribe Page): No imagery/illustrations in plan cards
- [x] **M5** (P1, M. Subscribe Page): No feature comparison table

### P2
- [x] **A8** (P2, A. Global / Cross-Page Issues): Bias bar left/right colors too bright
- [x] **A10** (P2, A. Global / Cross-Page Issues): Nav links styled as pills vs plain text
- [x] **A11** (P2, A. Global / Cross-Page Issues): Missing "Subscribe" button in header
- [x] **A12** (P2, A. Global / Cross-Page Issues): Missing location display in utility bar
- [x] **A14** (P2, A. Global / Cross-Page Issues): Max-width 1280px vs 1440px
- [x] **A15** (P2, A. Global / Cross-Page Issues): Grid gap 16px vs 32px
- [x] **B5** (P2, B. Homepage): Missing story/article/read-time counts in Daily Briefing
- [x] **B7** (P2, B. Homepage): Hero card uses serif font (Newsreader) vs sans-serif
- [x] **B9** (P2, B. Homepage): Header layer order swapped
- [x] **B11** (P2, B. Homepage): Column proportions: 0.92fr/1.7fr/0.92fr vs 3/6/3 cols
- [x] **C3** (P2, C. Story Detail Pages): Headline font-size 40px, should be 42px
- [x] **C5** (P2, C. Story Detail Pages): Headline line-height 43.2px, should be 47.5px
- [x] **C6** (P2, C. Story Detail Pages): Metadata font-weight 400, should be 600
- [x] **C8** (P2, C. Story Detail Pages): Missing Email and Pinterest share options
- [x] **C10** (P2, C. Story Detail Pages): Perspective tab names: "Left View" vs "Left"
- [x] **C11** (P2, C. Story Detail Pages): Missing "Bias Comparison" fourth tab
- [x] **C12** (P2, C. Story Detail Pages): Perspective summary text 15.52px, should be 18px/480
- [x] **C15** (P2, C. Story Detail Pages): Section heading "Full Coverage Sources" vs "X Articles"
- [x] **C16** (P2, C. Story Detail Pages): Missing "Broke the news" sidebar section
- [x] **C17** (P2, C. Story Detail Pages): Missing L/C/R source count breakdown in sidebar
- [x] **C18** (P2, C. Story Detail Pages): Bias distribution bar uses flat colors vs gradients
- [x] **C19** (P2, C. Story Detail Pages): Bias Distribution panel in main content vs sidebar
- [x] **D6** (P2, D. Blindspot Page): Missing column subtitles
- [x] **D10** (P2, D. Blindspot Page): Source badge format differs
- [x] **D11** (P2, D. Blindspot Page): Missing "More stories" pagination button
- [x] **E9** (P2, E. Interest / Topic Pages): Header says "{Topic}" vs "News about {Topic}"
- [x] **E10** (P2, E. Interest / Topic Pages): Missing "Media Bias Breakdown" bar chart
- [x] **E12** (P2, E. Interest / Topic Pages): Sidebar not sticky
- [x] **E13** (P2, E. Interest / Topic Pages): Missing source logos/favicons
- [x] **E14** (P2, E. Interest / Topic Pages): 404 on many topic slugs
- [x] **F1** (P2, F. Search Page): Autocomplete dropdown overlaps filter tabs
- [x] **F2** (P2, F. Search Page): Redundant search bars
- [x] **F5** (P2, F. Search Page): Skeleton loading persists for missing images
- [x] **G3** (P2, G. Local Page): Missing location avatar/icon and description
- [x] **G5** (P2, G. Local Page): Publishers missing bias indicator icons
- [x] **H4** (P2, H. My Feed / For You Page): Story cards missing description snippets
- [x] **H6** (P2, H. My Feed / For You Page): No Custom Feeds tab
- [x] **H7** (P2, H. My Feed / For You Page): No Citations tab
- [x] **H8** (P2, H. My Feed / For You Page): Empty state in guest mode
- [x] **I2** (P2, I. Source Pages): "Bias: L 0, C 6, R 0" notation unclear
- [x] **I4** (P2, I. Source Pages): All articles show "unknown" factuality
- [x] **I5** (P2, I. Source Pages): No "about this source" description paragraph
- [x] **J1** (P2, J. Auth Pages): SSO buttons disabled but rendered
- [x] **J2** (P2, J. Auth Pages): No "Forgot password?" link
- [x] **K2** (P2, K. Onboarding Wizard): Missing progress bar / stepper
- [x] **K3** (P2, K. Onboarding Wizard): No location setup step
- [x] **L2** (P2, L. Rating System Page): Missing colored category icons
- [x] **L3** (P2, L. Rating System Page): Missing methodology explanation
- [x] **M2** (P2, M. Subscribe Page): No pricing toggle (Monthly/Annual)

### P3
- [x] **A13** (P3, A. Global / Cross-Page Issues): Theme selector: dropdown vs inline text toggle
- [x] **A16** (P3, A. Global / Cross-Page Issues): Card border-radius 14px vs 8px
- [x] **A17** (P3, A. Global / Cross-Page Issues): Footer is minimal
- [x] **B10** (P3, B. Homepage): "Weather enabled for your saved city" placeholder text
- [x] **B12** (P3, B. Homepage): No user avatar/name in My News Bias widget
- [x] **B13** (P3, B. Homepage): Coverage text as separate chips vs inline text
- [x] **C14** (P3, C. Story Detail Pages): Source logo 36px, should be 24px circle
- [x] **C20** (P3, C. Story Detail Pages): Missing "Reposted by X other sources" indicator
- [x] **C21** (P3, C. Story Detail Pages): Missing "Does this summary seem wrong?" feedback link
- [x] **C22** (P3, C. Story Detail Pages): Image bias overlay rounding mismatch with component
- [x] **D7** (P3, D. Blindspot Page): Missing BLINDSPOT TM symbol
- [x] **D8** (P3, D. Blindspot Page): Header description overridden by scope text
- [x] **D9** (P3, D. Blindspot Page): Source count not uppercase
- [x] **D12** (P3, D. Blindspot Page): Extra KPI strip not in Ground News reference
- [x] **E11** (P3, E. Interest / Topic Pages): Missing "Suggest a source" card in sidebar
- [x] **E15** (P3, E. Interest / Topic Pages): Bias bar label clipping on images
- [x] **F3** (P3, F. Search Page): Missing descriptive placeholder text
- [x] **F4** (P3, F. Search Page): Missing search result count summary
- [x] **G4** (P3, G. Local Page): Local News Publishers not collapsible
- [x] **G6** (P3, G. Local Page): Missing "Discover stories in your city" CTA
- [x] **I3** (P3, I. Source Pages): "Back to Home" misplaced as tag chip
- [x] **J3** (P3, J. Auth Pages): No Terms of Service links
- [x] **J4** (P3, J. Auth Pages): Pages look sparse
- [x] **K4** (P3, K. Onboarding Wizard): Hero section repeats on every step
- [x] **L4** (P3, L. Rating System Page): No example sources per rating
- [x] **M3** (P3, M. Subscribe Page): No "As featured on" logo strip
- [x] **M4** (P3, M. Subscribe Page): No testimonial section

## Pending (Implement All Remaining)

## Notes
- This file is a tracking artifact; the source of truth for issue descriptions remains `audit.md`.
- Keep each TODO item tied to an audit ID so we can verify parity systematically.

