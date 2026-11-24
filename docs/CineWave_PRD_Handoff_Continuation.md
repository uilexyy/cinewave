# CineWave --- PRD, Technical Handoff & Continuation Guide

**Document type:** Product Requirements Document + implementation
handoff\
**Project:** CineWave\
**Last updated:** 24 November 2026\
**Purpose:** Preserve the decisions, architecture, implementation
status, known issues, and next steps from the CineWave planning and
implementation conversation so work can continue in a new ChatGPT
conversation or after context/token limits.

------------------------------------------------------------------------

## 1. Project Overview

CineWave is a streaming-style application for **Android and Web**. Its
content discovery and playback model is based on user-installed add-ons,
similar in concept to Nuvio/Stremio-style add-on ecosystems.

CineWave itself is the application shell and user experience. Catalogs,
metadata, posters, streams, and subtitles are supplied by add-ons
installed by each user. CineWave must not depend on TMDB or another
centralized third-party movie catalog API.

The application must not host or distribute unauthorized video content.
Playback sources must be used only where the user and add-on have
appropriate rights and permissions. CineWave must not bypass DRM,
authentication, or access restrictions.

### Product goals

1.  Provide a polished, premium streaming experience on Web and Android.
2.  Let each user install and manage add-ons using a manifest URL.
3.  Aggregate content from the user's enabled add-ons.
4.  Support catalog browsing, search, title details, stream selection,
    subtitles, and playback.
5.  Preserve user data such as watchlists and watch progress.
6.  Be maintainable and secure, with PostgreSQL and Prisma as the
    persistence layer.

### Non-goals

-   No TMDB API integration.
-   No centralized third-party movie catalog API.
-   No arbitrary JavaScript execution from add-ons.
-   No hosting of video files by CineWave.
-   No DRM circumvention or access-control bypass.
-   No copying of Nuvio branding, code, or proprietary assets.

------------------------------------------------------------------------

## 2. Confirmed Product Decisions

  -----------------------------------------------------------------------
  Area                                Decision
  ----------------------------------- -----------------------------------
  Product name                        CineWave

  Platforms                           Android and Web

  Android distribution                Manual APK installation

  Android framework                   React Native + Expo + TypeScript +
                                      Expo Router

  Web framework                       Next.js App Router

  Backend                             Next.js Route Handlers

  Database                            PostgreSQL

  ORM                                 Prisma

  Repository                          PNPM monorepo

  Content architecture                User-installed add-ons

  Add-on installation                 User enters a manifest URL

  Add-on ownership                    Each user manages their own
                                      installed add-ons

  Add-on protocol                     Supported subset of Stremio Add-on
                                      HTTP protocol

  Catalog source                      Add-ons only

  Metadata source                     Add-ons only

  Poster/image source                 Add-ons only

  Stream source                       Add-ons only

  Subtitle source                     Add-ons only

  TMDB                                Removed; no API key required

  Android player                      expo-video

  Web player                          Existing project player
                                      implementation; verify exact
                                      library in repository

  Android build                       EAS Build, `preview` profile
                                      configured for APK

  Visual direction                    Premium cinematic dark, violet/cyan
                                      accents

  Database purpose                    Accounts, add-on installations,
                                      watchlist, progress, playback
                                      sessions, and related user data
  -----------------------------------------------------------------------

### Important distinction: no external catalog API

"No API" in the product decision means **no external centralized movie
catalog API such as TMDB**. CineWave still has its own internal backend
API routes, and it must make HTTP requests to the user-installed add-on
endpoints. Those internal routes and add-on protocol requests are
necessary for the architecture.

------------------------------------------------------------------------

## 3. User Experience Requirements

### 3.1 Public landing page

The current browser screenshot showed a very basic white page:

-   Heading: CineWave
-   Text: "Streaming platform dengan sistem Add-on."
-   Login and Register links
-   Large white empty area

This is not the intended final design. The landing page should be
redesigned as a polished streaming product.

