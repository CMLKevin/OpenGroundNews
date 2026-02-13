# API Reference

This file documents all route handlers currently implemented under `app/api`.

## Conventions

### Auth types used below
- `Public`: no authentication required
- `Session`: valid `ogn_session` cookie required
- `Admin Session`: valid `ogn_session` with `user.role === admin`
- `API Key`: `x-ogn-api-key` (or `Authorization: Bearer <key>`) must match `OGN_API_KEY` or `OPEN_GROUND_NEWS_API_KEY`
- `API Key + Admin Session`: both gates required

### Response shape notes
- Most handlers return JSON with `{ ok: boolean, ... }`, but some legacy routes return plain `{ error: ... }` on failures.
- Several story endpoints append parity fields such as `readTimeMinutes` and `freshness`.

## 1. Stories, Search, Discovery

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/stories` | GET | Public | List stories with filters and rate-limit headers |
| `/api/stories/[slug]` | GET | Public | Story detail lookup |
| `/api/stories/batch` | POST | Public | Validate/resolve up to 60 story slugs |
| `/api/search` | GET | Public | Weighted full-text search with facets |
| `/api/search/suggest` | GET | Public | Search suggestions (stories/topics/outlets) |
| `/api/topics/trending` | GET | Public | Top trending topic tags |

### `GET /api/stories`
Query params:
- `topic`
- `view`: `all | blindspot | local | trending`
- `edition`
- `location`
- `q` (client-side text filter after DB fetch)
- `limit`

Behavior:
- Applies IP rate limiting (`API_STORIES_RATE_LIMIT`, `API_STORIES_RATE_WINDOW_SEC`)
- Returns `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`
- Adds `readTimeMinutes` + `freshness` for each story

### `POST /api/stories/batch`
Body:
- `{ "slugs": string[] }`

Notes:
- Dedupes slugs
- Rejects empty batch or batch > 60
- Returns lightweight story tuple list (`id`, `slug`, `title`)

## 2. Reader, Archive, Ingestion, Media Proxy

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/archive/read` | POST | API Key | Archive-first read for external URL |
| `/api/reader` | POST | Session | Reader path for signed-in users |
| `/api/ingest/groundnews` | POST | API Key + Admin Session | Trigger ingestion pipeline script |
| `/api/images/proxy` | GET | Public | Safe image proxy with rate limiting and cache metadata |

### `POST /api/archive/read`
Body:
- `{ "url": "https://...", "force": boolean }`

Response includes:
- `entry`: archive/fallback result
- `retry`: retry hints (`forceUsed`, `suggestedRetryAfterSec`)

### `POST /api/reader`
Body:
- `{ "url": "https://...", "force": boolean }`

Notes:
- Requires session cookie
- Uses same archive read engine and URL validation as `/api/archive/read`

### `GET /api/images/proxy`
Query params:
- `url` (required)
- `kind`: `logo | story | generic` (default `generic`)

Behavior:
- Rate limited per IP (`IMAGE_PROXY_RATE_LIMIT`, `IMAGE_PROXY_RATE_WINDOW_SEC`)
- Returns image bytes on success
- Adds cache + fallback headers (`x-image-cache`, `x-image-kind`, `x-image-fallback`, etc.)

## 3. Authentication And Session APIs

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Password login and `ogn_session` issuance |
| `/api/auth/logout` | POST | Public | Destroy session and clear cookie set |
| `/api/auth/me` | GET | Public | Resolve current user from app session, fallback to OAuth session |
| `/api/auth/signup` | POST | Public | Disabled endpoint (returns HTTP 410) |
| `/api/auth/forgot-password` | POST | Public | Request password reset token |
| `/api/auth/reset-password` | POST | Public | Redeem password reset token |
| `/api/auth/oauth/sync` | POST | OAuth session | Bridge NextAuth user into app session cookie |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth | NextAuth handler entrypoint |

Notes:
- OAuth availability depends on configured Google provider env vars.
- App primary session cookie is `ogn_session`.

