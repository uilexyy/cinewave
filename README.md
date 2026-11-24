# CineWave

CineWave is a streaming application for movies and TV shows, built with React Native + Expo for Android and Next.js for Web, sharing a common PostgreSQL backend.

## Features

- 🔐 **Authentication**: Register, login, logout, forgot/reset password, secure token storage
- 🎬 **Catalog**: Trending, popular, top-rated, anime, documentaries from TMDB
- 🔍 **Search**: Multi-media search across movies and series
- 📋 **User Data**: Watchlist, watch history, continue watching
- 🧩 **Add-on System**: Stremio add-on protocol with manifest validation and security
- ▶️ **Playback**: Legal source validation, playback sessions, subtitles

## Tech Stack

- **Web**: Next.js 16, React, TypeScript, Prisma, PostgreSQL
- **Android**: React Native + Expo 58, TypeScript, Prisma, PostgreSQL
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: Token-based (SHA-256 hashed, bcrypt password hashing)
- **Streaming**: TMDB API, video sources with legal status checks

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL database
- TMDB API key

### Installation

```bash
# Install dependencies
pnpm install

# Copy env
cp .env.example .env

# Setup database
npx prisma migrate deploy
npx prisma db seed

# Start web
pnpm --filter @cinewave/web dev

# Start mobile
cd apps/mobile
npx expo start
```

## Available Scripts

### Root

- `pnpm dev` — Start all dev servers
- `pnpm build` — Build all apps
- `pnpm lint` — Lint all apps
- `pnpm test` — Run all tests
- `pnpm db:push` — Push Prisma schema to database
- `pnpm db:generate` — Generate Prisma client
- `pnpm db:migrate` — Create migration
- `pnpm db:seed` — Seed database

### Web (`apps/web`)

- `pnpm dev` — Start Next.js dev server
- `pnpm build` — Build Next.js app
- `pnpm lint` — Lint Next.js app
- `pnpm typecheck` — TypeScript check
- `pnpm test` — Run all tests

### Mobile (`apps/mobile`)

- `npx expo start` — Start Expo dev server
- `npx expo run:android` — Run on Android device
- `npx tsc --noEmit` — TypeScript check
- `pnpm lint` — Lint mobile app

## Testing

```bash
# Run all tests
pnpm -C apps/web test

# Run individual tests
npx tsx tests/auth.test.ts
npx tsx tests/catalog.test.ts
npx tsx tests/userData.test.ts
npx tsx tests/addons.test.ts
npx tsx tests/security.test.ts
```

## Android APK

See `docs/ANDROID_BUILD.md` for APK build and installation instructions.

```bash
cd apps/mobile
eas build --platform android --profile preview
```

## Deployment

See `docs/DEPLOYMENT.md` for deployment guides.

## Documentation

- `docs/PRD.md` — Product Requirements Document
- `docs/IMPLEMENTATION_PLAN.md` — Implementation Plan
- `docs/WEB_SPEC.md` — Web Specification
- `docs/ANDROID_SPEC.md` — Android Specification
- `docs/API_SPEC.md` — API Specification
- `docs/DATABASE_SPEC.md` — Database Specification
- `docs/ADDON_ARCHITECTURE.md` — Add-on Architecture
- `docs/ADDON_PROTOCOL.md` — Add-on Protocol
- `docs/ADDON_SECURITY.md` — Add-on Security
- `docs/ANDROID_BUILD.md` — Android Build
- `docs/DEPLOYMENT.md` — Deployment

## License

Proprietary. All rights reserved.
