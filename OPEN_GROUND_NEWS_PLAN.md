# OpenGroundNews: Full Build Plan

## 0) What We Just Changed
- We switched exploration from local Playwright windows to Browser Use Cloud (remote browsers).
- Ground News exploration audits were run in parallel and outputs were saved to:
  - `/Users/kevinlin/OpenGroundNews/output/browser_use/audit_homepage.output.md`
  - `/Users/kevinlin/OpenGroundNews/output/browser_use/audit_details.output.md`
  - `/Users/kevinlin/OpenGroundNews/output/browser_use/audit_funnels.output.md`
- We migrated automation to direct Browser Use browser sessions + Playwright CDP scripts (no Browser Use task runners for scraping or archive extraction).

## 1) Reverse-Engineered Product Scope (from cloud audits)

### Primary surfaces to clone
- Global navigation and edition selector
- Homepage feed with multiple story card variants
- Story detail pages with:
  - source aggregation
  - bias distribution visuals
  - summary/perspective tabs
  - related topics/stories
  - outbound source links
- Secondary funnels:
  - Blindspot
  - Local
  - Rating System
  - Subscribe / Free-trial flows

### Core entities inferred
- `Story`
- `Source`
- `Coverage` (join between Story and Source article instances)
- `Topic`
- `User`
- `SubscriptionPlan`
- `PublisherRating` (bias/factuality/ownership metadata store)

## 2) System Architecture

### Frontend
- `Next.js` app (SSR + ISR) with:
  - feed pages (`/`, `/my`, `/local`, `/blindspot`)
  - story page (`/story/:id`)
  - source page (`/source/:id`)
  - pricing/auth pages
- Component library:
  - `StoryCard`, `BiasBar`, `CoveragePanel`, `SourceList`, `PerspectiveTabs`

### Backend
- API service (`FastAPI` or `NestJS`) for:
  - story feed queries
  - source and coverage retrieval
  - personalization and follow graph
  - article content retrieval state (archive/raw/extracted)

### Data layer
- `PostgreSQL` for core relational entities
- `Redis` for queue state + caching
- `OpenSearch` (or pgvector + FTS) for topic/search relevance
- Object storage (`S3`) for raw crawl snapshots and extracted content artifacts

### Jobs/queues
- `ingest-groundnews` (discover new/updated stories)
- `enrich-sources` (normalize source metadata)
- `archive-fetch` (archive lookup + capture)
- `extract-article` (readability/boilerplate removal)
- `recompute-bias-views` (materialized view refreshes)

## 3) Ground News Crawl + Always-Up-to-Date Mechanism

## 3.1 Collector strategy
- Use Browser Use Cloud browser sessions (`/api/v2/browsers`) with custom Playwright CDP scripts for scraping.
- Crawl schedule:
  - high-frequency feeds: every 2-5 minutes
  - secondary pages: every 15-30 minutes
  - deep refresh/backfill: nightly

### 3.2 Incremental ingest pipeline
1. Discover story URLs and identifiers from feed surfaces.
2. Hash story payload fingerprint (`headline + coverage_count + updated_at`).
3. Upsert only when fingerprint changes.
4. Record crawl provenance:
   - `crawler_version`
   - `session_id`
   - `captured_at`
   - `source_url`

### 3.3 Freshness guarantees
- SLA target:
  - p95 new story ingestion < 10 minutes
  - p95 story update propagation < 15 minutes
- Monitoring:
  - crawl lag dashboard
  - route failure/error-rate alarms
  - dead-letter queue for extraction failures

### 3.4 Required bypass logic for Ground News surface quirks
- If interstitial appears with `Proceed to` + `Ground News homepage`:
  - click `Ground News homepage` before extraction
- If cookie wall appears:
  - click `Reject Non-Essential`
- Keep this as a reusable preflight step in every automation prompt.

## 4) Article Click Flow via Archive.is + Custom Formatter

### 4.1 Runtime flow
1. User clicks source article inside OpenGroundNews story page.
2. Backend checks `article_content` table for cached rendered content.
3. If missing/stale:
   - attempt archived retrieval first
   - fallback to direct publisher fetch + extractor if archive unavailable
