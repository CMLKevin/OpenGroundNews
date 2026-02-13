# API Reference

This document describes all route handlers under `app/api/**/route.ts`.

## Conventions

### Auth gates used below
- `Public`: no login required
- `Session`: valid `ogn_session` cookie required
- `Admin Session`: `ogn_session` user with role `admin`
- `API Key`: `x-ogn-api-key` or `Authorization: Bearer <key>` must match `OGN_API_KEY` or `OPEN_GROUND_NEWS_API_KEY`
- `NextAuth`: handled by NextAuth internal auth flow

### Response conventions
- Most endpoints return JSON with `ok: boolean`
- Some older endpoints return `{ error: ... }` without `ok`
- Some utility/auth flows intentionally return HTTP `200` even for soft failures (for UX/privacy reasons)

### Rate limit headers
Rate-limited endpoints include:
- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`

## 1. Content, Search, and Discovery

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/stories` | GET | Public | Story feed with filters and parity fields |
| `/api/stories/[slug]` | GET | Public | Story detail lookup |
| `/api/stories/batch` | POST | Public | Resolve up to 60 slugs |
| `/api/search` | GET | Public | Weighted story search with facets |
| `/api/search/suggest` | GET | Public | Search suggestions (stories/topics/outlets) |
| `/api/topics/trending` | GET | Public | Top trending topic tags |

### `GET /api/stories`
Query params:
- `topic`
- `view`: `all | blindspot | local | trending`
- `edition`
- `location`
- `q` (post-filter text search)
- `limit`

Behavior:
- IP rate-limited (`API_STORIES_RATE_LIMIT`, `API_STORIES_RATE_WINDOW_SEC`)
- Adds `readTimeMinutes` and `freshness`

### `GET /api/stories/[slug]`
- Returns one story
- Returns `404` when not found
- Adds computed `readTimeMinutes` and `freshness`

### `POST /api/stories/batch`
Body:
- `{ "slugs": string[] }`

Behavior:
- Dedupes and clamps to 60 entries
- Returns lightweight story records (`slug`, `title`)

### `GET /api/search`
Query params:
- `q` (required for non-empty results)
- `edition`
- `bias`: `all | left | center | right`
- `time`: `all | 24h | 7d | 30d`
- `limit` (1..200)

Returns:
- `stories`
- `facets.topics`
- `facets.outlets`

### `GET /api/search/suggest`
Query params:
- `q` (minimum length 2)

Returns:
- up to 8 story suggestions
- topic counts
- outlet suggestions

### `GET /api/topics/trending`
- Aggregates top tags from `StoryTag`

## 2. Reader, Archive, and Media

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/archive/read` | POST | API Key | API-key archive retrieval for external URL |
| `/api/reader` | POST | Session | Reader retrieval for logged-in users |
| `/api/images/proxy` | GET | Public | Safe image proxy with caching and fallback |

### `POST /api/archive/read`
Body:
- `{ "url": "https://...", "force": boolean }`

Behavior:
- URL validation blocks private/local/credentialed URLs
- Uses archive-first retrieval + fallback extraction
- Returns retry hints (`forceUsed`, `suggestedRetryAfterSec`)

### `POST /api/reader`
Body:
- `{ "url": "https://...", "force": boolean }`

Behavior:
- Same archive engine as `/api/archive/read`
- Requires `ogn_session`

### `GET /api/images/proxy`
Query params:
- `url` (required)
- `kind`: `logo | story | generic` (defaults to `generic`)

Behavior:
- IP rate-limited (`IMAGE_PROXY_RATE_LIMIT`, `IMAGE_PROXY_RATE_WINDOW_SEC`)
- Uses URL validation + host guardrails
- Multi-layer cache: local file + optional R2
- Fail-open SVG fallback for unavailable upstream image

Response headers include:
- `x-image-cache`
- `x-image-kind`
- `x-image-fallback`
- `x-image-fallback-reason` (when fallback used)

## 3. Authentication and Session

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Password login and `ogn_session` issuance |
| `/api/auth/logout` | POST | Public | Session destroy + cookie clears |
| `/api/auth/me` | GET | Public | Resolve current app user; bridges OAuth session |
| `/api/auth/signup` | POST | Public | Disabled endpoint (returns 410) |
| `/api/auth/forgot-password` | POST | Public | Request password reset token |
| `/api/auth/reset-password` | POST | Public | Redeem reset token |
| `/api/auth/oauth/sync` | POST | OAuth Session | Bridge NextAuth user into `ogn_session` |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth | NextAuth handler |

Important behavior:
- `signup` intentionally disabled with HTTP `410`
- `forgot-password` always returns safe response to avoid account enumeration
- OAuth sync requires same-origin check

## 4. Personalization and User State

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/follows` | GET | Session | Fetch follows |
| `/api/follows` | POST | Session | Toggle one follow |
| `/api/follows/batch` | POST | Session | Batch follow upsert |
| `/api/saved` | GET | Session | Saved stories (`include=stories` supported) |
| `/api/saved` | POST | Session | Toggle saved state by slug |
| `/api/reading-events` | POST | Session | Record read event with dedupe window |
| `/api/me/prefs` | GET | Session | Fetch user preferences |
| `/api/me/prefs` | POST | Session | Update preferences |
| `/api/me/bias` | GET | Session | Lightweight bias summary |
| `/api/custom-feeds` | GET | Session | List custom feeds |
| `/api/custom-feeds` | POST | Session | Create custom feed |
| `/api/custom-feeds/[id]` | PATCH | Session | Update feed |
| `/api/custom-feeds/[id]` | DELETE | Session | Delete feed |
| `/api/feedback` | POST | Public | Submit feedback (user/story linked when available) |

