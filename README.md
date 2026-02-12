# OpenGroundNews

OpenGroundNews is a full open-source, perspective-aware news aggregation web app inspired by products like Ground News, but built with independent branding, open code, and resilient ingestion pipelines.

It provides:
- Multi-source story aggregation with bias distribution views
- Blindspot and local feed surfaces
- Story detail pages with source-level filtering and perspective tabs
- Archive-first reader mode with automatic fallback extraction
- Remote-browser ingestion via Browser Use Cloud browser sessions + Playwright CDP (no Browser Use task runner dependency)

## Table of Contents
1. Project status
2. Core features
3. Architecture
4. Quick start
5. Configuration
6. Rotation strategies (profiles/regions)
7. Scripts
8. API endpoints
9. Data layout
10. Operations and scheduling
11. Safety/legal notes
12. Documentation index

## 1) Project Status
- Framework: Next.js App Router
- Runtime: Node.js + TypeScript
- Storage: Postgres + Prisma (required for app runtime + ingestion)
- Browser automation: Playwright Core connected to Browser Use Cloud CDP sessions
- Current state: fully runnable web app + ingestion + archive fallback flow

## 2) Core Features
- Home feed with lead story, story cards, bias bars, topic chips, and right rail modules
- Blindspot feed (`/blindspot`)
- Local feed (`/local`)
- Story detail view (`/story/[slug]`) with source coverage panel
- Ratings explainer (`/rating-system`)
- Subscribe/info surface (`/subscribe`)
- Admin panel (`/admin`) with ingestion controls and status
- Notifications setup (`/notifications`) via Web Push (requires VAPID keys)
- Browser extension surface (`/extension`) + MV3 extension in `extension/`
- Archive-first reader page (`/reader`) (requires sign-in)
- JSON APIs for stories, story detail, archive-read, and ingestion trigger

## 3) Architecture
High-level flow:
1. Browser Use Cloud creates remote browser sessions
2. Playwright CDP scripts scrape Ground News routes and discover story links
3. Ingestion script enriches stories and upserts normalized data into Postgres
4. App server renders feeds/details from the database
5. Reader API tries archive hosts first; if blocked/unavailable, falls back to direct extraction

See full details in docs:
- `/Users/kevinlin/OpenGroundNews/docs/ARCHITECTURE.md`

## 4) Quick Start
```bash
cd /Users/kevinlin/OpenGroundNews
npm install
export BROWSER_USE_API_KEY="<your_browser_use_key>"
npm run dev
```

