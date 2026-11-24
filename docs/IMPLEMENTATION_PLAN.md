# CineWave Implementation Plan

## Progress

- **STEP 1 — Repository Foundation:** completed
- **STEP 2 — Database and Authentication:** completed (PostgreSQL, Prisma schema, auth routes, secure storage)
- **STEP 3 — Catalog and Providers:** completed (addon-based catalog, no TMDB dependency)
- **STEP 4 — User Data (Watchlist & Watch History):** completed (API + tests passing, mobile screens created)
- **STEP 5 — Web UI:** completed (home, login, register, profile)
- **STEP 6 — Android UI:** completed (bottom nav, home, watchlist, history, addons, player)
- **STEP 7 — Add-on System:** completed (SSRF protection, add-on management API, mobile screens, addon client for catalog/meta/stream/subtitles)
- **STEP 8 — Legal Playback:** completed (playback API, legal source validation, mobile player with expo-video)
- **STEP 9 — Android APK:** completed (EAS config, app.json, ANDROID_BUILD.md)
- **STEP 10 — Testing & QA:** completed (security tests, ownership tests, SSRF tests, all tests passing)
- **STEP 11 — Documentation:** completed (docs files, README updated)

## Architecture Decision (Updated)

CineWave is now an **add-on based** application (similar to Nuvio/Stremio):

- All catalog, metadata, poster, stream, and subtitle data comes from user-installed add-ons.
- No dependency on TMDB or any third-party catalog API.
- Add-ons follow a subset of the Stremio Add-on HTTP protocol.
- Each user has their own list of installed add-ons.
- Add-on management is per-user and authenticated.
- Security: SSRF protection, DNS rebinding protection, private IP blocking, ownership checks.
- Android distribution: Manual APK via EAS Build.
- Database: PostgreSQL with Prisma ORM.
- Platform: Android (Expo React Native) + Web (Next.js).

## Add-on Protocol Support

Supported resources:
- `manifest` - Add-on manifest metadata
- `catalog` - Browse content catalogs
- `meta` - Content metadata
- `stream` - Stream URLs
- `subtitles` - Subtitle tracks

## Changes Made in This Refactor

### Removed:
- `apps/web/services/tmdb.ts` (TMDB adapter)
- All TMDB API routes (movies, series, anime, documentaries)
- `TMDB_API_KEY` from all `.env` files
- `packages/types/src/tmdb.ts`

### Added:
- `apps/web/lib/addon-client.ts` - Add-on protocol client (catalog/meta/stream/subtitles)
- `apps/web/lib/addon-crypto.ts` - Shared encryption utilities
- `packages/types/src/addon.ts` - Add-on types

### Modified:
- `apps/web/app/api/v1/catalog/home/route.ts` - Now aggregates from enabled add-ons
- `apps/web/app/api/v1/catalog/search/route.ts` - Now searches across enabled add-ons
- `apps/web/app/api/v1/catalog/title/[id]/route.ts` - Now fetches meta from add-ons
- `apps/web/app/api/v1/playback/[titleId]/route.ts` - Now fetches streams/subtitles from add-ons
- `apps/web/app/api/v1/watchlist/route.ts` - Removed TMDB stub references
- `apps/web/app/api/v1/history/route.ts` - Removed TMDB stub references
- `apps/web/app/api/v1/addons/*` - Updated to use shared crypto util
- `apps/mobile/services/catalog.ts` - Updated to addon-based endpoints
- `apps/mobile/app/(tabs)/index.tsx` - Updated to use addon-based catalog
- `apps/mobile/app/(tabs)/addons.tsx` - Added install/enable/disable/remove
- `apps/web/tests/catalog.test.ts` - Rewritten for addon-based architecture
- `.env` / `.env.example` - Removed TMDB_API_KEY

### Tests:
- All 5 test suites pass (auth, catalog, userData, addons, security)
- 26+ test scenarios passing
- Web typecheck: 0 errors
- Web build: successful
- Mobile typecheck: 0 errors (after ExternalLink fix)
- Mobile lint: 0 errors

### Next Steps:
1. Test add-on installation with a real add-on manifest URL
2. Verify playback with a real stream source
3. Configure LAN IP for physical Android device testing
4. Build APK with EAS