Required elements:

-   CineWave logo/wordmark
-   Navigation: Home, Movies, Series, Anime, Add-ons
-   Login and Register actions
-   Cinematic hero section
-   Headline: "Your Entertainment, Your Way."
-   Short explanation of the add-on model
-   Explore Catalog and Install Add-ons calls to action
-   Product feature section
-   Footer

Do not represent fabricated titles or fake add-on data as real catalog
content.

### 3.2 Authenticated Home

Required sections:

-   Continue Watching
-   Recently Added
-   Popular Movies (only if supplied by add-ons)
-   Series
-   Anime
-   My Watchlist
-   Search
-   Profile menu

All content must be fetched from enabled user-installed add-ons. If no
add-ons are installed or no catalog is returned, show a useful empty
state with a route to Add-ons management.

### 3.3 Add-ons management

Required functionality:

-   Enter manifest URL
-   Preview manifest before installation
-   Install add-on
-   List installed add-ons
-   Enable/disable
-   Refresh manifest
-   Remove add-on
-   Show name, description, version, supported resources/types/catalogs
-   Show health/status
-   Set priority if supported
-   Prevent duplicate installations
-   Enforce per-user ownership

### 3.4 Search

-   Search input
-   Optional content type filters (Movies, Series, Anime)
-   Results grid
-   Poster, title, year, and genre when available
-   Search across enabled add-ons
-   Aggregate and deduplicate results
-   Show loading, empty, and error states

### 3.5 Title detail

Show available fields only:

-   Backdrop
-   Poster
-   Title
-   Description
-   Year
-   Genre
-   Rating if supplied by add-on
-   Cast if supplied
-   Play action
-   Add to Watchlist action
-   Available sources/streams

Return an appropriate not-found/empty state if no add-on supplies
metadata.

### 3.6 Player

Required controls and behavior:

-   Video playback
-   Play/pause
-   Seek/progress
-   Volume
-   Fullscreen
-   Subtitle selection
-   Stream/source selection
-   Loading state
-   Error state
-   Playback session tracking
-   Watch progress persistence
-   Graceful handling of invalid/unreachable streams

Android uses `expo-video`. Web uses the player already present in the
repository; inspect and verify its actual implementation before changing
it.

### 3.7 Authentication

Redesign Login and Register with the same premium dark design. Preserve
the existing backend authentication and validation.

------------------------------------------------------------------------

## 4. Technical Architecture

### 4.1 Monorepo

The existing project is a PNPM monorepo. Known paths include:

-   `apps/web`
-   `apps/mobile`
-   `packages/types`
-   `docs`

Inspect the actual repository before assuming every path or script still
exists.

### 4.2 Web/backend

-   Next.js App Router
-   Route Handlers for internal APIs
-   PostgreSQL + Prisma
-   Authentication and user-specific data
-   Add-on protocol client and service

### 4.3 Android

-   React Native
-   Expo
-   TypeScript
-   Expo Router
-   `expo-video`
-   Secure token storage as already configured in the project
-   EAS Build for APK generation

### 4.4 Database

Database name used in the local setup: `cinewave`.

PostgreSQL and pgAdmin 4 are installed on the user's Windows computer.
The user reported that pgAdmin 4 is now installed and active. Earlier, a
setup obstacle occurred because pgAdmin 4 had not yet been installed.

Use Prisma schema and existing migrations as the source of truth. Never
reset or delete the database without explicit user approval.

Expected data concepts/models mentioned during planning and
implementation include:

-   User
-   Addon
-   UserAddon
-   AddonHealthCheck
-   Title (generic, not TMDB-prefixed)
-   Watchlist
-   WatchProgress
-   PlaybackSession

Inspect the actual Prisma schema before making model changes.

------------------------------------------------------------------------

## 5. Add-on Protocol and Security Requirements

### 5.1 Supported protocol resources

CineWave implementation reports support for:

