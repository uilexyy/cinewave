# CINEWAVE
# PRODUCT REQUIREMENTS DOCUMENT (PRD) & OPENCODE IMPLEMENTATION SPECIFICATION

**Versi:** 2.0  
**Status:** Final  
**Platform:** Android + Web  
**Distribusi Android:** APK Manual Installation  
**Backend:** Next.js  
**Database:** PostgreSQL + Prisma  
**Mobile:** React Native + Expo  
**Bahasa aplikasi:** Indonesia (dengan fondasi i18n untuk bahasa lain)

---

# BAGIAN 1 — PRODUCT OVERVIEW

## 1.1 Deskripsi Produk

CineWave adalah aplikasi streaming film dan serial berbasis Android dan Web dengan tampilan modern, premium, dan cinematic yang terinspirasi dari pengalaman penggunaan platform streaming populer.

CineWave menyediakan:
- Penemuan film dan serial.
- Katalog anime dan dokumenter.
- Informasi detail setiap judul.
- Pemutaran video dari sumber eksternal yang sah.
- Sistem Add-on multi-provider.
- Instalasi Add-on secara mandiri oleh setiap pengguna.
- Watchlist dan riwayat tontonan.
- Sinkronisasi data pengguna antara Android dan Web.

CineWave tidak menyimpan file video film di server sendiri. Video diputar dari penyedia eksternal yang memiliki hak distribusi atau izin pemutaran yang sesuai.

## 1.2 Tujuan Produk

1. Menghadirkan aplikasi streaming dengan UX premium.
2. Mendukung penggunaan Android dan browser Web.
3. Menyediakan sistem Add-on yang fleksibel.
4. Memungkinkan setiap pengguna mengelola Add-on miliknya sendiri.
5. Menyinkronkan watchlist dan riwayat tontonan.
6. Menjaga keamanan pengguna dan legalitas sumber video.
7. Memiliki arsitektur yang dapat dikembangkan menjadi platform multi-provider.

## 1.3 Target Pengguna

- Pengguna Android.
- Pengguna browser desktop dan mobile.
- Penggemar film, serial, anime, dan dokumenter.
- Pengguna yang ingin menghubungkan provider streaming melalui Add-on.

---

# BAGIAN 2 — PLATFORM & TECHNOLOGY STACK

## 2.1 Platform

### Android
- Aplikasi native menggunakan React Native.
- Expo dan Expo Router.
- TypeScript.
- Build APK untuk instalasi manual.
- Mendukung Android modern.
- Navigasi dan layout khusus perangkat mobile.

### Web
- Next.js App Router.
- Responsive desktop, tablet, dan mobile.
- URL halaman dapat dibagikan.
- Tampilan disesuaikan dengan layar browser.

### Backend
- Next.js Route Handlers.
- REST API berversi.
- Service layer terpisah.
- Validasi menggunakan Zod.
- Authentication dan authorization.
- Provider adapter architecture.

## 2.2 Technology Stack

| Komponen | Teknologi |
|---|---|
| Android | React Native + Expo |
| Mobile navigation | Expo Router |
| Web | Next.js App Router |
| Language | TypeScript |
| UI Mobile | NativeWind |
| UI Web | Tailwind CSS + shadcn/ui |
| Backend | Next.js Route Handlers |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Authentication | Auth.js atau token-based authentication yang aman |
| Video Player Android | Expo Video |
| Video Player Web | Vidstack atau HTML5/HLS.js |
| Metadata | TMDB API |
| Subtitle | WebVTT |
| Build Android | EAS Build |
| Hosting Web/API | Vercel |
| Database Hosting | PostgreSQL managed |

Gunakan versi package yang stabil dan saling kompatibel ketika implementasi dimulai.

## 2.3 Arsitektur Repository

Gunakan monorepo dengan struktur berikut:

