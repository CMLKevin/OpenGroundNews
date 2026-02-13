# Operations Runbook

## 1. Runtime Requirements

Required:
- Node.js (modern LTS)
- npm
- PostgreSQL
- Browser Use API key for ingestion/archive automation

Optional integrations:
- Resend (newsletter digest delivery)
- VAPID keys (`web-push`)
- Upstash Redis (distributed rate limiting)
- Cloudflare R2 (durable image/object cache)

## 2. Environment Setup

Use `.env.example` as baseline and set values in `.env.local`.

### 2.1 Minimum required for full app + ingestion
- `DATABASE_URL`
- `BROWSER_USE_API_KEY`
- `OGN_API_KEY` (or `OPEN_GROUND_NEWS_API_KEY`)

### 2.2 Auth and session
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (or `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`)
- `NEXTAUTH_URL`
- `OGN_ADMIN_EMAILS` (or `OGN_ADMIN_EMAIL`)

### 2.3 Newsletter and push
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NEXT_PUBLIC_SITE_URL`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### 2.4 Rate limit and image proxy tuning
- `API_STORIES_RATE_LIMIT`
- `API_STORIES_RATE_WINDOW_SEC`
- `IMAGE_PROXY_RATE_LIMIT`
- `IMAGE_PROXY_RATE_WINDOW_SEC`
- `IMAGE_PROXY_TTL_SEC`
- `IMAGE_PROXY_TIMEOUT_MS`
- `IMAGE_PROXY_MAX_BYTES`
- `IMAGE_PROXY_FALLBACK_TTL_SEC`

### 2.5 Optional distributed/remote storage
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

### 2.6 Ingestion and pipeline controls
- `OGN_PIPELINE_MAX_ATTEMPTS`
- `OGN_PIPELINE_RETRY_DELAY_MS`
- `OGN_PIPELINE_CHECKPOINT`
- `OGN_PIPELINE_EDITIONS`
- `OGN_PIPELINE_STORY_WORKERS`
- `OGN_PIPELINE_SOURCE_FETCH_CONCURRENCY`
- `OGN_PIPELINE_SCROLL_PASSES`
- `OGN_PIPELINE_FRONTPAGE_SCROLL_PASSES`
- `OGN_PIPELINE_ROUTE_EXPANSION`
- `OGN_PIPELINE_MAX_DISCOVERED_ROUTES`
- `OGN_PIPELINE_MAX_TOPIC_ROUTES`
- `OGN_PIPELINE_MAX_LINKS_PER_ROUTE`
- `OGN_PIPELINE_OUTLET_ENRICHMENT`
- `OGN_PIPELINE_OUTLET_ENRICH_TIMEOUT_MS`
- `OGN_PIPELINE_WRITE_JSON`

## 3. Starting the Application

### Preferred local flow

```bash
npm install
./restart.sh dev
```

`restart.sh` behavior:
- loads `.env` and `.env.local`
- auto-provisions local Postgres in dev when `DATABASE_URL` is absent
- runs `db:generate` and `db:deploy`
- clears stale Next.js locks/listeners
- starts app with pid/log tracking in `.run/`

### Manual local flow

```bash
npm run dev
```

### Production runtime

```bash
npm run build
PORT=3000 ./restart.sh prod
```

## 4. Database Operations

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:studio
```

Data bootstrap/import utility:

```bash
npm run db:import-json
```

## 5. Ingestion and Archive Operations

### Full ingestion

```bash
npm run ingest:groundnews
```

Common override flags:

```bash
npm run ingest:groundnews -- --verbose --no-article-audit --source-fetch-concurrency 20
npm run ingest:groundnews -- --frontpage-only --editions international,us,uk
npm run ingest:groundnews -- --repair-images-only --repair-image-limit 200
```

### Scrape-only run

```bash
npm run groundnews:scrape -- --routes /,/blindspot,/my,/search
```

### Archive single URL verification