-   `manifest`
-   `catalog`
-   `meta`
-   `stream`
-   `subtitles`

The implementation is intended to support a subset of the Stremio Add-on
HTTP protocol. Do not assume full compatibility with every add-on.
Verify request paths, query parameters, ID formats, and response schemas
against the exact supported protocol subset.

### 5.2 Manifest installation

Flow:

1.  User opens Add-ons.
2.  User enters manifest URL.
3.  CineWave fetches and validates manifest.
4.  Preview is shown.
5.  User confirms installation.
6.  Add-on is stored for that user.
7.  Add-on appears in the installed list.
8.  User can enable, disable, refresh, or remove it.

Manifest fields reported as implemented:

-   `id`
-   `name`
-   `version`
-   `resources`
-   `types`
-   `catalogs`

Unknown resource types reportedly produce warnings rather than hard
failures.

### 5.3 Security

Required protections:

-   SSRF protection
-   DNS rebinding protection
-   Block localhost and private IP addresses
-   Redirect validation
-   Safe URL validation
-   Request timeout
-   Response size limits
-   JSON/schema validation
-   Authentication
-   User ownership checks
-   Secret redaction
-   No arbitrary JavaScript execution
-   Rate limiting for expensive endpoints

The implementation report says SSRF, private IP, DNS rebinding,
ownership, Zod validation, and secret redaction are implemented. It
explicitly says rate limiting is recommended but not implemented.

**Important encryption audit:** The implementation report says manifest
URLs are encrypted at rest using AES-256-CBC. Audit key management and
ciphertext integrity. For new/updated secret storage, prefer
authenticated encryption such as AES-256-GCM. If migrating, preserve the
ability to read existing encrypted URLs and do not break installed
add-ons. Do not expose secrets in logs.

### 5.4 Legal playback

-   Use only authorized sources.
-   Do not bypass DRM.
-   Do not bypass login/authentication.
-   Do not circumvent access controls.
-   Validate stream URLs against security rules.
-   Do not assume manifest validation means a stream is playable.

------------------------------------------------------------------------

## 6. Implementation Status Report (from OpenCode)

The user supplied the following OpenCode report. These are **reported
results**, not independently re-run verification by ChatGPT.

### 6.1 Files reportedly deleted

-   `apps/web/services/tmdb.ts`
-   `apps/web/app/api/v1/catalog/movies/route.ts`
-   `apps/web/app/api/v1/catalog/series/route.ts`
-   `apps/web/app/api/v1/catalog/anime/route.ts`
-   `apps/web/app/api/v1/catalog/documentaries/route.ts`
-   `packages/types/src/tmdb.ts`

### 6.2 Files reportedly added

-   `apps/web/lib/addon-client.ts` --- Add-on protocol client
    (catalog/meta/stream/subtitles)
-   `apps/web/lib/addon-crypto.ts` --- Shared encryption/decryption
    utility
-   `packages/types/src/addon.ts` --- Add-on types

### 6.3 Files reportedly modified

-   `apps/web/app/api/v1/catalog/home/route.ts`
-   `apps/web/app/api/v1/catalog/search/route.ts`
-   `apps/web/app/api/v1/catalog/title/[id]/route.ts`
-   `apps/web/app/api/v1/playback/[titleId]/route.ts`
-   `apps/web/app/api/v1/playback/sessions/route.ts`
-   `apps/web/app/api/v1/addons/route.ts`
-   `apps/web/app/api/v1/addons/[id]/route.ts`
-   `apps/web/app/api/v1/addons/[id]/refresh/route.ts`
-   `apps/web/app/api/v1/addons/preview/route.ts`
-   `apps/web/app/api/v1/watchlist/route.ts`
-   `apps/web/app/api/v1/history/route.ts`
-   `apps/web/lib/addon-service.ts`
-   `apps/mobile/services/catalog.ts`
-   `apps/mobile/app/(tabs)/index.tsx`
-   `apps/mobile/app/(tabs)/addons.tsx`
-   `apps/mobile/components/ExternalLink.tsx`
-   `apps/web/tests/catalog.test.ts`
-   `packages/types/index.ts`
-   `.env`
-   `.env.example`
-   `apps/web/.env`
-   `docs/IMPLEMENTATION_PLAN.md`

