#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BROWSER_USE_API_KEY:-}" ]]; then
  echo "error: BROWSER_USE_API_KEY is not set"
  echo "usage: export BROWSER_USE_API_KEY='...'; $0 [--routes ...] [--out ...]"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

node scripts/groundnews_scrape_cdp.mjs "$@"