```text
cinewave/
│
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (tabs)/
│   │   │   ├── movie/
│   │   │   ├── series/
│   │   │   ├── player/
│   │   │   ├── addons/
│   │   │   └── settings/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── constants/
│   │   ├── assets/
│   │   └── app.json
│   │
│   └── web/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── services/
│       └── public/
│
├── packages/
│   ├── shared/
│   ├── types/
│   ├── validation/
│   ├── api-client/
│   └── config/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docs/
│   ├── PRD.md
│   ├── ANDROID_SPEC.md
│   ├── WEB_SPEC.md
│   ├── API_SPEC.md
│   ├── DATABASE_SPEC.md
│   ├── ADDON_ARCHITECTURE.md
│   ├── ADDON_PROTOCOL.md
│   ├── ADDON_SECURITY.md
│   └── INSTALLATION_GUIDE.md
│
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Web dan Android menggunakan API serta database yang sama. Jangan membuat database terpisah untuk masing-masing platform.

---

# BAGIAN 3 — DESIGN SYSTEM

## 3.1 Design Direction

Tema: Premium Cinematic Dark UI.

Referensi visual:
- Netflix.
- Disney+.
- Stremio.
- Nuvio.
- Aplikasi streaming modern.

Jangan menyalin identitas visual, logo, atau aset berhak cipta milik produk lain.

## 3.2 Warna

| Elemen | Warna |
|---|---|
| Background | #09090B |
| Surface | #18181B |
| Elevated Surface | #27272A |
| Primary | #8B5CF6 |
| Secondary | #06B6D4 |
| Text Primary | #FAFAFA |
| Text Secondary | #A1A1AA |
| Border | #3F3F46 |
| Error | #EF4444 |
| Success | #22C55E |

## 3.3 Visual Guidelines

- Dark mode sebagai tampilan default.
- Poster menggunakan rasio sekitar 2:3.
- Backdrop menggunakan rasio 16:9.
- Rounded corners modern.
- Typography bersih dan mudah dibaca.
- Animasi transisi halus.
- Skeleton loading.
- Empty state yang informatif.
- Error state yang memiliki tombol retry.
- Hindari tampilan dashboard administratif untuk halaman utama.

## 3.4 Android Navigation

Bottom navigation:
1. Home
2. Explore
3. Search
4. My List
5. Profile

## 3.5 Web Navigation

Desktop:
- Sidebar atau top navigation.
- Hero banner.
- Horizontal content carousel.
- Search dan filter.
- User profile menu.

Mobile browser:
- Layout responsif.
- Navigasi ringkas.
- Poster grid menyesuaikan lebar layar.

---

# BAGIAN 4 — CORE FEATURES

## 4.1 Authentication

Fitur:
- Register.
- Login.
- Logout.
- Forgot password.
- Reset password.
- Session management.
- Profile management.

Persyaratan:
- Password di-hash menggunakan algoritma yang sesuai.
- Endpoint yang membutuhkan autentikasi harus dilindungi.
- Android dan Web menggunakan akun yang sama.
- Token atau session disimpan dengan mekanisme aman sesuai platform.
- Android menggunakan secure storage untuk kredensial sensitif.

## 4.2 Home

Komponen:
- Hero featured movie.
- Continue Watching.
- Trending Movies.
- Popular Movies.
- Popular Series.
- Anime.
- Documentaries.
- Recently Added.
- Recommended For You.

Setiap item menampilkan:
- Poster.
- Judul.
- Tahun.
- Rating jika tersedia.
- Genre jika relevan.

Data katalog tidak boleh mengarang ketersediaan stream.

## 4.3 Explore

Fitur:
- Browse Movies.
- Browse Series.
- Browse Anime.
- Browse Documentaries.
- Genre filter.
- Year filter.
- Rating filter.
- Sort by popularity.
- Sort by release date.

## 4.4 Search

Fitur:
- Search title.
- Search by genre.
- Search suggestions.
- Search history.
- Debounced search.
- Pagination.

## 4.5 Movie Detail

Menampilkan:
- Backdrop.
- Poster.
- Title.
- Original title.
- Synopsis.
- Release date.
- Runtime.
- Genres.
- Rating.
- Cast jika tersedia.
- Available legal providers.
- Available subtitles.
- Similar titles.
- Play button.
- Add to My List.

## 4.6 Series Detail

Menampilkan:
- Series information.
- Season list.
- Episode list.
- Episode synopsis.
- Episode duration.
- Available legal sources.
- Watch progress.

## 4.7 My List

Fitur:
- Add to list.
- Remove from list.
- View saved movies.
- View saved series.
- Sync antar perangkat.

## 4.8 Watch History

Fitur:
- Continue Watching.
- Watch progress.
- Resume playback.
- Mark as watched.
- Remove history.
- Sync antar perangkat.

---

# BAGIAN 5 — VIDEO PLAYER

## 5.1 Android Player

Gunakan Expo Video sebagai implementasi awal.

Fitur:
- Play/Pause.
- Seek.
- Timeline.
- Fullscreen.
- Volume.
- Playback speed.
- Subtitle selection.
- Resume playback.
- Next episode.
- Error handling.
- Loading indicator.

## 5.2 Web Player

Gunakan Vidstack atau HTML5 Video dengan HLS.js sesuai kebutuhan format sumber.

Fitur:
- Play/Pause.
- Seek.
- Volume.
- Fullscreen.
- Subtitle.
- Playback speed.
- Keyboard shortcuts.
- Resume playback.
- Next episode.

## 5.3 Playback Resolution

Alur:

```text
User selects title
       |
       v