### 6.4 Reported feature status

  Feature                           Reported status
  --------------------------------- ------------------------------
  Install via manifest URL          Implemented
  Manifest preview                  Implemented
  Installed add-on listing          Implemented
  Enable/disable                    Implemented
  Remove add-on                     Implemented
  Refresh manifest                  Implemented
  Health checks                     Implemented
  Add-on priority                   Implemented
  Duplicate prevention              Implemented
  Per-user ownership                Implemented
  SSRF protections                  Implemented
  Catalog aggregation               Implemented
  Search across add-ons             Implemented
  Metadata lookup                   Implemented
  Stream lookup                     Implemented
  Subtitle lookup                   Implemented
  Android add-on UI                 Implemented
  Android player integration        Reported as using expo-video
  TMDB removal                      Reported complete
  Rate limiting                     Not implemented
  Physical Android LAN testing      Not verified
  Real add-on end-to-end test       Not verified
  Real playback on device/browser   Not verified

### 6.5 Reported test results

-   Auth tests: 8/8 PASS
-   Catalog tests: 5/5 PASS
-   User data tests: 11/11 PASS
-   Add-on tests: 4/4 PASS
-   Security tests: 18 scenarios PASS
-   Total: 46+ test scenarios reported passing
-   Web TypeScript: 0 errors
-   Web build: successful
-   Mobile TypeScript: 0 errors
-   Mobile lint: 0 errors

Again, these are results copied from the OpenCode report. Re-run tests
if a fresh verification is required.

------------------------------------------------------------------------

## 7. Previous Setup and Environment Notes

### 7.1 Windows and PostgreSQL

-   User works on Windows.
-   PostgreSQL is installed.
-   pgAdmin 4 is now installed and active.
-   Database is named `cinewave`.
-   User should be able to inspect it in pgAdmin 4 under Servers →
    Databases → `cinewave`, provided the server connection is configured
    and connected.
-   Do not print database passwords in terminal output or reports.
-   Do not commit `.env`.

A prior report included a local database connection string and a demo
account password. Do not reproduce those credentials in future prompts
or documentation. If those credentials were exposed outside the user's
local development environment, advise rotating them. Never use demo
credentials in production.

### 7.2 Port mismatch discovered earlier

An earlier verification report had inconsistent port references:

-   Backend was reported as running on `http://192.168.1.30:3001` or
    localhost:3001.
-   Mobile environment reportedly had
    `EXPO_PUBLIC_API_URL=http://localhost:3000`.
-   Other docs referenced both 3000 and 3001.

This must be rechecked against the actual current configuration. Do not
assume either port.

For a physical Android phone: - `localhost` refers to the phone itself,
not the Windows PC. - Use the computer's current LAN IPv4 address and
the actual backend port. - Phone and PC should be on the same
Wi-Fi/LAN. - Ensure the dev server listens on an accessible network
interface. - Configure Windows Firewall only as needed. - Do not
hardcode a stale LAN IP.

The user later showed CineWave Web open at `http://localhost:3000`,
confirming that a web page is currently reachable at that address. This
does **not** prove which port the backend or API is using, nor does it
prove Android connectivity.

### 7.3 Starting the apps

Previously suggested commands, subject to checking current package
scripts:

Web:

``` powershell
cd <project-folder>\apps\web
pnpm dev
```

Android:

``` powershell
cd <project-folder>\apps\mobile
npx expo start
```

Do not assume the project path. A previous example path was
`C:\Users\IT\Desktop\cinewave`, but verify the user's actual folder.

