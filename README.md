# OpenGroundNews

OpenGroundNews is an open-source, perspective-aware news platform inspired by Ground News style workflows, implemented as a full Next.js + Postgres application with its own ingestion, reader, and notification pipelines.

This repository includes:
- A production-style web app (`app/`, `components/`)
- A DB-backed domain layer (Prisma + Postgres)
- Browser Use + Playwright CDP ingestion and archive tooling
- Authenticated personalization (follows, saves, reading events, custom feeds)
- Newsletter digest + web push delivery
- A browser extension that opens current pages inside OpenGroundNews workflows

## Product Snapshot

### Public surfaces
- Home feed: `/`
- Story detail: `/story/[slug]`
- Topic hubs: `/interest/[slug]`
- Source hubs: `/source/[slug]`
- Blindspot feed: `/blindspot`
- Search: `/search`
- Compare, Calendar, Maps: `/compare`, `/calendar`, `/maps`
- Newsletters: `/newsletters` and `/newsletters/*`
- About/help/legal pages: `/about`, `/help`, `/privacy`, `/terms`, `/rating-system`, `/blog`, `/testimonials`

### Authenticated surfaces
- Reader: `/reader` (archive-first article retrieval)
- Personalized area: `/my`, `/my/discover`, `/my/saved`, `/my/custom-feeds`, `/my/citations`, `/my/manage`
- Bias dashboard: `/my-news-bias`
- Admin: `/admin` (admin role required)

### Auth pages
- `/login`
- `/signup` (UI exists; password sign-up API is intentionally disabled)
- `/forgot-password`
- `/reset-password`
- `/auth/oauth-complete`

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- NextAuth (Google OAuth, when configured) + custom `ogn_session` cookie sessions
- Browser Use Cloud API + Playwright CDP
- Resend (digest emails)
- `web-push` (browser push notifications)
- Optional Upstash Redis-backed rate limiting (memory fallback available)
- Optional Cloudflare R2 object/image cache layer

## Repository Layout

- `app/`: App Router pages + API route handlers
- `components/`: UI modules and client interactions
- `lib/`: data services, auth, archive, search, media proxy, infra utilities
- `prisma/`: schema and migrations
- `scripts/`: ingestion/archive/parity/ops scripts
- `extension/`: MV3 browser extension
- `docs/`: architecture, API, operations, rotation, design-system docs

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and set, at minimum:
- `DATABASE_URL`
- `BROWSER_USE_API_KEY`
- `OGN_API_KEY` (or `OPEN_GROUND_NEWS_API_KEY`)

### 3. Start the app

Recommended (managed local runtime):

```bash
./restart.sh dev
```

`restart.sh` will:
- load `.env` and `.env.local`
- auto-provision local Postgres in dev if `DATABASE_URL` is missing
- run Prisma generate + deploy
- clean stale Next.js locks and old listeners

Alternative:

```bash
npm run dev
```

### 4. Open

- `http://localhost:3000`

## Command Reference

### Core runtime

```bash
npm run dev
npm run build
npm run start
```

### Database

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:studio
npm run db:import-json
```

### Ingestion and archive

```bash
npm run ingest:groundnews
npm run groundnews:scrape
npm run ingest:enrich-outlets
npm run archive:extract
npm run archive:verify
npm run browseruse:stop-active-browsers
```

### Notifications

```bash
npm run newsletter:digest
npm run push:vapid
```

### Parity tooling

```bash
npm run parity:checklist
npm run parity:smoke
npm run parity:baseline
npm run parity:visual-diff
npm run parity:gate
npm run parity:todo
```

### Tests

```bash
npm run test
npm run test:watch
```

## Ingestion Pipeline (High Level)

1. `scripts/ingest_groundnews.mjs` loads env and forwards CLI flags.
2. `scripts/pipeline/index.mjs` wraps ingestion with retries + checkpointing.
3. `scripts/sync_groundnews_pipeline.mjs` orchestrates scrape, route expansion, story enrichment, outlet enrichment, image repair, and DB persistence.
4. `scripts/lib/gn/persist_db.mjs` upserts stories/outlets/sources and parity modules into Postgres.
5. `IngestionRun` rows record operational metadata for admin/ops visibility.

For full operational controls and scheduler guidance, see `docs/OPERATIONS.md`.

## API Overview

This app exposes:
- Product APIs under `/api/*`
- Legacy/parity APIs under `/api/v1/*`

See `docs/API.md` for:
- endpoint-by-endpoint contracts
- auth gates
- request/response shapes
- side effects and external integrations

## Documentation Index

- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/OPERATIONS.md`
- `docs/ROTATION_STRATEGIES.md`
- `docs/GROUND_NEWS_CSS_DESIGN_SYSTEM.md`

## Notes For Contributors

- Code is the source of truth when docs drift.
- This project intentionally uses a hybrid auth model (`ogn_session` + NextAuth OAuth bridge).
- `/api/auth/signup` returns `410` by design; use OAuth in current flow.
- Node scripts rely on `scripts/lib/load_env.mjs` so `.env.local` values are available even outside Next.js runtime.