## 4. User Personalization APIs

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/follows` | GET | Session | Fetch follow preferences |
| `/api/follows` | POST | Session | Toggle follow (`topic` or `outlet`) |
| `/api/follows/batch` | POST | Session | Batch add follows |
| `/api/me/prefs` | GET | Session | Read user preferences |
| `/api/me/prefs` | POST | Session | Update user preferences |
| `/api/me/bias` | GET | Session | 3-bucket reading bias summary |
| `/api/custom-feeds` | GET | Session | List user custom feeds |
| `/api/custom-feeds` | POST | Session | Create custom feed |
| `/api/custom-feeds/[id]` | PATCH | Session | Update custom feed |
| `/api/custom-feeds/[id]` | DELETE | Session | Delete custom feed |
| `/api/saved` | GET | Session | Get saved stories (`include=stories` optional) |
| `/api/saved` | POST | Session | Toggle saved state for story slug |
| `/api/reading-events` | POST | Session | Log read events with dedupe window |
| `/api/feedback` | POST | Public | Submit feedback (links user/story when available) |

## 5. Newsletter And Push APIs

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/newsletter` | POST | Public | Create newsletter signup record |
| `/api/newsletter` | GET | Public | Lookup subscriptions by email |
| `/api/newsletter/digest` | POST | API Key | Build/send digest email batches |
| `/api/push/public-key` | GET | Public | Return VAPID public key |
| `/api/push/subscribe` | POST | Session | Upsert push subscription |
| `/api/push/unsubscribe` | POST | Session | Remove push subscription |
| `/api/push/test` | POST | Admin Session | Send test push (self or all) |
| `/api/push/send-daily` | POST | API Key | Daily briefing push fanout job |

Notes:
- Digest requires `RESEND_API_KEY`.
- Push requires VAPID env vars.
- `send-daily` prunes dead subscriptions on 410/Gone failures.

## 6. Utility Data APIs

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/geocode` | GET | Public | Geocoding lookup via Open-Meteo |
| `/api/geolocate` | GET | Public | IP geolocation with provider fallback |
| `/api/weather` | GET | Public | Current + 7-day forecast via Open-Meteo |

## 7. V1 Parity APIs

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/v1/stories` | GET | Public | Extended stories feed with parity fields |
| `/api/v1/stories/[slug]` | GET | Public | Rich story detail modules |
| `/api/v1/compare` | GET | Public | Outlet overlap and bias comparison |
| `/api/v1/calendar` | GET | Public | Date-bucketed story calendar |
| `/api/v1/maps/stories` | GET | Public | Story map points dataset |
| `/api/v1/me/news-bias` | GET | Session | Full my-bias analytics modules |

### `GET /api/v1/stories`
Query params:
- `topic`, `view`, `edition`, `location`, `q`, `limit`

Notes:
- Returns `{ ok: true, version: "v1", count, stories }`
- `limit` clamps to max 2000

### `GET /api/v1/stories/[slug]`
Returns enriched modules, including:
- `timeline`
- `podcasts`
- `readerLinks` + `readerLinkItems`
- `relatedStories`
- `snapshots`
- `ownershipModule`
- `factualityModule`
- `geo`

### `GET /api/v1/compare`
Required query params:
- `a` (source name)
- `b` (source name)

Optional:
- `limit` (scanned stories cap)

### `GET /api/v1/calendar`
Query params:
- `topic`
- `bias`: `all | left | center | right`
- `from` (YYYY-MM-DD)
- `to` (YYYY-MM-DD)

### `GET /api/v1/maps/stories`
Query params:
- `limit` (max 3000)

Returns story points with location-derived coordinates.

## 8. Side Effects Summary

Routes with direct database writes:
- Auth routes (`login/logout/oauth sync`, password reset endpoints)
- `follows`, `custom-feeds`, `saved`, `reading-events`, `feedback`, `me/prefs`
- `newsletter`, `push/subscribe`, `push/unsubscribe`
- Ingestion/archive workflows (`ingest/groundnews`, archive cache writes via reader/archive paths)

Routes that trigger external service calls:
- Browser Use + Playwright: ingestion/archive scripts
- Resend: `/api/newsletter/digest`
- Web Push gateway: push routes using `web-push`
- Open-Meteo/IP providers: geocode/geolocate/weather
