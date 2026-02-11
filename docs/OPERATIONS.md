# Operations Runbook

## Environment
Required:
- `BROWSER_USE_API_KEY`

Optional:
- Rotation and session controls (see `docs/ROTATION_STRATEGIES.md`)

## Suggested schedule
1. Every 5-10 minutes:
   - `npm run ingest:groundnews`
2. Optional archive verification batch:
   - `npm run archive:verify -- --urls-file <file>`

## Health checks
- Ensure ingestion writes fresh timestamps to `data/store.json`.
- Alert if `uniqueStoryLinkCount` is repeatedly zero.
- Alert if archive status shows sustained `blocked` and fallback extraction also fails.

## Incident playbook
1. Check Browser Use API credentials and quota.
2. Run focused scrape smoke:
   - `npm run groundnews:scrape -- --routes / --scroll-passes 1`
3. Verify reader fallback path:
   - `POST /api/archive/read` with a known URL and `force: true`
4. Adjust rotation settings to reduce repeated challenge patterns.

## Artifacts
- Scrape output: `output/browser_use/groundnews_cdp/*.json`
- Archive verification: `output/browser_use/archive_cdp/*.json`
- Rotation state: `output/browser_use/rotation_state.json`
