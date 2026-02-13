# Browser Use Rotation Strategies

OpenGroundNews supports built-in Browser Use profile/proxy rotation in `scripts/lib/browser_use_cdp.mjs`.

This is an operational reliability feature for high-volume automation. It is not a CAPTCHA bypass system.

## 1. Why Rotation Exists

Repeated scraping with identical browser identity/network settings increases block/challenge risk. Rotation spreads requests across configured identity/network pools.

## 2. Rotation Inputs

### Core controls
- `BROWSER_USE_ROTATION_MODE`
  - `round_robin` (default)
  - `random`
  - `sticky`
- `BROWSER_USE_ROTATION_STATE_FILE`
  - default: `output/browser_use/rotation_state.json`

### Profile pools
- `BROWSER_USE_PROFILE_IDS` (comma-separated UUIDs)
- `BROWSER_USE_PROFILE_ID` (single fallback)

Invalid profile IDs are ignored if they are not UUID-shaped.

### Proxy pools
- `BROWSER_USE_PROXY_COUNTRY_CODES` (comma-separated ISO-2 codes)
- `BROWSER_USE_PROXY_COUNTRY_CODE` (single fallback)
- `BROWSER_USE_EDITION_PROXY_MAP` (edition-aware mapping)

`BROWSER_USE_EDITION_PROXY_MAP` forms:

JSON form:

```json
{"us":["us"],"uk":["gb","ie"],"europe":["de","fr","nl"]}
```

Compact form:

```text
us:us;uk:gb,ie;europe:de,fr,nl
```

Built-in edition defaults (used when env map is absent):
- `international -> us,gb,ca`
- `us -> us`
- `uk -> gb,ie`
- `canada -> ca,us`
- `europe -> de,fr,nl,be`

## 3. Candidate Resolution Order

### Profile candidates
1. Context payload `profileIds`
2. `BROWSER_USE_PROFILE_IDS`
3. `BROWSER_USE_PROFILE_ID` (fallback)

### Proxy candidates
1. Context payload `proxyCountryCode` (single)
2. Context payload `proxyCountryCodes` (list)
3. Context payload `preferredProxyCountryCodes`
4. Edition-derived map (`BROWSER_USE_EDITION_PROXY_MAP` + defaults)
5. `BROWSER_USE_PROXY_COUNTRY_CODES`
6. `BROWSER_USE_PROXY_COUNTRY_CODE` (fallback)

## 4. Rotation Modes

### `round_robin`
- Deterministic cycling through pool values
- Persists counters in rotation state file
- Best for balanced utilization

### `random`
- Random value each selection
- No counter persistence
- Best for quick anti-pattern dispersion

### `sticky`
- Deterministic hash selection by rotation key
- Same key tends to map to same profile/proxy
- Best for route/host affinity

## 5. Rotation Keys Used by Scripts

- `groundnews_scrape_cdp.mjs`
  - route/edition/session scoped keys
- `sync_groundnews_pipeline.mjs`
  - worker/session scoped enrichment keys
- `archive_extract_cdp.mjs`
  - archive host/URL-scoped keys
- `archive_verify_cdp.mjs`
  - batch verification scoped keys

## 6. Session Creation Retry Strategy

`createBrowserSession` plans and retries payload variants when session creation fails.

### Controls
- `BROWSER_USE_CREATE_RETRIES` (default 4)
- `BROWSER_USE_VERBOSE_RETRIES=1` (emit retry details)
- `BROWSER_USE_REQUEST_TIMEOUT_MS` (API request timeout)
- `BROWSER_USE_TIMEOUT_MINUTES` (session timeout hint sent to Browser Use API)

### Behavior
- 401/403 failures do not retry
- Retry path can adjust profile/proxy combinations (`matrix`, `proxy-disabled`, `profile-disabled`, `bare-minimum`)
- Returned session metadata includes chosen rotation strategy per attempt

## 7. Practical Presets

### Minimal stable identity

```bash
export BROWSER_USE_ROTATION_MODE="sticky"
export BROWSER_USE_PROFILE_ID="<uuid>"
export BROWSER_USE_PROXY_COUNTRY_CODE="US"
```

### Balanced multi-profile multi-region

```bash
export BROWSER_USE_ROTATION_MODE="round_robin"
export BROWSER_USE_PROFILE_IDS="<uuid1>,<uuid2>,<uuid3>"
export BROWSER_USE_PROXY_COUNTRY_CODES="US,CA,GB,DE"
```

### Edition-aware routing

```bash
export BROWSER_USE_ROTATION_MODE="round_robin"
export BROWSER_USE_EDITION_PROXY_MAP='{"us":["us"],"uk":["gb"],"canada":["ca"],"europe":["de","fr"]}'
```

## 8. Observability and Verification

Look for rotation metadata in script outputs:
- `rotation.mode`
- `rotation.rotationKey`
- selected profile/proxy values
- attempt index and strategy
- state file path

When debugging high block/challenge rates:
1. Verify active pool sizes are > 1
2. Enable `BROWSER_USE_VERBOSE_RETRIES=1`
3. Check for stale active sessions and prune via `npm run browseruse:stop-active-browsers`
4. Lower concurrency before increasing retries

## 9. Guardrails

- Rotation reduces repeated-pattern risk; it does not guarantee challenge-free sessions
- Keep archive fallback extraction enabled for reader reliability
- Avoid aggressive concurrency spikes that trigger quota/churn collapse