Root scripts seen in a previous `package.json` included: - `dev`:
`pnpm dev --recursive` - `build`: `pnpm build --recursive` - `lint`:
`pnpm -r run lint` - `test`: `pnpm -r run test` - Prisma scripts for
generate, push, migrate, seed

The root `dev` script may recursively invoke itself; inspect before
using it. Prefer app-specific commands until verified.

### 7.4 EAS APK

The reported `eas.json` configuration: - `preview` profile: APK
(`buildType: apk`) - `production` profile: AAB (`buildType: app-bundle`)

Reported Android package: - `com.cinewave.app` - version `1.0.0`

After testing:

``` bash
eas login
eas build --platform android --profile preview
```

Only claim an APK exists after EAS build completes and provides an
artifact.

------------------------------------------------------------------------

## 8. Current Web UI State and Design Direction

The user provided a screenshot of `http://localhost:3000`.

Observed screenshot: - Browser title/tab indicates localhost:3000. -
Plain white background. - "CineWave" heading. - Text: "Streaming
platform dengan sistem Add-on." - Login and Register links. - Large
empty white area. - No visible premium streaming layout, catalog grid,
add-on dashboard, or cinematic hero.

This means the current visible landing page is not yet aligned with the
intended design. It does not by itself prove backend failure.

### 8.1 Desired visual style

-   Premium cinematic dark
-   Main background approximately `#08090D`
-   Surface/cards approximately `#12141C`
-   Violet primary accent
-   Cyan secondary accent
-   Modern readable typography
-   Rounded cards
-   Subtle gradients
-   Smooth hover transitions
-   Responsive desktop/tablet/mobile
-   No default unstyled HTML appearance

### 8.2 Redesign scope

-   Public landing page
-   Authenticated Home
-   Add-ons management
-   Search
-   Title details
-   Player
-   Login
-   Register

Use reusable components and preserve all existing API integrations and
authentication. Do not use fake catalog data as real content. Empty
states should look intentional and direct users to install add-ons.

### 8.3 Design reference guidance

The intended experience is a professional streaming application, with: -
Large cinematic hero artwork - Horizontal content rows or responsive
poster grids - Clear navigation - Premium dark surfaces - Dedicated
add-on management screen - Modern player layout

Do not copy proprietary branding, code, or artwork from other streaming
apps.

------------------------------------------------------------------------

## 9. Immediate Next Steps --- Recommended Order

### Step 1: Finish the Web UI redesign

The user was given a prompt to OpenCode to redesign the Web UI. If
continuing in a new conversation, first ask whether OpenCode has
completed that task or request its latest report.

Verify: - Landing page no longer looks like a starter page. -
Login/Register work. - Home uses real add-on catalog API. - Add-ons page
uses actual add-on APIs. - Search uses actual catalog search API. -
Detail page uses add-on metadata. - Player uses existing playback
implementation. - Responsive layout works. - TypeScript, lint, and build
pass.

### Step 2: Run a real add-on integration test

OpenCode was given a prompt to audit and test the complete flow:

1.  Login.
2.  Open Add-ons.
3.  Enter a real compatible manifest URL.
4.  Preview.
5.  Install.
6.  Enable.
7.  Load catalog.
8.  Search.
9.  Open detail.
10. Request streams.
11. Play a permitted stream.
12. Load subtitles if supplied.
13. Save watch progress.

If no real add-on manifest is available, create a local mock add-on
server for protocol testing. Do not invent a manifest URL or claim a
real add-on test was performed.

### Step 3: Security and reliability audit

-   Implement production-appropriate rate limiting.
-   Review AES-256-CBC storage and consider migration to AES-256-GCM.
-   Recheck SSRF and DNS rebinding protections.
-   Verify redirect and resolved-IP checks at every fetch.
-   Verify per-user ownership.
-   Verify no secrets appear in logs.
-   Test timeouts and large responses.
-   Do not damage existing encrypted add-on records during migration.

### Step 4: Confirm Web backend port and Android LAN config