Key validations:
- `reading-events` dedupes same user/story within ~30 seconds
- `custom-feeds` creation requires name length >= 2
- `me/prefs` normalizes theme and numeric location values

## 5. Newsletter and Push

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/newsletter` | POST | Public | Create newsletter signup |
| `/api/newsletter` | GET | Public | Fetch subscriptions by email |
| `/api/newsletter/digest` | POST | API Key | Build/send digest emails via Resend |
| `/api/push/public-key` | GET | Public | Return VAPID public key |
| `/api/push/subscribe` | POST | Session | Register push subscription |
| `/api/push/unsubscribe` | POST | Session | Remove push subscription |
| `/api/push/test` | POST | Admin Session | Send test push |
| `/api/push/send-daily` | POST | API Key | Send daily push fanout |

Behavior notes:
- `newsletter/digest` requires `RESEND_API_KEY`
- Push routes require VAPID configuration
- Push send routes prune dead subscriptions on `410/Gone`

## 6. Utility Data APIs

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/geocode` | GET | Public | Location search via Open-Meteo geocoding |
| `/api/geolocate` | GET | Public | IP-based location with provider fallback |
| `/api/weather` | GET | Public | Current + daily forecast via Open-Meteo |

Notes:
- Utility APIs may return `ok: false` with HTTP `200` when upstream providers fail

## 7. Ingestion Trigger Endpoint

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/ingest/groundnews` | POST | API Key + Admin Session | Execute ingestion pipeline script |

Behavior:
- Requires both valid API key and admin `ogn_session`
- Runs `scripts/ingest_groundnews.mjs`
- Returns parsed pipeline summary or sanitized error

## 8. V1 / Legacy Parity APIs

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/v1/stories` | GET | Public | Legacy story feed with `version: "v1"` |
| `/api/v1/stories/[slug]` | GET | Public | Legacy detail modules |
| `/api/v1/compare` | GET | Public | Outlet overlap and bias comparison |
| `/api/v1/calendar` | GET | Public | Date-bucketed story calendar |
| `/api/v1/maps/stories` | GET | Public | Story map points dataset |
| `/api/v1/me/news-bias` | GET | Session | Extended user bias analytics |

### `GET /api/v1/compare`
Required query params:
- `a` source name
- `b` source name

Optional:
- `limit` (clamped)

### `GET /api/v1/calendar`
Query params:
- `topic`
- `bias`: `all | left | center | right`
- `from` and `to` in `YYYY-MM-DD`

### `GET /api/v1/maps/stories`
Query params:
- `limit` (max 3000)

### `GET /api/v1/me/news-bias`
Query params:
- `days` (1..365)

Returns:
- overall triplet
- timeline triplets
- top outlets
- blindspot recommendation text

## 9. Error and Status Patterns

Common patterns:
- Validation errors: `400` with `ok: false`
- Unauthorized session: `401`
- Forbidden admin-only route: `403`
- Rate-limited: `429` + rate limit headers
- Missing server integration key: often `503`

Special cases:
- `/api/auth/signup` always `410`
- `/api/auth/forgot-password` and `/api/auth/reset-password` may return HTTP `200` with failure payload to reduce account-enumeration signal
- `/api/geocode`, `/api/geolocate`, `/api/weather` can return fallback error payloads with HTTP `200`

## 10. External Integrations Used by API Layer

- Browser Use + Playwright CDP: ingestion and archive workflows
- Resend: digest email delivery
- Web Push: push send routes
- Open-Meteo + IP providers: geocode/geolocate/weather
- Optional Upstash Redis: distributed rate limiting
- Optional Cloudflare R2: image/object cache backing