Open:
- [http://localhost:3000](http://localhost:3000)

Build + run production:
```bash
npm run build
npm run start
```

## 5) Configuration
### Required
- `BROWSER_USE_API_KEY`: Browser Use Cloud API key
- `OGN_API_KEY` (or `OPEN_GROUND_NEWS_API_KEY`): required for protected write APIs (`POST /api/ingest/groundnews`, `POST /api/archive/read`)
- `DATABASE_URL`: Postgres connection string for Prisma (required for app runtime + ingestion)

### Optional (notifications)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: enables Web Push notifications
  - Generate keys: `npm run push:vapid`

### Optional browser session controls
- `BROWSER_USE_TIMEOUT_MINUTES`: session timeout passed to Browser Use `/api/v2/browsers`
- `BROWSER_USE_PROFILE_ID`: single Browser Use profile UUID
- `BROWSER_USE_PROXY_COUNTRY_CODE`: single proxy country code (case-insensitive; normalized internally)

### Optional rotation controls
- `BROWSER_USE_PROFILE_IDS`: comma-separated profile UUID list
- `BROWSER_USE_PROXY_COUNTRY_CODES`: comma-separated country list
- `BROWSER_USE_ROTATION_MODE`: `round_robin` (default), `random`, or `sticky`
- `BROWSER_USE_ROTATION_STATE_FILE`: custom path for persisted round-robin counters

## 6) Rotation Strategies (Profiles/Regions)
OpenGroundNews now supports profile and region rotation directly in `scripts/lib/browser_use_cdp.mjs`.

### Modes
- `round_robin`:
  - Cycles through candidate profiles/regions
  - Persists counters to `output/browser_use/rotation_state.json` by default
- `random`:
  - Chooses random candidate per session
- `sticky`:
  - Deterministically picks candidate based on rotation key
  - Useful for stable host-specific behavior

### Script-specific rotation keys
- `groundnews_scrape_cdp.mjs`: `groundnews:<routes>`
- `archive_extract_cdp.mjs`: `archive-extract:<source-hostname>`
- `archive_verify_cdp.mjs`: `archive-verify-batch`

### Example: region round-robin
```bash
export BROWSER_USE_API_KEY="<key>"
export BROWSER_USE_ROTATION_MODE="round_robin"
export BROWSER_USE_PROXY_COUNTRY_CODES="US,CA,GB,DE"
npm run groundnews:scrape -- --routes /,/blindspot
```

### Example: sticky profile + region
```bash
export BROWSER_USE_API_KEY="<key>"
export BROWSER_USE_ROTATION_MODE="sticky"
export BROWSER_USE_PROFILE_IDS="<uuid1>,<uuid2>,<uuid3>"
export BROWSER_USE_PROXY_COUNTRY_CODES="US,GB"
npm run archive:extract -- --url https://example.com/news/article
```

### Notes
- Invalid profile IDs are ignored unless they are UUIDs.
- Rotation metadata is included in output JSON (`sessionRotation`, `sessionPayload`).
- Rotation reduces repeated-identical fingerprint patterns but does not guarantee challenge-free archive access.

## 7) Scripts
```bash
# Run Ground News scrape only
npm run groundnews:scrape -- --routes /,/blindspot,/my,/local

# Run ingestion pipeline (scrape + enrich + store update)
npm run ingest:groundnews

# Verify archive availability for multiple URLs
npm run archive:verify -- --urls-file output/browser_use/archive_tests/test_urls.txt

# Extract one URL via archive-first flow
npm run archive:extract -- --url https://example.com/news/story

# Restart the full app server (frontend + API routes in Next.js)
./restart.sh dev
# or
PORT=3001 ./restart.sh prod
```

## 8) API Endpoints
- `GET /api/stories`
  - Query params: `view`, `topic`, `limit`, `edition`, `location`
- `GET /api/stories/[slug]`
- `POST /api/archive/read`
  - Header: `x-ogn-api-key: <key>`
  - Body: `{ "url": "https://...", "force": true|false }`
- `POST /api/ingest/groundnews`
  - Header: `x-ogn-api-key: <key>`
- `POST /api/reader`
  - Session: requires `ogn_session`
  - Body: `{ "url": "https://...", "force": true|false }`
- `GET /api/push/public-key`
- `POST /api/push/subscribe` (session required; stores subscription)
- `POST /api/push/unsubscribe` (session required)

See detailed request/response notes in:
- `/Users/kevinlin/OpenGroundNews/docs/API.md`

## 9) Data Layout
- Primary store: Postgres (see `prisma/schema.prisma`)
- Runtime outputs: `/Users/kevinlin/OpenGroundNews/output/browser_use/`
- Main pipeline scripts:
  - `/Users/kevinlin/OpenGroundNews/scripts/groundnews_scrape_cdp.mjs`
  - `/Users/kevinlin/OpenGroundNews/scripts/sync_groundnews_pipeline.mjs`
  - `/Users/kevinlin/OpenGroundNews/scripts/archive_extract_cdp.mjs`
  - `/Users/kevinlin/OpenGroundNews/scripts/archive_verify_cdp.mjs`

## 10) Operations and Scheduling
Recommended cadence:
- Feed ingestion: every 5-10 minutes
- Archive cache refresh: on demand + optional nightly refresh
- Health checks: alert when scraper returns zero story links repeatedly

See:
- `/Users/kevinlin/OpenGroundNews/docs/OPERATIONS.md`

## 11) Safety and Legal Notes
- This project does not implement CAPTCHA bypass.
- Archive retrieval is opportunistic. If blocked, the app falls back to direct extraction.
- UI/functionality may be inspired by perspective-aware aggregators, but branding and implementation should remain distinct.
- Respect source website Terms and legal requirements in your deployment environment.

## 12) Documentation Index
- `/Users/kevinlin/OpenGroundNews/docs/README.md`
- `/Users/kevinlin/OpenGroundNews/docs/ARCHITECTURE.md`
- `/Users/kevinlin/OpenGroundNews/docs/API.md`
- `/Users/kevinlin/OpenGroundNews/docs/OPERATIONS.md`
- `/Users/kevinlin/OpenGroundNews/docs/ROTATION_STRATEGIES.md`

## Source References
- Browser Use Cloud API docs: [CLOUD.md](https://github.com/browser-use/browser-use/blob/main/CLOUD.md)
- Browser Use customization docs (stealth/CAPTCHA context): [Stealth & CAPTCHA](https://docs.browser-use.com/customize/usage/stealth)
- Ground News public pages:
  - [Homepage](https://ground.news/)
  - [Blindspot](https://ground.news/blindspot)
  - [Local](https://ground.news/local)
  - [Rating System](https://ground.news/rating-system)
  - [Subscribe](https://ground.news/subscribe)