-   Inspect actual Web dev port.
-   Inspect actual API base URL.
-   Inspect mobile `EXPO_PUBLIC_API_URL`.
-   Get current PC LAN IPv4 address.
-   Ensure mobile device can reach PC backend over LAN.
-   Test from a physical Android device.
-   Configure firewall carefully.

### Step 5: Test playback

Test actual playback separately on: - Desktop browser - Physical Android
phone

Verify formats only if actually tested (for example HLS `.m3u8`, MP4,
subtitles). Do not infer real playback success from unit tests.

### Step 6: Build manual APK

Only after the Android app can reach the backend and playback is
verified:

``` bash
eas login
eas build --platform android --profile preview
```

Download/install the APK artifact returned by EAS. Do not claim a build
has succeeded until the service reports success.

------------------------------------------------------------------------

## 10. OpenCode Prompt --- Web UI Redesign

The user can paste this prompt into OpenCode if the redesign has not yet
been completed:

``` text
# CINEWAVE — REDESIGN WEB UI MENJADI PREMIUM STREAMING PLATFORM

Saya sudah menjalankan CineWave Web di browser melalui localhost:3000.

Saat ini halaman utama hanya menampilkan:
- Judul CineWave.
- Teks "Streaming platform dengan sistem Add-on."
- Link Login dan Register.
- Background putih dengan desain sangat sederhana.

Saya ingin mengubah tampilan tersebut menjadi aplikasi streaming premium dengan desain modern, cinematic dark, dan pengalaman pengguna seperti aplikasi streaming profesional.

PENTING:
- Jangan membuat ulang proyek.
- Jangan mengubah arsitektur backend.
- Jangan menghapus sistem Add-on.
- Jangan menghapus autentikasi.
- Jangan mengubah database PostgreSQL.
- Pertahankan semua API yang sudah berfungsi.
- Audit komponen dan halaman yang sudah tersedia sebelum melakukan perubahan.

## 1. Design System
- Premium cinematic dark.
- Background utama: #08090D.
- Surface/card: #12141C.
- Accent utama: violet.
- Accent sekunder: cyan.
- Typography modern dan bersih.
- Rounded corners.
- Subtle gradients.
- Smooth hover transitions.
- Responsive desktop, tablet, dan mobile.
- Jangan menggunakan tampilan default HTML.

## 2. Halaman Landing
- Navbar CineWave.
- Logo CineWave.
- Navigation: Home, Movies, Series, Anime, Add-ons.
- Tombol Login dan Register.
- Hero section dengan background cinematic.
- Headline: "Your Entertainment, Your Way."
- Deskripsi sistem add-on.
- Tombol Explore Catalog.
- Tombol Install Add-ons.
- Section fitur CineWave.
- Footer.
- Jangan menggunakan poster atau data film palsu seolah-olah berasal dari add-on sungguhan.

## 3. Halaman Home Setelah Login
- Continue Watching.
- Recently Added.
- Popular Movies (hanya jika disediakan add-on).
- Series.
- Anime.
- My Watchlist.
- Search bar.
- Profile menu.
Semua katalog harus berasal dari add-on aktif. Jika kosong, tampilkan empty state dengan tautan ke halaman Add-ons.

## 4. Halaman Add-ons
- Installed Add-ons.
- Add Add-on.
- Input Manifest URL.
- Preview Add-on.
- Install.
- Enable / Disable.
- Refresh.
- Remove.
- Status kesehatan.
- Nama, deskripsi, versi, jenis konten, status aktif.
Hubungkan ke API add-on yang sudah ada. Jangan membuat data add-on dummy.

## 5. Search
- Search input.
- Filter Movies, Series, Anime.
- Grid hasil pencarian.
- Poster, judul, tahun, genre jika tersedia.
Gunakan API CineWave yang mencari melalui add-on aktif.

## 6. Detail Film
- Backdrop dan poster.
- Judul, deskripsi, tahun, genre, rating jika tersedia.
- Tombol Play.
- Tombol Add to Watchlist.
- Daftar sumber streaming.
Tampilkan hanya metadata yang tersedia dari add-on.

## 7. Player
- Video player.
- Play/Pause.
- Progress bar.
- Volume.
- Fullscreen.
- Subtitle selector.
- Stream selector.
- Loading dan error states.
Pertahankan integrasi player yang sudah ada.

## 8. Authentication
Redesign Login dan Register dengan desain dark premium. Pertahankan backend dan validasi yang sudah ada.

## 9. Responsive
- Desktop layout luas.
- Tablet grid responsif.
- Mobile navigation nyaman.
- Tidak ada horizontal overflow.
- Semua tombol dan navigasi berfungsi.

## 10. Technical
- Gunakan Next.js App Router yang sudah ada.
- TypeScript.
- Reusable components.
- Tailwind CSS jika sudah tersedia.
- Pertahankan API integration.
- Loading skeleton, empty state, error state.
- Hindari data dummy sebagai data nyata.

## 11. Testing
- TypeScript check.
- ESLint.
- Web build.
- Login dan Register.
- API katalog tetap terhubung ke add-on.
- Add-ons install dan remove tetap berfungsi.

## 12. Report
Laporkan halaman yang dibuat/diperbaiki, komponen baru, API yang diintegrasikan, file yang diubah, hasil pengujian, dan URL halaman untuk diperiksa.

Kerjakan pada proyek yang sudah ada.
```

