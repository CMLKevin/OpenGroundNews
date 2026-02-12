# OpenGroundNews Progress (as of 2026-02-12)

This file summarizes major work completed to improve Ground News feature parity, per-article scraping fidelity, and UX polish.

## Goals

- Scrape **individual Ground News article pages** (not just generic routes).
- Extract enough structured data for high-fidelity parity: coverage totals, bias distribution, full source lists, and outlet metadata.
- Reduce hacky DOM-only heuristics by deriving data from the same structured payload the site uses when possible.
- Improve UX parity: topic/source hubs, “For You” surface, richer story rails, and bias distribution visuals.

## Major Deliverables

### 1) Per-Article Ingestion Pipeline

**Primary file:** `scripts/sync_groundnews_pipeline.mjs`

Implemented and iterated on a per-article workflow:
1. Visit Ground News homepage.
2. Discover front-page `/article/...` links.
3. Click through per-article pages.
4. Expand source cards (best-effort).
5. Extract article metadata and full coverage sources.
6. Enrich each source with publisher metadata (`og:description`, first paragraph, etc.) via a lightweight fetch.

Improvements made:
- Cookie banner + “Proceed to Your Story” interstitial handling for subscription promo gates.
- More robust coverage parsing (tolerates punctuation/format changes, not brittle string matching).
- Better outlet/excerpt selection:
  - Rejects weak outlet labels (e.g., location strings like “Vienna, Austria”).
  - Treats timestamp-y blurbs as weak excerpts and replaces them with real publisher metadata when possible.
- More resilient “More sources / Show all” expansion attempts.

### 2) Next.js App Router Flight (`__next_f`) Decoder

**Why:** Ground News frequently serves streamed App Router payloads via `self.__next_f.push(...)` instead of classic `__NEXT_DATA__`.

**Primary file:** `scripts/sync_groundnews_pipeline.mjs`

Implemented a flight extraction path that:
- Locates and parses `__next_f` push calls from raw HTML.
- Parses JSON-ish payload lines and walks nested objects to recover structured data.
- Produces a structured artifact per article (see audit artifacts below).

Extracted from flight data when available:
- Coverage totals and L/C/R percentages.
- Full source lists (hundreds of sources when present).
- Outlet-level metadata join (best-effort):
  - Bias and factuality now populate at scale (example below).
  - Ownership now populates when exposed (example below).

### 3) Audit Artifacts for Debugging/Parity

**Directory:** `output/browser_use/groundnews_cdp/article_audit/`

Each enriched article writes:
- `*.raw.html` (full rendered HTML)
- `*.features.json` (DOM-derived extraction)
- `*.__NEXT_DATA__.json` (classic next data, often empty on App Router pages)
- `*.__NEXT_FLIGHT__.json` (decoded flight summary: chunk counts, key hits, sample shapes, extracted sources, extracted coverage)

This makes scraping regressions actionable: you can re-run offline analysis against the captured HTML without re-scraping.

### 4) UX Parity Surfaces Added

Routes now present in `app/`:
- `app/interest/[slug]/page.tsx` (topic hub)
- `app/source/[slug]/page.tsx` (outlet hub)
- `app/my/page.tsx` (“For You” baseline)

UX/Navigation:
- Primary nav includes “For You” (`/my`).
- Trending topics + story topic chips link into `/interest/...`.
- Sources link into `/source/...`.
- LocalStorage-based follow/save toggles as a baseline personalization layer.

### 5) Bias Distribution Panel Parity

**Component:** `components/BiasDistributionPanel.tsx`

- Implements a Ground News-style bias distribution module:
  - L/C/R percentage bar.
  - Per-bucket outlet badges.
  - Untracked bias row.

## Validation Evidence (recent sample)

From a recent per-article ingestion run on:
`house-votes-to-override-trumps-canada-tariffs-3948f2`

- Sources extracted (flight): ~250+ sources (close to coverage totals).
- Coverage totals extracted:
  - Total sources, leaning-left/center/right, and L/C/R percentages.
- Factuality improved significantly from “all unknown”:
  - Example: `high`, `mixed`, `low` categories now appear in meaningful counts.
- Ownership now populates when present in flight:
  - Examples observed:
    - `KFDM -> Sinclair Broadcast Group`
    - `abc News -> The Walt Disney Company`

## Known Gaps / Remaining Work

1. **Paywall metadata**
- Still often missing (`unknown` / unset) for many sources.
- Next step: extend flight walker to find the paywall classification objects/keys that Ground uses per-source (may be absent for many entries or gated).

2. **Ownership coverage completeness**
- Now works for some outlets via flight join, but not universal.
- Next step: expand the outlet-meta join logic to catch additional registries and nested mappings.

3. **Topic extraction from flight**
- DOM-based tags work; flight-derived tags are present for some payloads but not consistently populated.
- Next step: add specific extraction for topic/interest registries in flight data.

4. **True account-backed personalization**
- `/my` is localStorage-based and not a full auth + cloud-sync implementation.

## Operational Notes

- Secrets are managed via `.env.local` (API keys not recorded here).
- Ingestion can be triggered via:
  - `npm run ingest:groundnews` (CLI)
  - `POST /api/ingest/groundnews` with `x-ogn-api-key` header (server)

## Scraping Reliability Overhaul (2026-02-12)

**Primary files:**
- `scripts/sync_groundnews_pipeline.mjs`
- `lib/format.ts`
- `scripts/lib/load_env.mjs`

Fixes landed to eliminate recurring scraping/data-quality regressions:
- Topic extraction now prefers the on-page "Similar News Topics" module (avoids global-nav contamination like "Israel-Gaza" defaulting everywhere).
- Tag extraction now targets the Similar Topics module instead of collecting arbitrary `/interest/` links from large containers.
- `_next/image?url=...` assets are unwrapped for both relative and absolute URLs (prevents broken logos that point at `https://ground.news/_next/image?...`).
- Node scripts now auto-load `.env` + `.env.local` when executed directly (removes the "works via API, fails via CLI" class of incidents).
- Ingestion supports incremental healing: `--refresh-existing N` re-enriches N existing stories with suspicious topic/tag patterns.

UX/data presentation fixes tied to scraping accuracy:
- Source lists are paginated ("Show more") to avoid rendering hundreds of cards at once.
- Source count display uses tracked-vs-total semantics (e.g. "6 of 180 sources") instead of misleading totals.
- Bias bars and bias distribution panels show explicit empty-state messaging when data is unavailable.
