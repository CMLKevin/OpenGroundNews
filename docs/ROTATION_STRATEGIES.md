# Browser Use Region and Profile Rotation

OpenGroundNews supports region/profile rotation through `/Users/kevinlin/OpenGroundNews/scripts/lib/browser_use_cdp.mjs`.

## Why this exists
Archive and high-frequency scraping paths can trigger more security challenges when the browser identity and route fingerprint are static. Rotation spreads requests across known profiles and regions.

This is a risk-reduction strategy, not a CAPTCHA bypass.

## Supported environment variables
- `BROWSER_USE_ROTATION_MODE`
  - `round_robin` (default)
  - `random`
  - `sticky`
- `BROWSER_USE_PROFILE_IDS`
  - comma-separated profile UUIDs
- `BROWSER_USE_PROFILE_ID`
  - single profile UUID (fallback when list is absent)
- `BROWSER_USE_PROXY_COUNTRY_CODES`
  - comma-separated country codes (case-insensitive; normalized to lowercase)
- `BROWSER_USE_PROXY_COUNTRY_CODE`
  - single country code fallback
- `BROWSER_USE_ROTATION_STATE_FILE`
  - custom file path for round-robin counters

## Mode behavior
### round_robin
- Cycles candidate arrays in order.
- Persists counters to state file so restarts continue from the next slot.

### random
- Chooses a random candidate per session.
- No persistent counter dependence.

### sticky
- Deterministic choice based on rotation key.
- Keeps host/workload on stable identity-region pair.

## Rotation keys used by scripts
- `groundnews_scrape_cdp.mjs`: key derived from route list
- `archive_extract_cdp.mjs`: key derived from source hostname
- `archive_verify_cdp.mjs`: fixed batch key

## Validation output
Script outputs include:
- `sessionRotation`
- `sessionPayload`

Example:
```json
{
  "sessionRotation": {
    "mode": "round_robin",
    "rotationKey": "groundnews:/,/blindspot",
    "proxyCountry": {
      "selected": "ca",
      "poolSize": 3,
      "source": "round_robin"
    }
  },
  "sessionPayload": {
    "proxyCountryCode": "ca"
  }
}
```

## Practical presets
### Preset A: low complexity
```bash
export BROWSER_USE_PROXY_COUNTRY_CODE="US"
export BROWSER_USE_PROFILE_ID="<single-profile-uuid>"
```

### Preset B: region round-robin
```bash
export BROWSER_USE_ROTATION_MODE="round_robin"
export BROWSER_USE_PROXY_COUNTRY_CODES="US,CA,GB,DE"
```

### Preset C: sticky archive host behavior
```bash
export BROWSER_USE_ROTATION_MODE="sticky"
export BROWSER_USE_PROFILE_IDS="<uuid1>,<uuid2>"
export BROWSER_USE_PROXY_COUNTRY_CODES="US,GB"
```

## Guardrails
- Invalid profile IDs are ignored (must be UUID format).
- Rotation can reduce repeated-pattern risk but cannot guarantee challenge-free archive access.
- Always keep fallback extraction enabled for user-facing reliability.