------------------------------------------------------------------------

## 11. OpenCode Prompt --- Real Add-on Integration & End-to-End Testing

``` text
# CINEWAVE — REAL ADD-ON INTEGRATION & END-TO-END TESTING

Implementasi add-on CineWave sudah selesai menurut laporan sebelumnya. Sekarang lakukan pengujian integrasi nyata sebelum aplikasi digunakan.

Jangan membuat ulang proyek. Jangan menghapus database atau data yang sudah ada.

## 1. Audit Protokol Add-on
Periksa manifest, catalog, meta, stream, subtitles.
Pastikan request/response sesuai subset Stremio Add-on HTTP protocol yang didukung CineWave.
Periksa endpoint, parameter, ID, JSON schema, empty/error responses, timeout, retry, dan incompatibility.
Manifest berhasil dibaca tidak berarti add-on sepenuhnya kompatibel.

## 2. End-to-End
1. Login.
2. Buka Add-ons.
3. Masukkan manifest URL.
4. Preview.
5. Install.
6. Pastikan add-on muncul.
7. Enable.
8. Pastikan katalog muncul.
9. Search.
10. Buka detail.
11. Minta streams.
12. Pilih stream.
13. Coba playback.
14. Subtitle jika tersedia.
15. Pastikan watch progress tersimpan.

Jika belum ada manifest nyata, jangan membuat URL palsu. Siapkan mock server lokal dan dokumentasikan pengujian dengan manifest nyata.

## 3. Android dan Web Playback
Periksa player Android expo-video dan player Web yang sudah ada.
Uji HTTP/HTTPS, HLS (.m3u8), MP4, subtitle, stream invalid/unreachable, dan navigasi saat video diputar.
Jangan mengklaim format berhasil diputar jika belum diuji di perangkat/browser.

## 4. Security
Audit SSRF, DNS rebinding, private IP blocking, redirect validation, timeout, response size, secret encryption, authentication, ownership, dan rate limiting.
Implementasikan rate limiting untuk install, preview, refresh, catalog, search, playback.
Gunakan solusi yang sesuai deployment multi-instance; jangan mengandalkan in-memory limiter untuk produksi.
Audit AES-256-CBC. Pertimbangkan AES-256-GCM dengan migrasi aman dan backward compatibility. Jangan merusak add-on yang sudah terpasang.

## 5. Android LAN
Periksa port backend yang benar-benar aktif.
Pastikan Android memakai IP LAN komputer, bukan localhost.
Periksa server binding, CORS jika diperlukan, Windows Firewall, dan dokumentasikan cara memperoleh IP lokal.
Jangan menebak port atau IP.

## 6. Documentation
Buat docs/REAL_ADDON_TESTING.md berisi cara install, test manifest/catalog/search/meta/stream/subtitle, Android fisik, Web, dan troubleshooting.

## 7. Final report
Daftar file berubah, audit protokol, test suite, mock server, add-on nyata jika tersedia, Web playback, Android playback, security, rate limiting, dan kendala.
Gunakan PASS/FAIL/NOT VERIFIED.
Jangan mengarang hasil dan jangan mengklaim playback nyata berdasarkan unit test saja.
```

