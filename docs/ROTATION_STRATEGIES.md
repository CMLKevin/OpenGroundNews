# Browser Use Rotation Strategies

OpenGroundNews supports profile/proxy rotation directly in `scripts/lib/browser_use_cdp.mjs`.

This is an operational reliability strategy for high-volume scraping/archive workloads. It is not a CAPTCHA bypass feature.

## 1. Why Rotation Exists

Without rotation, repeated requests can reuse identical browser identity and network traits, increasing challenge/block rates. Rotation spreads session characteristics over profile and proxy pools.

## 2. Environment Variables

### Core mode and pools
- `BROWSER_USE_ROTATION_MODE`
  - `round_robin` (default)
  - `random`
  - `sticky`
- `BROWSER_USE_PROFILE_IDS` (comma-separated UUIDs)
- `BROWSER_USE_PROFILE_ID` (single UUID fallback)
- `BROWSER_USE_PROXY_COUNTRY_CODES` (comma-separated 2-letter codes)
- `BROWSER_USE_PROXY_COUNTRY_CODE` (single code fallback)
- `BROWSER_USE_ROTATION_STATE_FILE` (override default state file path)

### Edition-aware proxy mapping
- `BROWSER_USE_EDITION_PROXY_MAP`

Supported forms:

JSON form:
```json
{"us":["us"],"uk":["gb","ie"],"europe":["de","fr","nl"]}
```

Compact form:
```text
us:us;uk:gb,ie;europe:de,fr,nl
```

Built-in defaults (used when env map is absent):
- `international -> us,gb,ca`
- `us -> us`
- `uk -> gb,ie`
- `canada -> ca,us`
- `europe -> de,fr,nl,be`

### Session creation retry behavior
- `BROWSER_USE_CREATE_RETRIES` (default 4)
- `BROWSER_USE_VERBOSE_RETRIES=1` (enable retry logs)
- `BROWSER_USE_TIMEOUT_MINUTES` (session timeout hint sent to Browser Use API)

## 3. Selection Modes

### `round_robin`
- Deterministic cycle across candidates
- Persists counters to rotation state file
- Best when you want even pool utilization

### `random`
- Random candidate each session
- No counter persistence
- Useful for reducing predictable patterns quickly

### `sticky`
- Deterministic selection based on rotation key
- Same key tends to get same profile/proxy pairing
- Useful for host- or route-stable behavior

## 4. Rotation Keys Used In This Repo

- `groundnews_scrape_cdp.mjs`: route/edition-aware key patterns
- `archive_extract_cdp.mjs`: `archive-extract:<source-host>`
- `archive_verify_cdp.mjs`: `archive-verify-batch`

## 5. Candidate Resolution Order

Proxy candidates are assembled from:
1. Explicit context payload (`proxyCountryCode`/`proxyCountryCodes`)
2. Preferred context list
3. Edition-derived map (`BROWSER_USE_EDITION_PROXY_MAP` + defaults)
4. Env pool (`BROWSER_USE_PROXY_COUNTRY_CODES`)
5. Single env fallback (`BROWSER_USE_PROXY_COUNTRY_CODE`)

Profile candidates are assembled from:
1. Explicit context payload (`profileIds`)
2. Env pool (`BROWSER_USE_PROFILE_IDS`)
3. Single env fallback (`BROWSER_USE_PROFILE_ID`)

Invalid profile IDs are ignored unless they match UUID format.

## 6. Practical Presets

### Low-complexity stable identity
```bash
export BROWSER_USE_ROTATION_MODE="sticky"
export BROWSER_USE_PROFILE_ID="<uuid>"
export BROWSER_USE_PROXY_COUNTRY_CODE="US"
```

### Balanced multi-region round robin
```bash
export BROWSER_USE_ROTATION_MODE="round_robin"
export BROWSER_USE_PROXY_COUNTRY_CODES="US,CA,GB,DE"
export BROWSER_USE_PROFILE_IDS="<uuid1>,<uuid2>,<uuid3>"
```

### Edition-aware routing
```bash
export BROWSER_USE_ROTATION_MODE="round_robin"
export BROWSER_USE_EDITION_PROXY_MAP='{"us":["us"],"uk":["gb"],"canada":["ca"],"europe":["de","fr"]}'
```

## 7. Verification And Observability

Most script outputs include rotation metadata fields such as:
- `sessionRotation`
- `sessionPayload`

Use these fields to verify selected profile/proxy and retry strategy per run.

## 8. Guardrails

- Rotation reduces repeated-pattern risk but cannot guarantee challenge-free sessions.
- Keep archive fallback extraction enabled for user-facing reliability.
- Use moderate session concurrency and retries to avoid quota/churn spikes.
