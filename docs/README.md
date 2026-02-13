# OpenGroundNews Documentation

This folder is the canonical technical reference for the current codebase.

## Core Docs

- `ARCHITECTURE.md` - runtime composition, data model, ingestion flow, and service boundaries
- `API.md` - complete HTTP route reference for `app/api/*` (including `v1` endpoints)
- `OPERATIONS.md` - environment setup, deployment/runbook, cron jobs, and troubleshooting
- `ROTATION_STRATEGIES.md` - Browser Use profile/proxy rotation and retry behavior
- `GROUND_NEWS_CSS_DESIGN_SYSTEM.md` - actual OpenGroundNews design tokens, theme model, and CSS architecture

## Parity Tracking Docs

- `parity/EXCEPTIONS.md` - explicit parity exceptions
- `parity/PARITY_TODO.md` - parity task tracker artifact
- `parity/*.json` - generated parity checklists and status files

## Suggested Reading Order

1. `ARCHITECTURE.md`
2. `API.md`
3. `OPERATIONS.md`
4. `ROTATION_STRATEGIES.md`
5. `GROUND_NEWS_CSS_DESIGN_SYSTEM.md`

## Source Of Truth Rule

When this docs folder conflicts with code, code wins. Update docs in the same change whenever behavior or contracts change.
