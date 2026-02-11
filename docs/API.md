# API

## GET /api/stories
Returns stories list.

### Query params
- `view`: `all` | `blindspot` | `local` | `trending`
- `topic`: topic name filter
- `limit`: numeric cap

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

### Response
```json
{
  "ok": true,
  "ingestedStories": 8,
  "scrapedLinks": 8,
  "totalStories": 42
}
```
