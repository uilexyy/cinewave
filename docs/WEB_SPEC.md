# Web Specification

## Overview

CineWave Web is built with Next.js 16 (App Router), serving both the frontend and backend API.

## Architecture

- **Framework**: Next.js 16 (App Router)
- **Rendering**: Server Components + Client Components
- **Styling**: Inline styles (dark theme)
- **State**: React hooks (useState, useEffect)
- **Auth**: Cookie-based sessions (httpOnly, sameSite: lax)
- **API**: Route Handlers in `/app/api/v1/*`

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Home page |
| `/login` | `app/login/page.tsx` | Login form |
| `/register` | `app/register/page.tsx` | Registration form |
| `/profile` | `app/profile/page.tsx` | User profile |

## API Routes

All API routes are under `/api/v1/`:

- `/auth/*` — Authentication (register, login, logout, me, forgot-password, reset-password)
- `/catalog/*` — Catalog (home, movies, series, anime, documentaries, search, title/[id])
- `/watchlist` — Watchlist management
- `/history` — Watch history management
- `/addons/*` — Add-on management
- `/playback/*` — Playback sources and sessions

## Authentication

- Sessions stored in PostgreSQL `Session` table.
- Token hashed with SHA-256 before storage.
- Cookie: `cinewave_session` (httpOnly, sameSite: lax, secure in production).
- Bearer token also supported for mobile clients.

## Database

- PostgreSQL via Prisma ORM.
- Connection string in `DATABASE_URL` env var.
- Schema: `prisma/schema.prisma`.

## Security

- Password hashing with bcryptjs.
- CSRF protection via sameSite cookies.
- SSRF protection on outbound requests (add-on system).
- Input validation with Zod schemas.
- Ownership checks on all user data operations.

## Build & Deploy

- Build: `pnpm --filter @cinewave/web build`
- Start: `pnpm --filter @cinewave/web start`
- Deploy: Vercel (recommended) or any Node.js host