------------------------------------------------------------------------

## 12. How to Resume in a New ChatGPT Conversation

If the conversation reaches token/context limits, start a new chat and
upload this PRD file. Then paste this continuation instruction:

``` text
Saya sedang melanjutkan proyek CineWave dari percakapan sebelumnya.

Baca seluruh file PRD dan handoff yang saya lampirkan. Gunakan dokumen tersebut sebagai sumber konteks utama.

Aturan:
1. Jangan mulai proyek dari awal.
2. Jangan mengubah keputusan produk yang sudah ditetapkan tanpa bertanya.
3. Jangan menganggap laporan OpenCode sebagai verifikasi independen.
4. Periksa status pekerjaan terbaru yang saya kirim.
5. Lanjutkan dari bagian "Immediate Next Steps" dan status terbaru.
6. Pandu saya langkah demi langkah di Windows dan OpenCode.
7. Jika saya mengirim screenshot, analisis tampilan dan berikan tindakan konkret.
8. Jangan menghapus database atau data.
9. Jangan menebak file, port, URL manifest, atau hasil pengujian.
10. Berikan prompt siap-tempel untuk OpenCode bila diperlukan.

Mulai dengan menyebutkan ringkas status CineWave yang kamu pahami dari dokumen, lalu tanyakan hanya satu hal paling penting yang belum diketahui untuk melanjutkan.
```

------------------------------------------------------------------------

## 13. Current Project State --- Handoff Snapshot

**Known completed (reported by OpenCode):** - Add-on-based catalog
architecture implemented. - TMDB integration removed. - Manifest
install/preview and user ownership implemented. -
Catalog/search/meta/stream/subtitles clients implemented. - Web and
mobile integration updated. - Unit/security tests reportedly pass. - Web
build and type checks reportedly pass. - PostgreSQL/Prisma project
already configured. - pgAdmin 4 installed and active. - EAS preview APK
profile reportedly configured.

**Known outstanding / not verified:** - Web UI currently observed as a
plain white starter-style landing page; premium redesign pending or not
yet confirmed complete. - Real add-on installation and end-to-end
protocol compatibility not verified. - Real stream playback on Web and
Android not verified. - Physical Android phone LAN connection not
verified. - Actual current backend port and mobile API base URL must be
checked. - Rate limiting not implemented according to the report. -
Encryption scheme needs security review. - APK build has not been
confirmed completed.

**Next action:** Complete/inspect the Web UI redesign, then run the real
add-on integration and end-to-end testing prompt. Only after that,
configure physical Android LAN access and build the manual APK.

------------------------------------------------------------------------

## 14. Working Rules for Future Assistance

-   Respond in Indonesian.
-   Give practical, step-by-step instructions suitable for a Windows
    user.
-   When asking the user to use OpenCode, provide a complete copy-paste
    prompt.
-   Preserve existing work and database.
-   Ask for logs/screenshots when a failure needs diagnosis.
-   Distinguish reported status from verified status.
-   Never repeat credentials or secrets from prior reports.
-   Do not invent a working add-on manifest URL.
-   Do not say an APK exists until EAS has completed successfully.
-   Keep the project focused on user-installed add-ons and authorized
    sources.
