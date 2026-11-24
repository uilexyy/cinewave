# Database Specification

## Overview

PostgreSQL database with Prisma ORM. Single database for both Android and Web.

## Connection

```
DATABASE_URL="postgresql://user:password@localhost:5432/cinewave?schema=public"
```

## Models

### User
- `id` (cuid), `name`, `email` (unique), `passwordHash`
- Relations: sessions, watchlists, watchProgress, userAddons, requestLogs, playbackSessions, passwordResets

### Session
- `id` (cuid), `userId`, `tokenHash` (unique), `expiresAt`
- Token stored as SHA-256 hash

### PasswordResetToken
- `id` (cuid), `userId`, `tokenHash` (unique), `expiresAt`

### Title
- `id` (cuid), `externalId` (unique), `title`, `originalTitle`, `overview`
- `posterPath`, `backdropPath`, `releaseDate`, `contentType` (enum), `genres` (JSON string), `rating`

### Season / Episode
- Season: `titleId`, `seasonNumber` (unique per title)
- Episode: `seasonId`, `episodeNumber` (unique per season), `name`, `overview`, `runtime`

### Provider / ProviderItem
- Provider: `name`, `type`, `baseUrl`, `enabled`
- ProviderItem: `providerId`, `externalId`, `titleId`, `metadata` (JSON)

### VideoSource
- `titleId`, `episodeId`, `providerId`, `sourceUrl`, `format`, `quality`
- `legalStatus` (enum: PENDING_REVIEW, APPROVED, REJECTED, EXPIRED)

### SourceLicense
- `videoSourceId`, `rightsHolder`, `licenseType`, `territory`, `validFrom`, `validUntil`, `status`

### SubtitleTrack
- `titleId`, `episodeId`, `language`, `format`, `url`

### UserAddon
- `userId`, `name`, `manifestUrlEncrypted`, `version`, `description`
- `enabled`, `priority`, `healthStatus`, `lastCheckedAt`

### AddonRequestLog
- `userId`, `addonId`, `resource`, `statusCode`, `responseTime`, `errorCode`

### AddonHealthCheck
- `addonId`, `status`, `responseTime`, `errorCode`

### WatchProgress
- `userId`, `titleId`, `episodeId`, `positionSeconds`, `durationSeconds`, `completed`
- Unique: (userId, titleId, episodeId)

### Watchlist
- `userId`, `titleId`
- Unique: (userId, titleId)

### PlaybackSession
- `userId`, `titleId`, `episodeId`, `sourceId`, `startedAt`, `endedAt`

## Enums

- `ContentType`: MOVIE, SERIES, ANIME, DOCUMENTARY
- `LegalStatus`: PENDING_REVIEW, APPROVED, REJECTED, EXPIRED

## Migrations

Run migrations with:
```bash
npx prisma migrate dev --name <migration_name>
```

Seed database:
```bash
npx prisma db seed
```
