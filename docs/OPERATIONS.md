# Operations Runbook

## 1. Runtime Requirements

- Node.js (modern LTS recommended)
- npm
- PostgreSQL
- Browser Use Cloud account/API key for ingestion and archive automation

Optional but supported:
- Resend account for digest sends
- VAPID keys for Web Push
- Upstash Redis for distributed rate limiting
- Cloudflare R2 for object/image cache backing

## 2. Environment Setup

Use `.env.example` as baseline.

### Required to run full app + ingestion
- `DATABASE_URL`
- `BROWSER_USE_API_KEY`
- `OGN_API_KEY` (or `OPEN_GROUND_NEWS_API_KEY`)

### Common auth variables
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (or Google alias vars)
- `NEXTAUTH_URL`
- `OGN_ADMIN_EMAILS`

### Email + push
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NEXT_PUBLIC_SITE_URL`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Rate limit + proxy tuning
- `API_STORIES_RATE_LIMIT`
- `API_STORIES_RATE_WINDOW_SEC`
- `IMAGE_PROXY_RATE_LIMIT`
- `IMAGE_PROXY_RATE_WINDOW_SEC`
- `IMAGE_PROXY_TTL_SEC`
- `IMAGE_PROXY_TIMEOUT_MS`
- `IMAGE_PROXY_MAX_BYTES`
- `IMAGE_PROXY_FALLBACK_TTL_SEC`

### Optional distributed infra
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

### Pipeline controls (selected)
- `OGN_PIPELINE_MAX_ATTEMPTS`
- `OGN_PIPELINE_RETRY_DELAY_MS`
- `OGN_PIPELINE_CHECKPOINT`
- `OGN_PIPELINE_EDITIONS`
- `OGN_PIPELINE_STORY_WORKERS`
- `OGN_PIPELINE_SOURCE_FETCH_CONCURRENCY`
- `OGN_PIPELINE_ROUTE_EXPANSION`
- `OGN_PIPELINE_MAX_LINKS_PER_ROUTE`

## 3. Starting The App

### Option A: standard dev

```bash
npm install
npm run dev
```

### Option B: managed restart script (recommended)

```bash
./restart.sh dev
```

What `restart.sh` does:
- loads `.env` and `.env.local`
- auto-provisions local Postgres in dev if `DATABASE_URL` is missing
- runs `db:generate` and `db:deploy`
- restarts cleanly by stopping stale lock/port holders

Production mode:

```bash
PORT=3000 ./restart.sh prod
```

## 4. Database Operations

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:studio
```

If bootstrap importing from JSON is needed:

```bash
npm run db:import-json
```

## 5. Ingestion And Archive Jobs

### Manual ingestion run

```bash
npm run ingest:groundnews
```

### Scrape-only run

```bash
npm run groundnews:scrape -- --routes /,/blindspot,/my,/search
```

### Archive single URL check

```bash
npm run archive:extract -- --url https://example.com/article
```

### Archive batch verification

```bash
npm run archive:verify -- --urls-file output/browser_use/archive_tests/test_urls.txt
```

## 6. Recommended Scheduling

Suggested baseline cadence:

1. Every 5-10 minutes
- `npm run ingest:groundnews`

2. Every day (or as needed)
- `npm run archive:verify` for sampled high-traffic URLs

3. Daily digest send
- trigger `POST /api/newsletter/digest` with API key

4. Daily push send
- trigger `POST /api/push/send-daily` with API key

Use external scheduler (cron/GitHub Actions/CI runner) to invoke these commands or endpoints.

## 7. Health Checks

### App/API health
- Home page renders with story data
- `GET /api/stories` responds and includes rate-limit headers
- Auth session resolve works via `GET /api/auth/me`

### Ingestion health
- `IngestionRun` rows update regularly
- Non-zero `uniqueStoryLinks` and `ingestedStories`
- Output artifacts generated in `output/browser_use/groundnews_cdp/`

### Reader/archive health
- `POST /api/archive/read` returns `success` or usable `fallback`
- Archive failures do not hard-fail reader UX

### Notification health
- `GET /api/push/public-key` returns key (when configured)
- Digest route returns sent/failed counts

## 8. Troubleshooting

### `DATABASE_URL is not set`
- Define `DATABASE_URL` in `.env.local`, or run `./restart.sh dev` to auto-provision local Postgres.

### Browser session creation failures
- Verify `BROWSER_USE_API_KEY`
- Reduce session concurrency
- Increase `BROWSER_USE_CREATE_RETRIES`
- Adjust rotation profile/proxy pool (see `ROTATION_STRATEGIES.md`)

### Ingestion endpoint unauthorized
- Ensure both are present for `/api/ingest/groundnews`:
  - Valid API key header
  - Admin `ogn_session` cookie

### Push not working
- Confirm VAPID env vars exist
- Re-subscribe client via `/api/push/subscribe`
- Check for dead endpoint pruning on 410 responses

### Digest route failing
- Confirm `RESEND_API_KEY` and `EMAIL_FROM`
- Confirm API key auth header for `/api/newsletter/digest`

### Image proxy 429 spikes
- Increase `IMAGE_PROXY_RATE_LIMIT` / window settings as needed
- Consider enabling R2 cache for better hit ratio

## 9. Artifacts And Operational Paths

- Ingestion outputs: `output/browser_use/groundnews_cdp/`
- Archive outputs: `output/browser_use/archive_cdp/`
- Rotation state: `output/browser_use/rotation_state.json`
- Pipeline checkpoint: `output/browser_use/groundnews_cdp/checkpoint.json`
- Local run logs (restart script): `.run/`