Request playback sources
       |
       v
Backend checks providers
       |
       v
Normalize source information
       |
       v
Check legal eligibility
       |
       v
Return approved sources
       |
       v
User selects source
       |
       v
Platform-specific video player
```

Ketentuan:
- Tidak semua URL otomatis dapat diputar di browser.
- Perhatikan CORS, format video, autentikasi, dan kebijakan hotlink.
- Gunakan embed resmi apabila provider mewajibkannya.
- Jangan melakukan bypass DRM.
- Jangan melakukan proxy video arbitrer.
- Jangan menampilkan source yang belum memenuhi persyaratan hak distribusi.
- Jika tidak ada stream legal, tampilkan informasi bahwa stream belum tersedia.

---

# BAGIAN 6 — ADD-ON SYSTEM

## 6.1 Konsep

CineWave menggunakan sistem Add-on multi-provider dengan protokol HTTP yang kompatibel dengan subset Stremio Add-on Protocol.

Setiap pengguna dapat memasang Add-on miliknya sendiri.

Add-on bukan plugin JavaScript yang dieksekusi secara langsung.

## 6.2 User Installation Policy

Keputusan final:

**Setiap pengguna boleh memasang Add-on secara mandiri.**

Admin tidak menjadi satu-satunya pihak yang boleh memasang Add-on.

Setiap instalasi terikat kepada user yang memasangnya.

User A tidak boleh melihat, mengubah, atau menghapus instalasi User B.

## 6.3 Add-on Installation Flow

```text
Open Add-on Manager
       |
       v
Enter Manifest URL
       |
       v
Backend validates URL
       |
       v
Fetch manifest securely
       |
       v
Validate protocol and capabilities
       |
       v
Show Add-on Preview
       |
       v
User confirms installation
       |
       v
Save UserAddon record
       |
       v
Add-on appears in manager
```

## 6.4 Add-on Manager UI

Halaman:
- `/addons`
- `/addons/install`
- `/addons/[id]`

Fitur:
- Install Add-on.
- Preview manifest.
- Enable Add-on.
- Disable Add-on.
- Remove Add-on.
- Refresh manifest.
- Test connection.
- Display status.
- Display capabilities.
- Display installation date.
- Display last health check.

## 6.5 Add-on Manifest

Implementasikan subset protokol yang dinyatakan secara eksplisit dan kompatibel dengan dokumentasi Stremio Add-on Protocol.

Resource yang didukung:
- Catalog.
- Meta.
- Stream.
- Subtitles.

Content type:
- Movie.
- Series.

Implementasi wajib membaca manifest dan resource definitions, bukan mengasumsikan semua Add-on menggunakan struktur yang sama.

Buat adapter protocol terpisah agar dukungan protokol bisa dikembangkan.

## 6.6 Add-on API

Contoh API:

```text
POST   /api/v1/addons/preview
POST   /api/v1/addons/install

GET    /api/v1/addons
GET    /api/v1/addons/:id

PATCH  /api/v1/addons/:id

POST   /api/v1/addons/:id/enable
POST   /api/v1/addons/:id/disable
POST   /api/v1/addons/:id/refresh
POST   /api/v1/addons/:id/test