```bash
npm run archive:extract -- --url https://example.com/article
```

### Archive batch verification

```bash
npm run archive:verify -- --urls-file output/browser_use/archive_tests/test_urls.txt
```

### Recover from Browser Use concurrent-session saturation

```bash
npm run browseruse:stop-active-browsers
```

### Outlet enrichment backfill

```bash
npm run ingest:enrich-outlets
```

## 6. Script Environment Loading

Important:
- Next.js runtime auto-loads `.env.local`
- Plain `node scripts/*.mjs` does not by default
- This repo solves that with `scripts/lib/load_env.mjs`, imported by operational scripts

Recommendation:
- Prefer npm scripts (or `restart.sh`) to avoid missing env at execution time

## 7. Notifications and Scheduled Jobs

### Newsletter digest
- Endpoint: `POST /api/newsletter/digest`
- Auth: API key
- Dependency: `RESEND_API_KEY`

Local trigger helper:

```bash
npm run newsletter:digest
```

### Web push daily send
- Endpoint: `POST /api/push/send-daily`
- Auth: API key
- Dependency: VAPID keys

### Generate VAPID keys

```bash
npm run push:vapid
```

## 8. Suggested Scheduler Cadence

Baseline recommendation:

1. Every 5-10 minutes
- `npm run ingest:groundnews`

2. Daily
- `npm run archive:verify` for sampled URLs

3. Daily digest window
- `POST /api/newsletter/digest` with API key

4. Daily push window
- `POST /api/push/send-daily` with API key

Use cron, CI runner, or another scheduler. Keep API keys in secret storage.

## 9. Health Checks

### App/API checks
- `/` renders with story content
- `GET /api/stories` returns data + rate-limit headers
- `GET /api/auth/me` resolves session state

### Ingestion checks
- New `IngestionRun` rows appear
- `uniqueStoryLinks` and `ingestedStories` are non-zero
- Output artifacts update under `output/browser_use/groundnews_cdp/`

### Reader/archive checks
- `POST /api/archive/read` returns `success`, `fallback`, or explicit error
- Reader route degrades gracefully when archive hosts are unavailable

### Push/digest checks
- `GET /api/push/public-key` returns key when configured
- Digest route returns delivery summary (`sent` + per-email statuses)

## 10. Troubleshooting Playbooks

### `DATABASE_URL is not set`
- Set `DATABASE_URL` in `.env.local`
- Or use `./restart.sh dev` to auto-provision local Postgres

### Ingestion route unauthorized
`/api/ingest/groundnews` needs both:
- valid API key header
- admin `ogn_session` cookie

### Browser session creation failures / 429s
- verify `BROWSER_USE_API_KEY`
- reduce session concurrency
- tune retries/timeouts
- rotate profile/proxy pools (`ROTATION_STRATEGIES.md`)
- stop stale active sessions (`browseruse:stop-active-browsers`)

### Digest failures
- verify `RESEND_API_KEY`
- verify `EMAIL_FROM`
- verify API key header for digest endpoint

### Push failures
- verify VAPID env vars
- re-subscribe client (`/api/push/subscribe`)
- inspect dead-endpoint pruning (`410/Gone`)

### Image proxy 429 or poor hit ratio
- tune `IMAGE_PROXY_*` values
- enable R2-backed cache to improve warm-cache durability

## 11. Operational Artifacts and Paths

- Ingestion outputs: `output/browser_use/groundnews_cdp/`
- Archive outputs: `output/browser_use/archive_cdp/`
- Pipeline checkpoint: `output/browser_use/groundnews_cdp/checkpoint.json`
- Rotation state: `output/browser_use/rotation_state.json`
- Image cache: `output/cache/images/`
- Restart logs and pid files: `.run/`

## 12. Security and Secrets Guidance

- Keep `OGN_API_KEY` in secrets manager or CI secret storage
- Never commit `.env.local`
- Use least-privilege DB credentials for production
- Rotate Browser Use and email/push credentials periodically
