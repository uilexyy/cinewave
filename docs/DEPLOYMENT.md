# Deployment Guide

## Prerequisites

- Node.js 18+ and pnpm 9+
- PostgreSQL database (production)
- TMDB API key (for live catalog data)
- Vercel account (recommended) or Node.js server

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="postgresql://user:password@host:5432/cinewave?schema=public"
TMDB_API_KEY=your_tmdb_api_key
EXPO_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_API_URL=https://your-backend-url.com
ENCRYPTION_SECRET=your-32-character-secret-key
```

## Database Setup

```bash
pnpm install
npx prisma migrate deploy
npx prisma db seed
```

## Web Deployment (Vercel)

1. Connect repository to Vercel.
2. Set build command: `pnpm build`
3. Set root directory: `apps/web`
4. Add environment variables in Vercel dashboard.
5. Deploy.

## Web Deployment (Self-hosted)

```bash
cd apps/web
pnpm build
pnpm start
```

Server runs on port 3000 by default.

## Android APK

See `docs/ANDROID_BUILD.md` for detailed instructions.

```bash
cd apps/mobile
eas build --platform android --profile preview
```

## Production Checklist

- [ ] Set `TMDB_API_KEY` for live catalog data
- [ ] Set `ENCRYPTION_SECRET` for add-on URL encryption
- [ ] Use HTTPS for `EXPO_PUBLIC_API_URL`
- [ ] Configure PostgreSQL with SSL
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Monitor error logs
- [ ] Test APK installation on device

## Health Check

```bash
curl https://your-backend-url.com/api/v1/auth/me
```

Should return `401 Unauthorized` (endpoint is alive).