DELETE /api/v1/addons/:id
```

Resource proxy atau adapter endpoint:

```text
GET /api/v1/addons/:id/catalog/*
GET /api/v1/addons/:id/meta/*
GET /api/v1/addons/:id/stream/*
GET /api/v1/addons/:id/subtitles/*
```

Rute aktual harus mengikuti struktur resource dalam manifest dan spesifikasi protokol. Jangan menganggap semua resource memiliki path yang identik.

## 6.7 Add-on Database Models

### Addon

Menyimpan identitas dan metadata Add-on jika diperlukan untuk katalog internal.

### UserAddon

Menyimpan instalasi milik pengguna.

Field minimum:
- id
- userId
- name
- manifestUrlEncrypted atau konfigurasi URL yang diamankan
- version
- description
- enabled
- priority
- installedAt
- updatedAt
- lastCheckedAt
- healthStatus

Tambahkan model snapshot manifest jika diperlukan.

Satu pengguna boleh memiliki konfigurasi Add-on berbeda. Jangan memaksa seluruh instalasi berbagi satu manifest URL global.

### AddonRequestLog

Mencatat:
- addonId
- userId
- resource
- statusCode
- responseTime
- errorCode
- createdAt

Jangan menyimpan token, kredensial, atau query rahasia dalam log.

### AddonHealthCheck

Mencatat hasil pemeriksaan kesehatan Add-on.

## 6.8 Add-on Security

Wajib:
- HTTPS sebagai default.
- Validasi URL.
- Blokir localhost.
- Blokir private IP.
- Blokir link-local IP.
- Blokir cloud metadata endpoint.
- Validasi IPv4 dan IPv6.
- Validasi DNS resolution.
- Revalidasi setiap redirect.
- Batasi jumlah redirect.
- Batasi timeout.
- Batasi response size.
- Batasi concurrency.
- Batasi request rate.
- Validasi content type.
- Hindari meneruskan cookie atau header autentikasi internal.
- Lindungi dari DNS rebinding.
- Sanitasi output Add-on.
- Redaksi secret pada log.
- Enkripsi konfigurasi sensitif saat disimpan.

Implementasikan outbound HTTP client yang aman. Pemeriksaan URL sebelum request saja tidak cukup untuk mengatasi SSRF dan DNS rebinding.

## 6.9 Legal Validation

Manifest yang berhasil diakses tidak otomatis membuktikan bahwa Add-on legal.

Buat sistem status sumber:

- PENDING_REVIEW
- APPROVED
- REJECTED
- EXPIRED

Sumber hanya boleh digunakan untuk playback apabila memenuhi pemeriksaan hak pemutaran yang berlaku.

Jika belum terverifikasi, tampilkan metadata atau katalog tanpa memberikan akses playback.

---

# BAGIAN 7 — DATA PROVIDER

## 7.1 Metadata Provider

Gunakan TMDB untuk:
- Movie metadata.
- Series metadata.
- Poster.
- Backdrop.
- Genre.
- Cast.
- Release information.

TMDB bukan sumber file video.

Perhatikan ketentuan lisensi, atribusi, API key, dan kebijakan penggunaan TMDB.

## 7.2 Video Providers

Gunakan provider yang memiliki izin distribusi atau pemutaran.

Contoh sumber yang dapat dievaluasi:
- Internet Archive, dengan verifikasi hak per item.
- Wikimedia Commons, dengan pemeriksaan lisensi per file.
- Blender Open Movies, sesuai lisensi setiap judul.
- Provider resmi lainnya yang menyediakan izin streaming atau embed.

Anime harus berasal dari penyedia yang memiliki hak distribusi yang sesuai.

## 7.3 Provider Architecture

Setiap provider menggunakan adapter terpisah:

```text
ProviderRegistry
       |
       +-- TMDBAdapter
       |
       +-- ArchiveAdapter
       |
       +-- CommonsAdapter
       |
       +-- AddonAdapter
       |
       +-- OfficialProviderAdapter
```

Setiap adapter mengikuti interface yang konsisten.

---

# BAGIAN 8 — DATABASE DESIGN

Gunakan PostgreSQL dan Prisma.

Model minimum:

### User
- id
- name
- email
- passwordHash
- createdAt
- updatedAt

### UserSession / Account
Sesuai strategi authentication.

### Title
- id
- externalId
- title
- originalTitle
- overview
- posterPath
- backdropPath
- releaseDate
- contentType
- genres
- rating

### Season
- id
- titleId
- seasonNumber

### Episode
- id
- seasonId
- episodeNumber
- name
- overview
- runtime

### Provider
- id
- name
- type
- baseUrl
- enabled

### ProviderItem
- id
- providerId
- externalId
- titleId
- metadata

### VideoSource
- id
- titleId
- episodeId
- providerId
- sourceUrl
- format
- quality
- legalStatus

### SourceLicense
- id
- videoSourceId
- rightsHolder
- licenseType
- territory
- validFrom
- validUntil
- evidenceReference
- status

### SubtitleTrack
- id
- titleId
- episodeId
- language
- format
- url

### UserAddon
- id
- userId
- name
- manifestUrlEncrypted
- enabled
- priority
- version
- healthStatus
- installedAt
- updatedAt

### AddonRequestLog
- id
- userId
- addonId
- resource
- statusCode
- responseTime
- createdAt

### WatchProgress
- id
- userId
- titleId
- episodeId
- positionSeconds
- durationSeconds
- completed
- updatedAt

### Watchlist
- id
- userId
- titleId
- createdAt

### PlaybackSession
- id
- userId
- titleId
- episodeId
- sourceId
- startedAt
- endedAt

Tambahkan foreign key, index, unique constraints, dan cascade behavior yang tepat.

Wajib menerapkan ownership check pada seluruh operasi data pribadi.

---

# BAGIAN 9 — API ARCHITECTURE

Prefix:

```text
/api/v1
```

## Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
```

## Catalog

```text
GET /catalog/home
GET /catalog/movies
GET /catalog/series
GET /catalog/anime
GET /catalog/documentaries
GET /catalog/search
GET /catalog/title/:id
```

## Watchlist

```text
GET    /watchlist
POST   /watchlist
DELETE /watchlist/:id
```

## Watch History

```text
GET   /history
POST  /history/progress
PATCH /history/:id
DELETE /history/:id
```

## Playback

```text
GET  /playback/:titleId/sources
POST /playback/session
PATCH /playback/progress
```

## Add-ons

Gunakan seluruh endpoint pada Bagian 6.

Semua endpoint wajib memiliki:
- Validasi input.
- Authentication jika dibutuhkan.
- Authorization.
- Rate limiting sesuai risiko.
- Error response konsisten.
- Logging yang tidak membocorkan secret.

---

# BAGIAN 10 — ANDROID REQUIREMENTS

## 10.1 Android UX

- Bottom navigation.
- Gesture yang sesuai platform.
- Safe area support.
- Loading dan error state.
- Keyboard handling.
- Orientasi player landscape.
- Fullscreen playback.
- Back button handling.
- Responsive poster grid.

## 10.2 Android Storage

Gunakan secure storage untuk token dan kredensial.

Jangan menyimpan:
- Password plaintext.
- Access token dalam AsyncStorage tanpa perlindungan.
- Secret Add-on tanpa enkripsi.

## 10.3 Android Build

Konfigurasi:
- Android application ID: `com.cinewave.app`
- App name: CineWave
- App icon.
- Splash screen.
- Versioning.
- Permissions minimum yang diperlukan.

Target output:

```text
CineWave.apk
```

Gunakan EAS Build dengan profil APK yang sesuai, misalnya konfigurasi Android `buildType: apk`.

Jangan menggunakan development build sebagai APK final untuk pengguna.

Dokumentasikan:
- Cara build.
- Cara mengambil APK.
- Cara install APK.
- Cara update APK.
- Cara mengatasi Android blocking unknown apps.

---

# BAGIAN 11 — WEB REQUIREMENTS

- Responsive design.
- Desktop layout.
- Tablet layout.
- Mobile browser layout.
- SEO metadata untuk halaman publik.
- Accessible navigation.
- Loading skeleton.
- Error boundary.
- Search.
- Detail movie.
- Player.
- Add-on Manager.
- Authentication.

Web dan Android menggunakan akun, API, dan data yang sama.

---

# BAGIAN 12 — NON-FUNCTIONAL REQUIREMENTS

## Performance

- Pagination untuk katalog.
- Debounced search.
- Image optimization.
- Lazy loading.
- Cache metadata.
- Hindari N+1 database queries.
- Batasi jumlah request Add-on paralel.
- Playback URL tidak boleh di-cache melebihi masa berlaku yang ditentukan provider.

## Security

- Password hashing.
- Session protection.
- Ownership checks.
- SSRF protection.
- Input validation.
- Output sanitization.
- Secret encryption.
- Rate limiting.
- Secure headers.
- Safe logging.
- Database constraints.

## Reliability

- Error handling.
- Retry terbatas.
- Timeout.
- Health checks.
- Graceful degradation ketika provider offline.
- Monitoring backend.

---

# BAGIAN 13 — DEVELOPMENT MILESTONES

## Phase 1 — Foundation

- Setup monorepo.
- Setup package manager.
- Setup Next.js.
- Setup Expo.
- Setup PostgreSQL.
- Setup Prisma.
- Setup shared TypeScript packages.
- Setup lint dan typecheck.

Acceptance criteria:
- Web dapat berjalan.
- Android dapat berjalan.
- Keduanya dapat mengakses backend yang sama.

## Phase 2 — Authentication

- Register.
- Login.
- Logout.
- Session.
- Secure token storage.

Acceptance criteria:
- Akun dapat digunakan pada Android dan Web.
- Data pengguna terisolasi.

## Phase 3 — Catalog

- TMDB adapter.
- Movie list.
- Series list.
- Search.
- Detail page.
- Poster dan backdrop.

Acceptance criteria:
- Katalog berjalan di kedua platform.

## Phase 4 — User Data

- Watchlist.
- Watch history.
- Continue Watching.
- Sync antar perangkat.

Acceptance criteria:
- Perubahan di Android terlihat di Web dan sebaliknya.

## Phase 5 — Add-on Foundation

- Manifest validator.
- Secure URL fetcher.
- Protocol parser.
- UserAddon model.
- Installation flow.
- Ownership enforcement.

Acceptance criteria:
- User dapat memasang Add-on.
- User tidak dapat mengakses Add-on milik pengguna lain.

## Phase 6 — Add-on Resources

- Catalog.
- Meta.
- Stream.
- Subtitles.
- Response normalization.
- Health check.

Acceptance criteria:
- Resource yang didukung dapat diakses melalui adapter.
- Respons tidak valid ditangani dengan aman.

## Phase 7 — Legal Playback

- Source rights validation.
- Provider selection.
- Android player.
- Web player.
- Resume playback.
- Subtitle support.

Acceptance criteria:
- Hanya source yang memenuhi pemeriksaan hak yang dapat diputar.
- Kedua platform menangani source yang tidak kompatibel dengan baik.

## Phase 8 — UI Polish

- Responsive layout.
- Animation.
- Loading states.
- Error states.
- Empty states.
- Accessibility.

## Phase 9 — Testing

- Unit tests.
- Integration tests.
- API tests.
- Security tests.
- Android device tests.
- Web browser tests.
- E2E tests.

## Phase 10 — Deployment

- Deploy Next.js ke Vercel.
- Setup PostgreSQL.
- Setup production environment variables.
- Run migrations.
- Build Android APK.
- Test instalasi APK.
- Dokumentasikan rilis.

---

# BAGIAN 14 — ACCEPTANCE CRITERIA FINAL

Produk dianggap mencapai MVP apabila:

1. Android dapat dijalankan sebagai aplikasi.
2. Web dapat dibuka melalui browser.
3. Register dan login berjalan.
4. Akun yang sama dapat dipakai di Android dan Web.
5. Katalog film dan serial dapat ditampilkan.
6. Detail film tersedia.
7. Search berjalan.
8. Watchlist dapat disimpan.
9. Watch progress dapat disinkronkan.
10. User dapat memasukkan Manifest URL.
11. User dapat melihat preview Add-on.
12. User dapat memasang Add-on.
13. User dapat mengaktifkan dan menonaktifkan Add-on.
14. User dapat menghapus Add-on.
15. Ownership Add-on diterapkan.
16. SSRF protection diterapkan.
17. Sumber playback harus lolos pemeriksaan legalitas.
18. Player Android dan Web berfungsi pada format yang didukung.
19. APK release dapat dihasilkan dan dipasang manual.
20. Dokumentasi instalasi dan pengembangan tersedia.

---

# BAGIAN 15 — OPENCODE IMPLEMENTATION PROMPT

Salin instruksi berikut ke OpenCode setelah menyimpan dokumen ini sebagai `docs/PRD.md`.

---

## ROLE

Kamu adalah Senior Full-Stack Engineer, React Native Engineer, Backend Architect, Database Engineer, dan Application Security Engineer.

Tugas kamu adalah membangun CineWave berdasarkan PRD di atas.

Jangan hanya membuat UI prototype. Bangun aplikasi yang memiliki frontend, backend, database, API, authentication, Add-on system, serta playback architecture yang benar-benar terintegrasi.

## PRIMARY OBJECTIVE

Bangun aplikasi streaming CineWave dengan dua platform:

1. Android menggunakan React Native + Expo.
2. Web menggunakan Next.js.

Keduanya menggunakan satu backend dan satu database PostgreSQL.

Android harus dapat di-build menjadi APK untuk instalasi manual.

## IMPORTANT RULES

1. Baca seluruh dokumen `docs/PRD.md` terlebih dahulu.
2. Periksa struktur repository sebelum mengubah file.
3. Jika sudah terdapat kode, pertahankan dan kembangkan kode tersebut.
4. Jangan membuat ulang project tanpa alasan teknis yang jelas.
5. Jangan membuat UI yang hanya menggunakan data dummy sebagai hasil akhir.
6. Jangan membuat tombol yang tidak memiliki fungsi.
7. Jangan menyimpan password plaintext.
8. Jangan menjalankan JavaScript Add-on dari sumber tidak tepercaya.
9. Jangan membypass DRM.
10. Jangan menggunakan sumber streaming ilegal.
11. Jangan menganggap manifest berhasil berarti stream legal.
12. Jangan mengakses resource Add-on tanpa pemeriksaan ownership.
13. Jangan menyimpan token atau secret dalam log.
14. Jangan membuat satu database terpisah untuk Android dan Web.
15. Gunakan TypeScript strict mode.
16. Gunakan service layer dan adapter pattern.
17. Gunakan Zod untuk validasi.
18. Buat dokumentasi teknis.
19. Jangan mengklaim implementasi berhasil jika belum diuji.
20. Jika terdapat keputusan teknis yang belum ditentukan, pilih pendekatan yang paling aman dan dokumentasikan alasannya.

## IMPLEMENTATION ARCHITECTURE

Gunakan struktur:

```text
apps/mobile       React Native + Expo
apps/web          Next.js
packages/shared   Shared business logic
packages/types    Shared types
packages/validation Shared validation
packages/api-client Shared API client
prisma            Database schema
docs              Technical documentation
```

Backend dan API ditempatkan dalam aplikasi Next.js Web melalui Route Handlers, dengan service layer yang terpisah.

Pastikan Expo mobile dapat menggunakan API melalui konfigurasi `EXPO_PUBLIC_API_URL`.

Jangan mengasumsikan localhost pada perangkat Android fisik sama dengan localhost komputer pengembang.

## REQUIRED IMPLEMENTATION ORDER

### STEP 1 — REPOSITORY AUDIT

- Periksa repository.
- Periksa package manager.
- Periksa file konfigurasi.
- Periksa dependency.
- Periksa struktur folder.
- Buat implementation plan.
- Identifikasi file yang sudah tersedia.

Simpan hasil audit di:

`docs/IMPLEMENTATION_PLAN.md`

Jangan langsung menghapus atau mengganti file yang sudah ada.

### STEP 2 — MONOREPO FOUNDATION

- Setup workspace.
- Setup apps/web.
- Setup apps/mobile.
- Setup shared packages.
- Setup TypeScript.
- Setup lint.
- Setup environment configuration.

Pastikan kedua aplikasi dapat dijalankan.

### STEP 3 — DATABASE AND AUTHENTICATION

- Implementasikan Prisma.
- Buat PostgreSQL schema.
- Buat migrations.
- Implementasikan User.
- Implementasikan authentication.
- Implementasikan session management.
- Implementasikan secure storage pada Android.
- Implementasikan authorization.

Buat seed data development jika diperlukan.

### STEP 4 — WEB UI

Bangun:
- Landing atau Home.
- Authentication pages.
- Explore.
- Search.
- Movie detail.
- Series detail.
- My List.
- Profile.
- Add-on Manager.
- Player.

Gunakan design system cinematic dark.

### STEP 5 — ANDROID UI

Bangun:
- Bottom navigation.
- Home.
- Explore.
- Search.
- Movie detail.
- Series detail.
- My List.
- Profile.
- Add-on Manager.
- Player.

Jangan sekadar menyalin layout desktop ke layar Android.

Buat komponen yang sesuai dengan pola navigasi dan interaksi mobile.

### STEP 6 — CATALOG AND PROVIDERS

- Implementasikan TMDB adapter.
- Implementasikan catalog services.
- Implementasikan search.
- Implementasikan detail.
- Implementasikan pagination.
- Implementasikan caching.

Pisahkan metadata provider dari video provider.

### STEP 7 — USER DATA

- Implementasikan Watchlist.
- Implementasikan WatchProgress.
- Implementasikan WatchHistory.
- Implementasikan Continue Watching.
- Implementasikan sinkronisasi antar perangkat.

### STEP 8 — ADD-ON SYSTEM

Implementasikan sistem instalasi Add-on berdasarkan PRD.

Wajib:
- Manifest preview.
- Manifest validation.
- Protocol capability detection.
- User-owned installation.
- Enable.
- Disable.
- Remove.
- Refresh.
- Test connection.
- Catalog resource.
- Meta resource.
- Stream resource.
- Subtitle resource.

Buat:
- AddonService.
- AddonProtocolAdapter.
- ManifestValidator.
- SecureOutboundHttpClient.
- AddonOwnershipService.
- AddonHealthService.
- AddonResponseNormalizer.

Gunakan subset Stremio-compatible protocol yang terdokumentasi.

Jangan menganggap semua Add-on mendukung resource yang sama.

### STEP 9 — ADD-ON SECURITY

Implementasikan:
- SSRF protection.
- IP validation.
- DNS resolution checks.
- Redirect validation.
- DNS rebinding protection.
- Timeout.
- Response size limit.
- Rate limit.
- Request concurrency limit.
- Content type validation.
- Secret redaction.
- Configuration encryption.
- Ownership checks.

Tambahkan automated security tests.

### STEP 10 — LEGAL PLAYBACK

Implementasikan:
- Source license status.
- Source rights validation.
- Playback eligibility.
- Provider source normalization.
- Android player.
- Web player.
- Subtitle support.
- Playback progress.

Sumber dengan status pending, rejected, expired, atau tidak memenuhi hak wilayah tidak boleh diberikan sebagai sumber playback yang dapat digunakan.

### STEP 11 — ANDROID APK

Konfigurasikan Expo EAS Build.

Target:
- Android release build.
- APK output.
- Application ID `com.cinewave.app`.
- App icon.
- Splash screen.
- Versioning.

Buat dokumentasi:

`docs/ANDROID_BUILD.md`

Dokumentasikan:
- Cara development.
- Cara build APK.
- Cara mengunduh hasil build.
- Cara memasang APK secara manual.
- Cara memperbarui aplikasi.

### STEP 12 — TESTING

Jalankan:

- Lint.
- Typecheck.
- Unit tests.
- Integration tests.
- API tests.
- Database tests.
- Security tests.
- Web build.
- Android build atau pemeriksaan konfigurasi build.

Tes Add-on wajib mencakup:
- Invalid manifest.
- Duplicate installation.
- Unauthorized ownership.
- Enable/disable.
- Refresh.
- Timeout.
- SSRF.
- Redirect.
- Private IP.
- DNS rebinding.
- Oversized response.
- Invalid protocol resource.
- Illegal/unverified playback.
- Secret redaction.

Tes Android dan Web secara terpisah.

### STEP 13 — DOCUMENTATION

Buat dokumentasi:

```text
docs/IMPLEMENTATION_PLAN.md
docs/ANDROID_SPEC.md
docs/WEB_SPEC.md
docs/API_SPEC.md
docs/DATABASE_SPEC.md
docs/ADDON_ARCHITECTURE.md
docs/ADDON_PROTOCOL.md
docs/ADDON_SECURITY.md
docs/ANDROID_BUILD.md
docs/DEPLOYMENT.md
```

Update README dengan instruksi instalasi dan penggunaan.

## DEFINITION OF DONE

Jangan menyatakan proyek selesai jika:
- Android belum dapat dijalankan.
- Web belum dapat dijalankan.
- Database belum terhubung.
- API belum berfungsi.
- Authentication belum berfungsi.
- Add-on belum dapat dipasang.
- Ownership belum aman.
- Playback belum diuji.
- APK belum berhasil di-build atau keterbatasan build belum dijelaskan.
- Dokumentasi belum dibuat.

## FINAL REPORT

Setelah setiap milestone, berikan laporan:

1. Fitur yang selesai.
2. File yang dibuat.
3. File yang diubah.
4. Database migration.
5. API yang tersedia.
6. Test yang berhasil.
7. Test yang gagal.
8. Bug yang masih ada.
9. Cara menjalankan aplikasi.
10. Langkah berikutnya.

Jangan mengerjakan seluruh sistem secara terburu-buru dalam satu perubahan besar. Implementasikan secara bertahap, jalankan tes, dan perbaiki error sebelum melanjutkan.

**Mulai dari STEP 1: REPOSITORY AUDIT.**