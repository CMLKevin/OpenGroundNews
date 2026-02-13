# Ground News - Complete CSS Design System & Visual Architecture

**Extracted:** February 13, 2026
**Source:** https://ground.news/ (live site inspection via Chrome DevTools)
**Framework:** Tailwind CSS v4 with custom theme extensions (JIT mode)
**Build:** Next.js with CSS Modules for component-specific styles

---

## TABLE OF CONTENTS

1. [CSS Architecture Overview](#1-css-architecture-overview)
2. [Custom CSS Properties (Design Tokens)](#2-custom-css-properties-design-tokens)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing & Layout System](#5-spacing--layout-system)
6. [Responsive Breakpoints](#6-responsive-breakpoints)
7. [Component Patterns](#7-component-patterns)
8. [Dark Mode](#8-dark-mode)
9. [Complete Color Reference Table](#9-complete-color-reference-table)

---

## 1. CSS Architecture Overview

### Framework
- **Tailwind CSS v4** with `@layer utilities` and `@theme` extensions
- Custom utility classes defined via Tailwind's plugin system
- CSS Modules used for component-scoped styles (e.g., `article-module__Tnqyaa__*`, `search-box-module__5YaRwq__*`)
- Font files self-hosted as `.woff` and `.woff2` (not Google Fonts)

### Theme Switching
- Dark mode toggled by adding `.dark` class to `<html>` element (Tailwind `selector` strategy)
- Three options exposed to users: Light, Dark, Auto
- CSS custom properties on `:root` (light) and `.dark` (dark) selectors

### Spacing Base
- `--spacing: 0.25rem` (4px) -- Tailwind v4 default spacing unit

---

## 2. Custom CSS Properties (Design Tokens)

### Light Theme (`:root`)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#fff` | Page background |
| `--foreground` | `#0a0a0a` | Default text |
| `--card` | `#fff` | Card backgrounds |
| `--card-foreground` | `#0a0a0a` | Card text |
| `--popover` | `#fff` | Popover backgrounds |
| `--popover-foreground` | `#0a0a0a` | Popover text |
| `--primary` | `#171717` | Primary buttons/actions |
| `--primary-foreground` | `#fafafa` | Text on primary |
| `--secondary` | `#f5f5f5` | Secondary backgrounds |
| `--secondary-foreground` | `#171717` | Secondary text |
| `--muted` | `#f5f5f5` | Muted/disabled backgrounds |
| `--muted-foreground` | `#737373` | Muted/disabled text |
| `--accent` | `#f5f5f5` | Accent backgrounds |
| `--accent-foreground` | `#171717` | Accent text |
| `--destructive` | `#e40014` | Error/destructive actions |
| `--border` | `#e5e5e5` | Default borders |
| `--input` | `#e5e5e5` | Input borders |
| `--ring` | `#a1a1a1` | Focus ring color |
| `--radius` | `0.625rem` (10px) | Default border-radius |
| `--sidebar` | `#fafafa` | Sidebar background |
| `--sidebar-foreground` | `#0a0a0a` | Sidebar text |
| `--sidebar-primary` | `#171717` | Sidebar primary |
| `--sidebar-primary-foreground` | `#fafafa` | Sidebar primary text |
| `--sidebar-accent` | `#f5f5f5` | Sidebar accent |
| `--sidebar-accent-foreground` | `#171717` | Sidebar accent text |
| `--sidebar-border` | `#e5e5e5` | Sidebar borders |
| `--sidebar-ring` | `#a1a1a1` | Sidebar focus ring |

### Chart Colors (Light)

| Token | Value | Hex |
|-------|-------|-----|
| `--chart-1` | `#f05100` | Orange |
| `--chart-2` | `#009588` | Teal |
| `--chart-3` | `#104e64` | Dark Teal |
| `--chart-4` | `#fcbb00` | Amber |
| `--chart-5` | `#f99c00` | Orange-Yellow |

### Dark Theme (`.dark`)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0a0a0a` | Page background |
| `--foreground` | `#fafafa` | Default text |
| `--card` | `#171717` | Card backgrounds |
| `--card-foreground` | `#fafafa` | Card text |
| `--popover` | `#171717` | Popover backgrounds |
| `--popover-foreground` | `#fafafa` | Popover text |
| `--primary` | `#e5e5e5` | Primary buttons/actions |
| `--primary-foreground` | `#171717` | Text on primary |
| `--secondary` | `#262626` | Secondary backgrounds |
| `--secondary-foreground` | `#fafafa` | Secondary text |
| `--muted` | `#262626` | Muted/disabled backgrounds |
| `--muted-foreground` | `#a1a1a1` | Muted/disabled text |
| `--accent` | `#262626` | Accent backgrounds |
| `--accent-foreground` | `#fafafa` | Accent text |
| `--destructive` | `#ff6568` | Error/destructive actions |
| `--border` | `#ffffff1a` | Default borders (white 10%) |
| `--input` | `#ffffff26` | Input borders (white 15%) |
| `--ring` | `#737373` | Focus ring color |
| `--sidebar` | `#171717` | Sidebar background |
| `--sidebar-foreground` | `#fafafa` | Sidebar text |
| `--sidebar-primary` | `#1447e6` | Sidebar primary (blue) |
| `--sidebar-primary-foreground` | `#fafafa` | Sidebar primary text |
| `--sidebar-accent` | `#262626` | Sidebar accent |
| `--sidebar-accent-foreground` | `#fafafa` | Sidebar accent text |
| `--sidebar-border` | `#ffffff1a` | Sidebar borders |
| `--sidebar-ring` | `#737373` | Sidebar focus ring |

### Chart Colors (Dark)

| Token | Value | Hex |
|-------|-------|-----|
| `--chart-1` | `#1447e6` | Blue |
| `--chart-2` | `#00bb7f` | Green |
| `--chart-3` | `#f99c00` | Orange |
| `--chart-4` | `#ac4bff` | Purple |
| `--chart-5` | `#ff2357` | Pink-Red |

---

## 3. Color System

### Ground News Custom Colors (Tailwind theme extensions)

These are the custom `--color-*` tokens defined in Tailwind's `@theme` block:

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-white` | `#fff` | `rgb(255, 255, 255)` | White |
| `--color-light-primary` | `#eeefe9` | `rgb(238, 239, 233)` | Page background (light), off-white cream |
| `--color-light-heavy` | `#a6a6a1` | `rgb(166, 166, 161)` | Heavy/muted light color, borders |
| `--color-dark-primary` | `#262626` | `rgb(38, 38, 38)` | Primary dark, text color, dark backgrounds |
| `--color-dark-light` | `#393938` | `rgb(57, 57, 56)` | Lighter dark, dark mode card borders |
| `--color-focus` | `#d1bd91` | `rgb(209, 189, 145)` | Focus/banner gold, CTA banner background |
| `--color-border` | `var(--border)` | -- | Alias to theme border token |

### Ground News Named Colors (Utility classes)

These are generated as `bg-ground-*`, `text-ground-*`, `border-ground-*` utility classes:

| Class Name | Hex | RGB | Usage |
|------------|-----|-----|-------|
| `ground-black` | `#262626` | `rgb(38, 38, 38)` | Primary dark text and backgrounds |
| `ground-blue` | `#1565c0` | `rgb(21, 101, 192)` | General blue accent |
| `ground-green` | `#57912b` | `rgb(87, 145, 43)` | Original Reporting indicator, positive |
| `ground-green-pale` | `#28433a` | `rgb(40, 67, 58)` | Dark green (borders) |
| `ground-grey` | `#767774` | `rgb(118, 119, 116)` | Medium gray |
| `ground-yellow` | `#ffd902` | `rgb(255, 217, 2)` | Primary yellow accent, search button |
| `ground-red` | `#d50000` | `rgb(213, 0, 0)` | Alert/strong red |
| `ground-new-dark-red` | `#802727` | `rgb(128, 39, 39)` | **LEFT bias** (dark red/maroon) |
| `ground-new-dark-blue` | `#204986` | `rgb(32, 73, 134)` | **RIGHT bias** (dark navy blue) |
| `ground-light-red` | `#c85c5c` | `rgb(200, 92, 92)` | **LEAN LEFT** indicator (lighter red) |
| `ground-light-blue` | `#5c8ee6` | `rgb(92, 142, 230)` | **LEAN RIGHT** indicator (lighter blue) |
| `ground-pale-yellow` | `#fef8db` | `rgb(254, 248, 219)` | Pale yellow background |
| `ground-palest-yellow` | `#fefdf0` | `rgb(254, 253, 240)` | Very pale yellow |

### Semantic/Structural Colors

| Class Name | RGB | Usage |
|------------|-----|-------|
| `secondary-neutral` | `rgb(255, 255, 255)` | **CENTER bias** bar segment (white) |
| `tertiary-light` | `rgb(218, 219, 214)` | Topic pill bg (light mode), tertiary borders |

### Bias Distribution Bar Colors (THE KEY COLORS)

| Bias Category | Background Color | Text Color | Class |
|---------------|-----------------|------------|-------|
| **Left** | `rgb(128, 39, 39)` / `#802727` | `rgb(238, 239, 233)` (cream) | `bg-ground-new-dark-red` |
| **Lean Left** | `rgb(200, 92, 92)` / `#C85C5C` | white | `bg-ground-light-red` |
| **Center** | `rgb(255, 255, 255)` / `#FFFFFF` | `rgb(38, 38, 38)` (dark) | `bg-secondary-neutral` |
| **Lean Right** | `rgb(92, 142, 230)` / `#5C8EE6` | white | `bg-ground-light-blue` |
| **Right** | `rgb(32, 73, 134)` / `#204986` | `rgb(238, 239, 233)` (cream) | `bg-ground-new-dark-blue` |

### Blindspot Badge Colors

Blindspot badges use the **same bias colors** as the bias bar:
- **Left Blindspot** (story missed by right-leaning sources): `bg-ground-new-dark-red` (`#802727`)
- **Right Blindspot** (story missed by left-leaning sources): `bg-ground-new-dark-blue` (`#204986`)

Badge styling: `border-radius: 4px`, `padding: 5px 4px`, `font-size: 12px`, `font-weight: 600`

### Source Grid Tint Colors (Article Page)

These are used as background tints for the source logo columns in the bias distribution grid:

| Class | RGB | Usage |
|-------|-----|-------|
| `bg-tint-left-2` | `rgb(77, 109, 158)` | Strong left tint |
| `bg-tint-left-5` | `rgb(144, 164, 195)` | Medium left tint |
| `bg-tint-left-7` | `rgb(210, 219, 231)` | Light left tint |
| `bg-tint-right-2` | `rgb(153, 82, 82)` | Strong right tint |
| `bg-tint-right-5` | `rgb(192, 147, 147)` | Medium right tint |
| `bg-tint-right-7` | `rgb(217, 190, 190)` | Light right tint |
| `text-tint-hover` | `rgb(138, 139, 136)` | Hover state for tinted text |

### Factuality Bar Colors

| Class | RGB | Usage |
|-------|-----|-------|
| `bg-factuality-very-high` | `rgb(57, 57, 56)` | Darkest (best factuality) |
| `bg-factuality-high` | `rgb(85, 85, 85)` | Dark |
| `bg-factuality-mixed` | `rgb(118, 119, 116)` | Medium gray |
| `bg-factuality-low` | `rgb(166, 166, 161)` | Light gray |
| `bg-factuality-very-low` | `rgb(218, 219, 214)` | Lightest (worst factuality) |

### Gray Scale Variables

| Variable | Value | Usage |
|----------|-------|-------|
| `--gray-50` | `#e5e5e5` | Lightest gray |
| `--gray-100` | `#6a7078` | Medium gray |
| `--gray-200` | `#8f8e94` | Medium-light gray |
| `--gray-300` | `#ceced2` | Light gray |
| `--gray-400` | `#f1f2f9` | Near-white gray |
| `--gray-500` | `#f7f7f7` | Off-white gray |
| `--dark-gray-100` | `#ceced2` | Dark mode lightest |
| `--dark-gray-200` | `#8f8e94` | Dark mode medium |
| `--dark-gray-300` | `#6a7078` | Dark mode darker |
| `--dark-gray-400` | `#262626` | Dark mode darkest |

---

## 4. Typography

### Font Families

Three custom font families are loaded:

| Family | Weights | Format | Usage |
|--------|---------|--------|-------|
| **universalSans** | 480, 680, 800 | `.woff` | Primary body/UI font (everything) |
| **sohneSans** | 400 (Buch), 600 (Halbfett), 700 (Kraftig) | `.woff2` | Secondary sans-serif |
| **sohneSerif** | 600 (Schmal Halbfett) | `.woff2` | Serif accent (limited use) |

**Fallback chain:**
- universalSans: `universalSans, "universalSans Fallback", system-ui, -apple-system, sans-serif`
- Tailwind `--font-sans`: `"sohneSans", "sohneSans Fallback", system-ui, -apple-system, sans-serif`
- Tailwind `--font-serif`: `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`

**Font Metric Overrides (for fallback CLS prevention):**
- universalSans Fallback: `ascent-override: 92.06%; descent-override: 23.26%; size-adjust: 103.19%`
- sohneSans Fallback: `ascent-override: 116.77%; descent-override: 42.18%; size-adjust: 100.28%`

### Font Weights Used

| Weight | Name | Usage |
|--------|------|-------|
| 300 | Light | Rarely used |
| 400 | Regular (sohneSans Buch) | Normal body text |
| 480 | universalSans Regular | Body text, metadata |
| 500 | Medium | Navigation, some UI |
| 600 | SemiBold | Section headers, badges, footer headers |
| 680 | universalSans Bold | Button text, nav links, headlines |
| 800 | universalSans ExtraBold | H2/H3 section headings, article titles |

### Custom Text Size Utilities

Ground News defines pixel-based text utilities alongside Tailwind defaults:

| Class | Size | Computed Line-Height |
|-------|------|---------------------|
| `.text-9` | 9px | -- |
| `.text-10` | 10px | -- |
| `.text-11` | 11px | -- |
| `.text-12` | 12px | 18px (1.5) |
| `.text-13` | 13px | -- |
| `.text-14` | 14px | 21px (1.5) |
| `.text-15` | 15px | 22.5px (1.5) |
| `.text-16` | 16px | 24px (1.5) |
| `.text-18` | 18px | 27px (1.5) |
| `.text-20` | 20px | 30px (1.5) |
| `.text-22` | 22px | -- |
| `.text-28` | 28px | -- |
| `.text-30` | 30px | -- |
| `.text-32` | 32px | 35px |
| `.text-36` | 36px | -- |
| `.text-40` | 40px | -- |
| `.text-42` | 42px | 47.5px |
| `.text-48` | 48px | -- |

### Element Typography Reference

| Element | Font Size | Weight | Line Height | Color (Light) |
|---------|-----------|--------|-------------|---------------|
| Body default | 16px | 400 | 24px | `rgb(38, 38, 38)` |
| H2 (section heading) | 32px | 800 | 35px | `rgb(38, 38, 38)` |
| H3 (section heading) | 32px | 800 | 35px | `rgb(38, 38, 38)` |
| Article title (H1) | 42px | 800 | 47.5px | `rgb(38, 38, 38)` |
| Hero card title (overlay) | 30px | 800 | 33px | `rgb(238, 239, 233)` (cream) |
| Nav links | 15px | 680 | 22.5px | `rgb(38, 38, 38)` |
| Button text (Subscribe) | 14px | 680 | -- | `rgb(238, 239, 233)` |
| Bias bar text | 12px | 600 | -- | cream or dark |
| Coverage/metadata text | 12px | 480 | -- | `rgb(38, 38, 38)` |
| Source count badge | 12px | 600 | -- | `rgb(38, 38, 38)` |
| Footer section headers | 22px | 600 | -- | `rgb(238, 239, 233)` |
| Footer links | inherit | 480 | -- | `rgb(238, 239, 233)` |
| Topic pill text | 12px | 600 | -- | varies |

---

## 5. Spacing & Layout System

### Base Spacing Unit
- `--spacing: 0.25rem` (4px)
- All Tailwind spacing utilities multiply from this base

### Container Widths
- **Max page width:** `--breakpoint-designmax: 90rem` (1440px)
- Utility class: `.max-w-screen-designmax { max-width: var(--breakpoint-designmax); }`
- Horizontal auto-centering: `mx-auto`

### Margin/Padding Utilities (Custom)

| Class | Value | Usage |
|-------|-------|-------|
| `.px-marginmobile` | `padding-inline: 1rem` (16px) | Mobile horizontal padding |
| `.px-margintablet` | `padding-inline: (tablet value)` | Tablet horizontal padding |
| `.px-margindesktop` | `padding-inline: 3rem` (48px) | Desktop horizontal padding |

### Homepage Grid Layout

**Main grid:** 12-column CSS Grid with `gap: 32px (row) normal (column)`

```
.grid.grid-cols-12 {
  max-width: 1440px;
  padding: 0 48px;
}
```

**Column assignments (desktop):**

| Section | Column Span | Width (at 1440px) | Description |
|---------|-------------|-------------------|-------------|
| Daily Briefing / Top News | `col-span-3` | ~336px | Left column, hidden on mobile |
| Hero + Feed | `col-span-6` (desktop), `col-span-12` (mobile) | ~672px | Center column |
| Blindspot + My Bias | `col-span-3` | ~336px | Right column |

**Responsive behavior:**
- On mobile (`< desktop`): Center column goes full-width (`col-span-12`), left/right columns hidden or stacked below
- Left column has: `hidden desktop:flex` (visible only on desktop)
- Right column has: `hidden desktop:flex` (visible only on desktop)

### Common Spacing Values (extracted from class names)

| Pattern | Pixel Value | Usage |
|---------|-------------|-------|
| `gap-[1rem]` | 16px | Card internal gap |
| `gap-[2rem]` | 32px | Section gap |
| `gap-[4px]` | 4px | Icon/badge gap |
| `gap-[8px]` | 8px | Small element gap |
| `p-[1.3rem]` | ~21px | Card padding |
| `p-[8px]` | 8px | Small element padding |
| `px-[0.6rem]` | ~10px | Button horizontal padding |
| `py-[0.6rem]` | ~10px | Button vertical padding |
| `py-[5px]` | 5px | Badge vertical padding |
| `pt-[1.1rem]` | ~18px | Section top padding |
| `pt-[2rem]` | 32px | Tablet section top padding |
| `pb-[2rem]` | 32px | Section bottom padding |
| `my-[2px]` | 2px | Tiny vertical margin |
| `my-[5px]` | 5px | Small vertical margin |
| `px-[5px]` | 5px | Small horizontal padding |

---

## 6. Responsive Breakpoints

| Name | Value | Rem | Pixels |
|------|-------|-----|--------|
| `tablet` | `37.625rem` | 37.625 | **602px** |
| `md` | `48rem` | 48 | 768px |
| `lg` | `64rem` | 64 | 1024px |
| `lgx` | `67.5625rem` | 67.5625 | 1081px |
| `charlie` | `70rem` | 70 | 1120px |
| `desktop` | `75rem` | 75 | **1200px** |
| `xl` | `80rem` | 80 | 1280px |
| `designmax` | `90rem` | 90 | **1440px** |
| `widescreen` | `105rem` | 105 | 1680px |

**Key breakpoints:**
- `tablet` (602px): First responsive step. Topic bar shows, some columns become visible.
- `desktop` (1200px): Full 3-column layout appears. Left & right columns shown.
- `designmax` (1440px): Max content width enforced.

---

## 7. Component Patterns

### 7.1 Buttons

#### Primary Button (Subscribe / Get Started)
```css
background-color: rgb(38, 38, 38);    /* bg-dark-primary */
color: rgb(238, 239, 233);            /* text-light-primary */
border-radius: 4px;                    /* rounded-lg-s */
padding: 9.6px;                        /* ~px-[0.6rem] py-[0.6rem] */
font-size: 14px;                       /* text-14 or text-12 */
font-weight: 680;
border: none;
```

#### Outline Button (My Account / View Blindspot Feed)
```css
background-color: transparent;
color: rgb(38, 38, 38);               /* text-dark-primary */
border-radius: 4px;                    /* rounded-lg-s */
padding: 9.6px 11.2px;
font-size: 16px;                       /* text-16 */
font-weight: 680;
border: 0.56px solid rgb(38, 38, 38); /* border border-dark-primary */
```

#### Custom Border Radius
```css
.rounded-lg-s { border-radius: 4px; }  /* Used on buttons, badges, cards */
.rounded-lg   { border-radius: var(--radius); } /* 10px */
```

### 7.2 News Cards

#### Daily Briefing / Top News Card
```css
background-color: rgb(255, 255, 255);  /* bg-white */
border-radius: 8px;                     /* rounded-[8px] */
border: 1.67px solid rgb(218, 219, 214); /* border-2 border-tertiary-light */
padding: 20.8px;                         /* p-[1.3rem] */
gap: 16px;                               /* gap-[1rem] between children */
display: flex;
flex-direction: column;
box-shadow: none;
```

**Dark mode override:**
```css
background-color: rgb(38, 38, 38);     /* dark:bg-dark-primary */
border: 1.67px solid rgb(57, 57, 56);  /* dark:border-dark-light */
```

#### Blindspot Sidebar Card
Same card pattern but with colored left border matching the blindspot bias direction.

### 7.3 Bias Distribution Bar

The bias bar is the signature UI component showing coverage distribution.

#### Large Bias Bar (Hero Card)
```css
/* Container */
display: flex;
height: 24px;                           /* h-[24px] visible area */
overflow: hidden;
text-align: center;
font-size: 12px;                        /* text-12 */
white-space: nowrap;

/* Segments are flex children with proportional widths */
/* Each segment: */
.segment {
  display: flex;
  align-items: center;
  justify-content: center;              /* via w-full text-center on inner span */
  leading: none;
  font-weight: 600;
  /* width set as inline style based on percentage */
}
```

**Segment colors:** See [Bias Distribution Bar Colors](#bias-distribution-bar-colors-the-key-colors) above.

#### Mini Bias Bar (Article List)
```css
/* Container */
width: 80px;                            /* w-[5rem] */
height: 8px;                            /* h-[8px] */
display: flex;
overflow: hidden;
/* Same segment color scheme, no text labels */
```

#### Condensed 3-Segment Bar (homepage)
Shows only Left (L), Center (C), Right (R) -- combining Lean Left into Left and Lean Right into Right.

#### Full 5-Segment Bar (article detail page)
Shows Left, Lean Left, Center, Lean Right, Right with proportional widths.

### 7.4 Blindspot Badge

```css
background-color: rgb(128, 39, 39);     /* Left blindspot: bg-ground-new-dark-red */
/* OR */
background-color: rgb(32, 73, 134);     /* Right blindspot: bg-ground-new-dark-blue */
color: rgb(238, 239, 233);              /* text-light-primary */
border-radius: 4px;                      /* rounded-[4px] */
padding: 5px 4px;                        /* py-[5px] */
font-size: 12px;                         /* text-12 */
font-weight: 600;
```

### 7.5 Topic Pills (Trending Tags Bar)

```css
/* Light mode */
background-color: rgb(218, 219, 214);   /* bg-tertiary-light */
color: varies;
display: flex;
align-items: center;
gap: 8px;
padding: 4px 8px;
font-size: 12px;
font-weight: 600;

/* Dark mode */
background-color: rgb(57, 57, 56);      /* dark:bg-dark-light */
color: rgb(238, 239, 233);              /* dark:text-light-primary */
```

### 7.6 Source Count Badge

```css
font-size: 12px;
font-weight: 600;
color: rgb(38, 38, 38);
background-color: rgb(255, 255, 255);   /* white background */
```

### 7.7 Search Box

```css
border: 0.56px solid rgb(166, 166, 161); /* border-light-heavy */
border-radius: 4px;                       /* rounded-lg-s */
padding: 8px;
height: 42px;                             /* h-[2.63rem] */
```

**Search button (hidden until focused):**
```css
background-color: rgb(253, 213, 23);     /* ground-yellow variant */
font-size: 14px;
transition: opacity 0.5s, visibility 0.5s;
```

### 7.8 Hero Card (Featured Article)

```css
/* Full-bleed image with dark gradient overlay */
width: 640px (at desktop);
height: ~419px;
border-radius: 0;
object-fit: cover;

/* Title overlay text */
color: rgb(238, 239, 233);              /* cream/white */
font-size: 30px;
font-weight: 800;
text-shadow: implied by dark overlay;

/* Bias bar at bottom of hero card */
/* Same as Large Bias Bar */
```

### 7.9 Image Treatments

| Context | Object-Fit | Border-Radius | Aspect Ratio |
|---------|-----------|---------------|-------------|
| Hero card image | `cover` | `0px` | ~1.53 (landscape) |
| Article list thumbnail | `cover` | `0px` | ~1.07 (near-square) |
| Daily briefing thumbnail | `contain` | `0px` | ~1.51 (landscape) |
| Source logo (article page) | `cover` | `9999px` (circle) | 1:1 (40px x 40px) |

### 7.10 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-2xs` | `0 1px #0000000d` | Subtle elevation |
| `--shadow-xs` | `0 1px 2px 0 #0000000d` | Light elevation |
| `--shadow-sm` | `0 1px 3px 0 #0000001a, 0 1px 2px -1px #0000001a` | Card-like elevation |
| `--shadow-md` | `0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a` | Medium elevation |
| `--shadow-xl` | `0 20px 25px -5px #0000001a, 0 8px 10px -6px #0000001a` | Large elevation |
| `--shadow-2xl` | `0 25px 50px -12px #00000040` | Maximum elevation |

**Note:** Most cards on Ground News use **no box-shadow** (`none`). They rely on borders for visual separation.

---

## 8. Dark Mode

### Theme Toggle Mechanism
- Toggled via `.dark` class on `<html>` element
- User selects Light / Dark / Auto from the utility bar
- Auto follows system `prefers-color-scheme`

### Key Color Changes (Light to Dark)

| Element | Light | Dark |
|---------|-------|------|
| Page background | `rgb(238, 239, 233)` #EEEFE9 | `rgb(38, 38, 38)` #262626 |
| Primary text | `rgb(38, 38, 38)` #262626 | `rgb(238, 239, 233)` #EEEFE9 |
| Card background | `rgb(255, 255, 255)` #FFFFFF | `rgb(38, 38, 38)` #262626 |
| Card border | `rgb(218, 219, 214)` #DADBD6 | `rgb(57, 57, 56)` #393938 |
| Topic pills bg | `rgb(218, 219, 214)` #DADBD6 | `rgb(57, 57, 56)` #393938 |
| Nav/header bg | `rgb(238, 239, 233)` #EEEFE9 | `rgb(38, 38, 38)` #262626 |
| Subscribe button bg | `rgb(38, 38, 38)` | `rgb(38, 38, 38)` (same) |
| Subscribe button text | `rgb(238, 239, 233)` | `rgb(238, 239, 233)` (same) |
| My Account btn border | `rgb(38, 38, 38)` | `rgb(238, 239, 233)` (inverted) |
| My Account btn text | `rgb(38, 38, 38)` | `rgb(238, 239, 233)` (inverted) |
| Footer | `rgb(38, 38, 38)` | `rgb(38, 38, 38)` (same dark) |
| Focus/CTA banner | `rgb(209, 189, 145)` | `rgb(209, 189, 145)` (same gold) |

### Colors that do NOT change between themes:
- Bias bar colors (Left red `#802727`, Right blue `#204986`, Center white)
- Blindspot badge colors
- Footer background and text
- CTA/promotional banner (gold `#D1BD91`)
- `ground-green` (`#57912B`) for Original Reporting
- Factuality bar colors (gray scale remains the same)
- Tint colors for source grid columns

---

## 9. Complete Color Reference Table

### All Unique Background Colors (Light Mode)

| Color | Hex | Usage |
|-------|-----|-------|
| `rgb(238, 239, 233)` | `#EEEFE9` | Page body background |
| `rgb(209, 189, 145)` | `#D1BD91` | CTA/promotional banner |
| `rgb(38, 38, 38)` | `#262626` | Primary dark bg (buttons, footer, nav in dark) |
| `rgb(218, 219, 214)` | `#DADBD6` | Tertiary light (topic pills, card borders) |
| `rgb(255, 255, 255)` | `#FFFFFF` | Card backgrounds, Center bias bar |
| `rgb(128, 39, 39)` | `#802727` | Left bias (dark red) |
| `rgb(32, 73, 134)` | `#204986` | Right bias (dark navy) |
| `rgba(38, 38, 38, 0.3)` | -- | Image overlay (info button bg) |
| `rgb(57, 57, 56)` | `#393938` | Dark-light (dark mode pills/borders) |
| `rgb(250, 249, 245)` | `#FAF9F5` | Very pale warm white |
| `rgba(31, 30, 29, 0.15)` | -- | Subtle overlay |
| `rgb(48, 48, 46)` | `#30302E` | Darker variant |

### All Unique Background Colors (Dark Mode additions)

| Color | Hex | Usage |
|-------|-----|-------|
| `rgba(7, 7, 7, 0.45)` | -- | Dark overlay |

### All Unique Text Colors

| Color | Hex | Usage |
|-------|-----|-------|
| `rgb(0, 0, 0)` | `#000000` | Pure black (rare) |
| `rgb(38, 38, 38)` | `#262626` | Primary text (light mode) |
| `rgb(238, 239, 233)` | `#EEEFE9` | Primary text (dark mode), bias bar light text |
| `rgb(87, 145, 43)` | `#57912B` | Green text (Original Reporting) |
| `rgb(106, 112, 120)` | `#6A7078` | Muted metadata text |
| `rgb(20, 20, 19)` | `#141413` | Near-black text |
| `rgb(250, 249, 245)` | `#FAF9F5` | Lightest text |
| `rgb(15, 15, 15)` | `#0F0F0F` | Near-black text (dark mode variant) |
| `rgb(255, 255, 255)` | `#FFFFFF` | Pure white text (dark mode) |

### Transition/Animation Tokens

| Token | Value |
|-------|-------|
| `--fade-transition-time` | `700ms` |
| `--slide-transition-time` | `400ms` |

---

## Appendix: CSS Class Name Conventions

Ground News uses a hybrid approach:

1. **Tailwind v4 utilities** - Standard Tailwind classes (`flex`, `grid`, `p-4`, etc.)
2. **Custom utilities via @theme/@utility** - Pixel-based text sizes (`text-12`), custom border-radius (`rounded-lg-s`), custom spacing (`px-margindesktop`)
3. **Custom color utilities** - `bg-ground-*`, `text-ground-*`, `border-ground-*`, `bg-tint-*`, `bg-factuality-*`, `bg-tertiary-*`, `bg-secondary-neutral`
4. **Dark mode** - `dark:` prefix variants (`dark:bg-dark-primary`, `dark:text-light-primary`)
5. **Responsive prefixes** - `tablet:`, `desktop:`, `lgx:`, `charlie:`, `widescreen:`
6. **CSS Modules** - Component-scoped styles with hashed class names (`article-module__Tnqyaa__widget-background-div`)
7. **Arbitrary values** - Tailwind JIT syntax (`bg-[rgba(38,38,38,0.3)]`, `p-[1.3rem]`, `w-[5rem]`)
