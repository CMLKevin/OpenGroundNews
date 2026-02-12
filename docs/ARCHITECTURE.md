# Architecture

## Overview
OpenGroundNews is a Next.js application backed by Postgres (Prisma) and remote-browser ingestion scripts.

## Core Components
1. Web app (`app/` + `components/`)
2. Data/store layer (`lib/store.ts` -> Prisma-backed)
3. Archive reader service (`lib/archive.ts`, cached in DB)
4. Browser Use CDP integration (`scripts/lib/browser_use_cdp.mjs`)
5. Ingestion scripts (`scripts/*.mjs`)

## Data Flow
1. `groundnews_scrape_cdp.mjs` discovers story URLs from Ground News routes.
2. `sync_groundnews_pipeline.mjs` enriches stories and persists to Postgres via Prisma.
3. UI routes fetch from APIs and render perspective-aware cards/details.
4. On source click, `/api/archive/read` attempts archive-first extraction.
5. If archive retrieval is blocked/unavailable, fallback extraction parses source HTML directly.

## Runtime Contracts
- Browser session creation: Browser Use `/api/v2/browsers`
- Browser driving: Playwright `chromium.connectOverCDP(session.cdpUrl)`
- Store shape: stories + archive cache + ingestion stats

## Reliability Model
- Ingestion interval target: 5-10 minutes
- Cache reads first for archive entries
- Fallback extraction prevents reader hard-fail on archive blocks
- Rotation-capable browser session config reduces repetitive browser fingerprint patterns
