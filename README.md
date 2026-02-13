# OpenGroundNews

OpenGroundNews is an open-source, perspective-aware news aggregation app inspired by Ground News style workflows, with its own product surface, ingestion pipeline, and API stack.

The codebase now runs as a full Next.js + Postgres platform with:
- Server-rendered feeds, topic/source hubs, and story detail pages
- Authenticated reader mode with archive-first retrieval + fallback extraction
- Personalized follows, saved stories, reading analytics, and custom feeds
- Browser Use Cloud + Playwright CDP ingestion pipeline
- Newsletter digest and Web Push delivery pipelines
- Parity-focused `v1` API endpoints for compare/calendar/maps/my-bias modules

## What Is In This Repo

- App: Next.js App Router (`app/`, `components/`)
- Data + auth layer: Prisma/Postgres (`prisma/`, `lib/db*.ts`, `lib/auth*.ts`)
- Ingestion + archive tooling: Node scripts (`scripts/*.mjs`)
- Browser extension: MV3 helper (`extension/`)
- Operational docs + API contracts (`docs/`)

## Current Product Surfaces

### Public pages
- `/` home feed
- `/blindspot`
- `/interest/[slug]`
- `/source/[slug]`
- `/story/[slug]`
- `/search`
- `/compare`
- `/calendar`
- `/maps`
- `/newsletters`
- `/about`, `/help`, `/privacy`, `/terms`, `/rating-system`, `/blog`, `/testimonials`

### Authenticated pages
- `/my`
- `/my/discover`
- `/my/saved`
- `/my/custom-feeds`
- `/my/citations`
- `/my/manage`
- `/my-news-bias`
- `/reader`
- `/admin` (admin role required)

### Auth routes
- `/login`
- `/signup` (UI exists, but password sign-up API is intentionally disabled)
- `/forgot-password`
- `/reset-password`
- `/auth/oauth-complete`

## Tech Stack

- Next.js 16 + React 19
- TypeScript + App Router
- Prisma + PostgreSQL (`@prisma/adapter-pg`)
- NextAuth (Google OAuth when configured) + custom cookie session model
- Browser Use Cloud API + Playwright CDP for scraping/archive retrieval
- Resend for digest email sending
- Web Push (`web-push`) with VAPID keys
- Optional Upstash Redis-backed rate limiting (falls back to in-memory)
- Optional Cloudflare R2 image/object storage cache

## Quick Start

### 1) Install

```bash
npm install
```

### 2) Configure env

Copy `.env.example` to `.env.local` and set the minimum required keys:

- `DATABASE_URL`
- `BROWSER_USE_API_KEY`
- `OGN_API_KEY` (or `OPEN_GROUND_NEWS_API_KEY`)

### 3) Start app

Fast path:

```bash
npm run dev
```

Or use the managed launcher (recommended in local dev):

```bash
./restart.sh dev
```

`restart.sh` can auto-provision a local Postgres cluster when `DATABASE_URL` is not already set.

### 4) Open

- [http://localhost:3000](http://localhost:3000)

## Build And Test

```bash
npm run build
npm run start
npm run test
```

## Script Reference

### Core runtime

- `npm run dev` - start Next.js dev server
- `npm run build` - build production bundle
- `npm run start` - run production server

### Database

- `npm run db:generate` - prisma generate
- `npm run db:migrate` - prisma migrate dev
- `npm run db:deploy` - prisma migrate deploy
- `npm run db:studio` - prisma studio
- `npm run db:import-json` - import JSON store into DB

### Ingestion + archive

- `npm run groundnews:scrape` - scrape Ground News routes via Browser Use CDP
- `npm run ingest:groundnews` - full pipeline runner with retries/checkpoint
- `npm run ingest:enrich-outlets` - backfill/enrich outlet metadata
- `npm run archive:extract` - single archive-first extraction
- `npm run archive:verify` - batch archive verification

### Notifications

- `npm run newsletter:digest` - trigger digest endpoint locally
- `npm run push:vapid` - generate VAPID keys

### Parity toolchain

- `npm run parity:checklist`
- `npm run parity:smoke`
- `npm run parity:baseline`
- `npm run parity:visual-diff`
- `npm run parity:gate`
- `npm run parity:todo`

## Environment Variables

See `.env.example` for the canonical template. Key groups:

### Required
- `DATABASE_URL`
- `BROWSER_USE_API_KEY`
- `OGN_API_KEY` or `OPEN_GROUND_NEWS_API_KEY`

### Auth
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (or `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`)
- `NEXTAUTH_URL`
- `OGN_ADMIN_EMAILS`

### Ingestion/rotation
- `BROWSER_USE_PROFILE_ID` / `BROWSER_USE_PROFILE_IDS`
- `BROWSER_USE_PROXY_COUNTRY_CODE` / `BROWSER_USE_PROXY_COUNTRY_CODES`
- `BROWSER_USE_EDITION_PROXY_MAP`
- `BROWSER_USE_ROTATION_MODE`
- `BROWSER_USE_ROTATION_STATE_FILE`
- `BROWSER_USE_CREATE_RETRIES`
- `BROWSER_USE_TIMEOUT_MINUTES`
- `OGN_PIPELINE_*` (attempts, retry, route expansion, worker counts, checkpoint controls)

### API/rate/image tuning
- `API_STORIES_RATE_LIMIT`, `API_STORIES_RATE_WINDOW_SEC`
- `IMAGE_PROXY_RATE_LIMIT`, `IMAGE_PROXY_RATE_WINDOW_SEC`
- `IMAGE_PROXY_TTL_SEC`, `IMAGE_PROXY_TIMEOUT_MS`, `IMAGE_PROXY_MAX_BYTES`, `IMAGE_PROXY_FALLBACK_TTL_SEC`
- `STORY_STALE_AFTER_DAYS`

### Optional integrations
- `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`

## High-Level Data Flow

1. Scrape and discovery scripts collect story/source candidates from Ground News routes.
2. Pipeline enriches and normalizes stories/outlets, then upserts to Postgres.
3. App reads from DB-backed store adapters (`lib/dbStore.ts`) for pages and APIs.
4. Reader requests call archive-first extraction and persist archive cache entries.
5. Personalization APIs write follows/saved/reading/custom feed preferences.
6. Digest and push endpoints fan out to subscribed users.

For full architecture details: `docs/ARCHITECTURE.md`

## API Overview

The app exposes both:
- Main app APIs under `/api/*`
- Parity APIs under `/api/v1/*`

Full route reference, auth requirements, params, and side effects:
- `docs/API.md`

## Operations

- Local/prod runbook, cron cadence, health checks, and incident flow:
  - `docs/OPERATIONS.md`
- Browser Use rotation and identity spread strategies:
  - `docs/ROTATION_STRATEGIES.md`

## Documentation Index

- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/OPERATIONS.md`
- `docs/ROTATION_STRATEGIES.md`
- `docs/GROUND_NEWS_CSS_DESIGN_SYSTEM.md`
- `docs/parity/EXCEPTIONS.md`
- `docs/parity/PARITY_TODO.md`
