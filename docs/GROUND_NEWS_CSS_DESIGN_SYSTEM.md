# OpenGroundNews CSS Design System

This document describes the design system currently implemented in code.

Primary sources:
- `app/styles/tokens.css`
- `app/globals.css`
- `app/layout.tsx`
- `components/TopNavClient.tsx`

## 1. Theme and Preference Model

Theme state is attached to `<html data-theme="...">` and supports:
- `light`
- `dark`
- `auto`

Implementation details:
- SSR boot script in `app/layout.tsx` initializes `data-theme` early
- `TopNavClient` syncs theme preference via cookie/localStorage (`ogn_theme`)
- Dark token overrides are applied under `html[data-theme="dark"]`

## 2. Typography System

Fonts are loaded with Next font integration in `app/layout.tsx`:
- Sans: `Bricolage_Grotesque` (`--font-brand-sans`)
- Serif: `Newsreader` (`--font-brand-serif`)

Core typography variables:
- `--font-sans`
- `--font-serif`
- `--font-page-title-size`
- `--font-page-title-weight`
- `--font-section-title-size`
- `--font-section-title-weight`

## 3. Color and Semantic Tokens

Defined in `app/globals.css` and `app/styles/tokens.css`.

Core semantics:
- Background: `--bg`, `--bg-soft`, `--bg-panel`
- Text: `--ink`, `--ink-soft`, `--ink-muted`
- Brand: `--brand`, `--brand-2`
- Borders/lines: `--line`, `--line-strong`
- Status: `--success`, `--warning`

Bias colors:
- `--bias-far-left`, `--bias-left`, `--bias-lean-left`
- `--bias-center`, `--bias-lean-right`, `--bias-right`, `--bias-far-right`
- Convenience aliases: `--left`, `--center`, `--right`

## 4. Surface and Texture Language

The visual style uses a halftone paper texture as a first-class motif.

Halftone tokens:
- `--ht-color`, `--ht-color-accent`, `--ht-color-brand`
- `--ht-dot`, `--ht-gap`
- `--ht-dot-sm`, `--ht-gap-sm`
- `--ht-dot-lg`, `--ht-gap-lg`

Global application:
- `body::after` overlays a dotted texture layer

## 5. Layout and Shell Tokens

Layout variables:
- `--layout-gap`
- `--sticky-offset`
- `--card-bg`

Core shell patterns/classes:
- `.home-hero-grid`
- `.feed-shell`
- `.story-shell`
- `.panel`
- `.sticky-rail`

## 6. Utility and Primitive Classes

The stylesheet includes an extensive utility namespace (`u-*`) for:
- spacing
- typography sizing/weight
- flex/grid helpers
- table and overflow helpers

Reusable primitives include:
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-external`
- Pills/chips: `.pill`, `.chip`, `.story-stat-pill`
- Card/panel container: `.panel`
- Story text styles: `.story-headline`, `.story-summary`, `.story-meta`

## 7. Responsiveness and Motion

Responsive behavior includes multiple breakpoints (max and min width media queries).

Notable UX behavior:
- dedicated mobile bottom navigation (`.mobile-bottom-nav`)
- reduced-motion accommodations via `prefers-reduced-motion`

## 8. Map Styling

MapLibre styles are globally imported:
- `@import "maplibre-gl/dist/maplibre-gl.css"`

Maps inherit app typography/surface tokens so map UI matches primary shell styling.

## 9. Implementation Rules for Contributors

When adding or changing UI:
- prefer existing tokens/variables over hardcoded values
- keep both `light` and `dark` themes valid
- preserve `ogn_theme` cookie/localStorage sync behavior
- use existing utility classes where possible to reduce style drift
- keep components compatible with shared panel/button/chip primitives