4. Store normalized output:
   - title
   - dek/subheading
   - author/date
   - cleaned body blocks
   - media references
5. Render in OpenGroundNews reader template with:
   - typography normalization
   - section headings
   - pull quotes
   - source attribution banner

### 4.2 Archive.is constraints and mitigation
- Archive.is currently presents anti-bot/captcha challenges depending on network and traffic patterns.
- Practical strategy:
  - Use Browser Use Cloud browser profiles and human-assisted bootstrap for captcha-sensitive flows.
  - Cache aggressively to avoid repeated challenge hits.
  - Add fallback extraction path (direct publisher + parser) when archive capture/retrieval fails.
- Result: no hard dependency on any single archive endpoint at request time.

### 4.3 Empirical remote-CDP verification results (2026-02-11)
- Tested URLs (from Ground News source links):
  - `https://www.kake.com/us-grand-jury-rejects-bid-to-indict-democrats-over-illegal-orders-video/article_2928c4c2-f901-5169-934e-3c8342c03f01.html`
  - `https://www.france24.com/en/americas/20260211-person-detained-for-questioning-in-nancy-guthrie-s-kidnapping-police-say`
  - `https://www.bt.dk/udland/voldsomme-scener-i-canada-10-doede-og-mindst-25-saaret-efter-skyderi-paa-skole`
- Archive.is outcomes with Browser Use remote browser sessions + Playwright CDP:
  - URL 1: `blocked` (security check / CAPTCHA)
  - URL 2: `blocked` (security check / CAPTCHA)
  - URL 3: `blocked` (security check / CAPTCHA)
- Conclusion:
  - Remote CDP automation is not a guaranteed Archive.is bypass on every session/network.
  - OpenGroundNews must treat Archive.is as opportunistic and maintain robust fallback extraction.

## 5) Data Model (MVP tables)
- `stories(id, canonical_slug, title, summary, topic_id, first_seen_at, last_seen_at, fingerprint)`
- `sources(id, name, domain, bias_label, factuality_label, ownership_label)`
- `story_coverage(id, story_id, source_id, article_url, published_at, captured_at, bias_bucket)`
- `story_metrics(story_id, left_count, center_count, right_count, total_sources)`
- `topics(id, name, slug)`
- `article_content(id, article_url, archive_url, fetch_status, content_json, extracted_at, version)`
- `crawl_runs(id, pipeline, started_at, finished_at, status, error_summary)`

## 6) Implementation Phases

### Phase 1: Foundation (1-2 weeks)
- Repo scaffolding (frontend, backend, worker, infra)
- DB schema + migrations
- Initial feed UI and story card system
- Browser Use Cloud crawler integration

### Phase 2: Story Detail + Source Aggregation (2-3 weeks)
- Coverage model and bias bars
- Story detail API and UI
- Source list and outbound linking
- Basic personalization (follow topics/sources)

### Phase 3: Reader Mode + Archive Pipeline (2-3 weeks)
- Archive/direct-fetch pipeline
- Content extraction and formatter
- Reader page with custom rendering
- Caching + retries + fallback logic

### Phase 4: Premium-style Surfaces + Hardening (2-4 weeks)
- Blindspot/local-like views
- Subscription gating framework (optional)
- Observability, alerts, and backfill jobs
- Anti-fragile crawling with replay + dead-letter processing

## 7) Compliance/Risk Notes (Important)
- Cloning behavior/UI too literally can introduce IP/trade dress and ToS risk.
- Use this as functional inspiration, but ship distinct branding, visual system, and interaction details.
- Keep strict attribution and provenance for all sourced content.

## 8) Browser Use Cloud + Playwright Compatibility
- Browser Use Cloud supports hosted browser sessions and CDP endpoints.
- That enables Playwright flows against remote browsers (`connectOverCDP`) instead of local heavy browser usage.
- Recommended pattern:
  - Use browser sessions + Playwright-over-CDP for deterministic scraping and extraction.
