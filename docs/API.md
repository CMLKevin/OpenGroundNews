# API

## GET /api/stories
Returns stories list.

### Query params
- `view`: `all` | `blindspot` | `local` | `trending`
- `topic`: topic name filter
- `limit`: numeric cap
- `edition`: edition/location filter (e.g. `International`, `United States`)
- `location`: free-text location filter (primarily for `view=local`)

### Response
```json
{
  "stories": [
    {
      "id": "story-...",
      "slug": "...",
      "title": "...",
      "summary": "...",
      "bias": { "left": 0, "center": 0, "right": 0 },
      "sources": []
    }
  ]
}
```

## GET /api/stories/[slug]
Returns one story or 404.

## POST /api/archive/read
Attempts archive-first article read.

### Auth
- Header `x-ogn-api-key: <key>` (or `Authorization: Bearer <key>`)

### Body
```json
{
  "url": "https://publisher.com/story",
  "force": false
}
```

### Response
```json
{
  "entry": {
    "originalUrl": "https://...",
    "status": "success|blocked|not_found|fallback|error",
    "archiveUrl": "https://archive...|none",
    "title": "...",
    "notes": "...",
    "paragraphs": ["..."]
  }
}
```

## POST /api/ingest/groundnews
Triggers ingestion pipeline.

### Auth
- Header `x-ogn-api-key: <key>` (or `Authorization: Bearer <key>`)

### Response
```json
{
  "ok": true,
  "ingestedStories": 8,
  "scrapedLinks": 8,
  "totalStories": 42
}
```

## V1 Parity Endpoints

### GET /api/v1/stories
- Returns parity-extended stories with `readTimeMinutes`, `freshness`, and `brokeTheNews`.

### GET /api/v1/stories/[slug]
- Returns parity-extended story detail including:
  - `timeline` (structured events)
  - `podcasts` (structured references)
  - `readerLinks` + `readerLinkItems`
  - `relatedStories`
  - `snapshots`
  - `ownershipModule` + `factualityModule`
  - `geo`

### GET /api/v1/me/news-bias
- Auth required (`ogn_session` cookie).
- Returns full My News Bias modules (overall distribution, timeline, top outlets, blindspot recommendation).

### GET /api/v1/compare?a=<source>&b=<source>
- Compares two outlets for overlap and bias profile.
- Response includes:
  - `coverage.overlapScore`
  - `coverage.sharedStories`
  - `coverage.topTopics`

### GET /api/v1/calendar
- Query params: `topic`, `bias`, `from`, `to`.
- Returns date-grouped stories for calendar views.

### GET /api/v1/maps/stories
- Returns story points normalized for map rendering.

### GET /api/images/proxy?url=<remote-image>
- Validated server-side image proxy with rate limiting and cache headers.
