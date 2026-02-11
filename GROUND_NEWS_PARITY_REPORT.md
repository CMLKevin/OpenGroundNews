# Ground News Parity Report (2026-02-11)

## Sources checked
- Ground News homepage: https://ground.news/
- Ground News subscribe tiers: https://ground.news/subscribe
- Ground News rating system: https://ground.news/rating-system
- Ground News blindspot page: https://ground.news/blindspot
- Ground News local page: https://ground.news/local
- Ground News source-directory style surface: https://ground.news/my/discover/source

## Public capability snapshot (web-researched)
1. Aggregated story feed with bias bars and source counts.
2. Blindspot-focused feed and conversion to premium products.
3. Localized feed surface.
4. Rating-system explainer around bias/factuality methods.
5. Subscription tiers and marketing funnel.
6. Story details that expose multiple source articles and perspective framing.

## OpenGroundNews current parity status

### Implemented
- Feed cards with bias distribution and source counts.
- Blindspot feed route.
- Local feed route + local setting control.
- Story detail page with perspective tabs.
- Source-level coverage panel with filtering/sorting (bias/factuality/ownership/paywall).
- Archive-first source reader with fallback extraction path.
- Search on homepage and API.
- Daily briefing + trending topics modules.
- Admin dashboard with ingestion and parity checklist.
- Remote-browser CDP ingestion (Browser Use browser sessions, no task runner dependency).

### Still missing for deeper parity
- Authenticated user profiles/follows/bookmarks with persistent accounts.
- Rich timeline/context modules and podcast references.
- True factuality/ownership ratings dataset ingestion from authoritative providers.
- Mobile app parity and push personalization.
- Advanced recommendation/ranking models and user-level preference tuning.
- Subscription/paywall enforcement logic (currently informational page only).

## Iterative roadmap (next)
1. Add auth + saved interests and per-user feed ranking.
2. Add source metadata ingestion from curated ratings dataset.
3. Add story timeline/context and related-topic graph modules.
4. Add subscription gating and entitlements.
5. Add editorial/admin moderation workflows.

## Latest validation run (2026-02-11)
1. Ground News remote-CDP scrape smoke test completed:
   - output: `/Users/kevinlin/OpenGroundNews/output/browser_use/groundnews_cdp/smoke_scrape.json`
   - result: story links discovered and no active proceed/cookie block signal detected.
2. Ground News multi-route preflight check completed for `/`, `/blindspot`, `/local`:
   - output: `/Users/kevinlin/OpenGroundNews/output/browser_use/groundnews_cdp/preflight_check.json`
   - result: all routes returned `status: ok`.
3. Archive remote-CDP verification completed on 3 specific news URLs:
   - output: `/Users/kevinlin/OpenGroundNews/output/browser_use/archive_cdp/smoke_archive_results.json`
   - result: all three currently hit Archive security checks (`blocked`) in this run.
4. Reader fallback extraction path verified through API:
   - endpoint: `POST /api/archive/read`
   - result: automatic `fallback` content extraction succeeds when archive retrieval is unavailable.
