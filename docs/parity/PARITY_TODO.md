# Parity TODO Tracker

This file is a parity tracking artifact generated from audit data.

## Current Snapshot

- Total issues in latest checklist: **0**
- Marked done in `docs/parity/done_ids.json`: **0**
- Remaining pending: **0**

## Regeneration Commands

```bash
npm run parity:checklist
npm run parity:todo
npm run parity:smoke -- --base-url http://localhost:3000
npm run parity:gate -- --base-url http://localhost:3000
```

## Workflow

1. Generate/update checklist artifacts.
2. Mark completed IDs in `docs/parity/done_ids.json`.
3. Regenerate this TODO view.
4. Run smoke/visual gate before closing parity work.

## Notes

- This document is intentionally concise and machine-regenerated.
- If this file and code disagree, rerun the parity toolchain to refresh artifacts.
