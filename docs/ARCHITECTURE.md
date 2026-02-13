# Architecture

## 1. System Overview

OpenGroundNews is a Next.js App Router application backed by PostgreSQL (Prisma), with a Browser Use Cloud + Playwright ingestion pipeline and archive-first reader fallback.

Core layers:
- Web UI and server components (`app/`, `components/`)
- API route handlers (`app/api/`)
- Domain/data services (`lib/`)
- Ingestion and archive automation (`scripts/`)
- Persistence (`prisma/schema.prisma`)

## 2. Runtime Composition

### Frontend runtime
- Root shell: `app/layout.tsx`
- Global styles/tokens: `app/globals.css`, `app/styles/tokens.css`
- Shared nav/chrome: `components/TopNav.tsx`, `components/TopNavClient.tsx`, `components/MobileBottomNav.tsx`, `components/SiteFooter.tsx`
- Primary page model: server-rendered pages with client components for interaction-heavy surfaces

### Data runtime
- DB client bootstrapping: `lib/db.ts`
- Store facade (DB-backed): `lib/store.ts` -> `lib/dbStore.ts`
- Story shaping + parity enrichment: `lib/dbStore.ts`, `lib/format.ts`, `lib/topics.ts`, `lib/lookup.ts`
- Search scoring and fallback: `lib/search.ts`

### Auth/session runtime
- Auth persistence + session logic: `lib/dbAuth.ts`
- Session cookie options: `lib/authCookies.ts`
- NextAuth provider configuration: `lib/authOptions.ts`
- Current-user resolution used across pages/APIs: `lib/authStore.ts` (re-exported from `dbAuth`)

## 3. Data Model

Defined in `prisma/schema.prisma`.

### Core content entities
- `Story`
- `SourceArticle`
- `Outlet`
- `StoryTag`
- `StorySnapshot`
- `StoryTimelineEvent`
- `StoryPodcastReference`
- `StoryReaderLink`
- `StoryRelatedStory`
- `StoryGeo`

### User/account entities
- `User`
- `Session`
- `OAuthAccount`
- `PasswordResetToken`
- `UserPrefs`
- `Follow`
- `SavedStory`
- `ReadingEvent`
- `CustomFeed`
- `Feedback`

### Operations/infra entities
- `ArchiveEntry`
- `IngestionRun`
- `PushSubscription`
- `NewsletterSignup`
- `DigestJob`
- `DigestDelivery`
- `ApiRateLimitCounter`

### Outlet intelligence entities
- `OutletOwnershipEntity`
- `OutletOwnershipEdge`

## 4. Request And Data Flow

### Feed/story read flow
1. Page/API calls store functions from `lib/store.ts`.
2. `lib/dbStore.ts` queries Prisma, applies filters, dedupe, and normalization.
3. Responses include bias, source metadata, and parity fields (read time/freshness where applicable).

### Story detail flow
1. `/story/[slug]` calls `getStoryBySlug`.
2. Detail include graph returns timeline, snapshots, podcasts, reader links, related stories, and geo.
3. UI modules (`SourceCoveragePanel`, `FactualityPanel`, `OwnershipPanel`, etc.) render from normalized story shape.

### Reader (archive-first) flow
1. Client posts URL to `/api/reader` (auth required) or `/api/archive/read` (API key path).
2. `readArchiveForUrl` in `lib/archive.ts` checks archive cache first (`ArchiveEntry`).
3. It calls `scripts/archive_extract_cdp.mjs` for Browser Use remote CDP archive retrieval.
4. On blocked/not_found/error or circuit-open state, it falls back to direct HTML extraction via `cheerio`.
5. Final entry is persisted back to DB archive cache.

## 5. Ingestion Pipeline Architecture

### Pipeline entry
- `scripts/ingest_groundnews.mjs` -> `scripts/pipeline/index.mjs`

### Orchestration
- Retry and checkpoint wrapper: `scripts/pipeline/index.mjs`
- Checkpoint storage: `scripts/pipeline/checkpoint/index.mjs`
- Core ingestion: `scripts/sync_groundnews_pipeline.mjs`

### Scrape/discover
- Ground News scrape worker: `scripts/groundnews_scrape_cdp.mjs`
- Browser session lifecycle + rotation: `scripts/lib/browser_use_cdp.mjs`

### Persistence/enrichment
- Story/outlet upserts: `scripts/lib/gn/persist_db.mjs`
- Outlet profile enrichment (catalog + profile scraping fallbacks): `scripts/lib/gn/outlet_enrichment.mjs`
- Additional outlet enrichment pass: `scripts/enrich_outlets_from_store.mjs`

### Operational metadata
- Ingestion run records persisted in `IngestionRun`
- Output artifacts under `output/browser_use/`

## 6. API Surface Topology

- Product APIs: `/api/*`
- Parity APIs: `/api/v1/*`
- Auth and session APIs combine custom cookie auth with NextAuth OAuth synchronization
- Mutating/user endpoints are generally `ogn_session` protected
- Operational endpoints (ingest/archive/digest/send-daily) are API-key protected, with admin checks where required

Full endpoint contract details: `docs/API.md`

## 7. Caching And Reliability

### Cache layers
- In-memory store cache in `lib/dbStore.ts` (`OGN_STORE_CACHE_TTL_MS`)
- Archive entry DB cache (`ArchiveEntry`)
- Image cache stack: local file cache + optional R2 (`lib/media/imageProxy.ts`, `lib/media/objectStore.ts`)

### Rate limiting
- `lib/infra/rateLimit.ts`
- Uses Upstash Redis when configured, with in-memory fallback
- Applied to story and image proxy endpoints

### Circuit breaking
- Archive reader path uses `lib/infra/circuitBreaker.ts` to reduce repeated hard failures

## 8. Notification Architecture

### Newsletter
- Signup persistence: `NewsletterSignup`
- Digest send endpoint: `app/api/newsletter/digest/route.ts`
- Delivery provider: Resend (`RESEND_API_KEY`)

### Web Push
- Subscription lifecycle: `/api/push/subscribe`, `/api/push/unsubscribe`
- Admin testing: `/api/push/test`
- Batch daily sends: `/api/push/send-daily`
- Delivery layer: `lib/push.ts` with VAPID keys

## 9. Security Model (Practical)

- API key gate for sensitive automation endpoints (`lib/security.ts`)
- Session cookies are HTTP-only and same-site lax (`sessionCookieOptions`)
- External URL validation for SSRF-resistant archive/image paths (`validateExternalUrl`)
- Origin checks in OAuth sync endpoint
- Server error sanitization before returning failures to clients

## 10. Extension Surface

`extension/` contains a Manifest V3 browser extension that:
- Opens current tab URL in OpenGroundNews Reader
- Opens search for current URL
- Supports configurable base app URL in extension options

It is standalone and communicates via opening app URLs, not direct privileged backend access.
