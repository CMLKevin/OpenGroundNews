# OpenGroundNews CSS Design System

This document reflects the design system currently implemented in this repository.

Despite the historical filename, this is the OpenGroundNews design/token reference, sourced from:
- `app/styles/tokens.css`
- `app/globals.css`
- `app/layout.tsx` (font + theme boot)

## 1. Theme Model

Theme preference is applied using `data-theme` on `<html>`:
- `light`
- `dark`
- `auto`

Key behavior:
- SSR boot script sets `data-theme` early to avoid flash of wrong theme.
- Theme preference is persisted in cookie/local storage (`ogn_theme`).
- `auto` is handled in CSS/media query paths to avoid hydration mismatch.

## 2. Typography System

Font variables are loaded via Next font integration in `app/layout.tsx`:
- Sans: Bricolage Grotesque (`--font-brand-sans`)
- Serif: Newsreader (`--font-brand-serif`)

Primary CSS variables:
- `--font-sans`
- `--font-serif`

Title scale tokens (from `app/styles/tokens.css`):
- `--font-page-title-size`
- `--font-page-title-weight`
- `--font-section-title-size`
- `--font-section-title-weight`

## 3. Color Tokens

### Base semantic palette (`:root` in `app/globals.css`)
- `--bg`, `--bg-soft`, `--bg-panel`
- `--ink`, `--ink-soft`, `--ink-muted`
- `--brand`, `--brand-2`
- `--line`, `--line-strong`
- `--success`, `--warning`

### Bias scale (`app/styles/tokens.css`)
- `--bias-far-left`
- `--bias-left`
- `--bias-lean-left`
- `--bias-center`
- `--bias-lean-right`
- `--bias-right`
- `--bias-far-right`

Mapped convenience aliases in `app/globals.css`:
- `--left`
- `--center`
- `--right`

### Dark theme overrides
Defined under `html[data-theme="dark"]` in both token files:
- Base backgrounds and text palette
- Panel border/line colors
- Shadow token (`--shadow-soft`)
- Halftone texture intensity
- Bias center tint override

## 4. Texture And Surface Language

A halftone print texture is a first-class part of visual identity.

Core texture tokens:
- `--ht-color`, `--ht-color-accent`, `--ht-color-brand`
- `--ht-dot`, `--ht-gap`
- `--ht-dot-sm`, `--ht-gap-sm`
- `--ht-dot-lg`, `--ht-gap-lg`

The texture is applied globally (`body::after`) and reused on key panel variants.

## 5. Layout Tokens And Shell Patterns

Layout variables:
- `--layout-gap`
- `--sticky-offset`
- `--card-bg`

Primary shell classes:
- `.home-hero-grid`
- `.feed-shell`
- `.story-shell`
- `.sticky-rail`
- `.panel`

Shared utility class namespace:
- `u-*` classes in `app/globals.css` for spacing, typography, flex/grid helpers

## 6. Component Primitives

Reusable visual primitives in CSS:
- Panels/cards: `.panel`
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-external`, `.btn-saved`
- Chips/pills: `.chip`, `.pill`, `.story-stat-pill`
- Section headers: `.section-title`
- Story typography: `.story-headline`, `.story-summary`, `.story-meta`

Bias/factuality-specific classes are used across cards and detail modules.

## 7. Responsive Strategy

Current stylesheet includes both max-width and min-width breakpoints.

Representative ranges present in `app/globals.css`:
- Max-width: `1280px`, `1120px`, `1000px`, `860px`, `780px`, `760px`, `640px`, `480px`
- Min-width: `48rem`, `72rem`, `75rem`

Mobile-specific chrome:
- `.mobile-bottom-nav` enabled at smaller breakpoints

Motion/accessibility:
- `prefers-reduced-motion` handling is implemented

## 8. Maps Styling

MapLibre styles are imported globally:
- `@import "maplibre-gl/dist/maplibre-gl.css"`

Map UI tokens inherit global typography and surface styling from theme variables.

## 9. Implementation Notes

- Favor existing tokens over hardcoded values in new CSS.
- Preserve `data-theme` flow and cookie persistence behavior.
- Keep new component variants compatible with both `light` and `dark` themes.
- Reuse `u-*` helpers when possible to avoid style drift.

## 10. Source References

- `app/layout.tsx`
- `app/styles/tokens.css`
- `app/globals.css`
- `components/TopNavClient.tsx` (theme switching behavior)
