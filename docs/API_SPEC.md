# API Specification

## Base URL

All endpoints are prefixed with `/api/v1`.

## Authentication

Most endpoints require authentication via either:
- Cookie: `cinewave_session` (web)
- Header: `Authorization: Bearer <token>` (mobile)

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": { ... }
}
```

## Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/logout` | Logout user |
| GET | `/auth/me` | Get current user |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

### Catalog

| Method | Path | Description |
|--------|------|-------------|
| GET | `/catalog/home` | Home page sections (trending, popular, etc.) |
| GET | `/catalog/movies?page=1&genre=` | List movies (paginated) |
| GET | `/catalog/series?page=1&genre=` | List series (paginated) |
| GET | `/catalog/anime?page=1` | List anime (paginated) |
| GET | `/catalog/documentaries?page=1` | List documentaries (paginated) |
| GET | `/catalog/search?q=query&page=1` | Search titles |
| GET | `/catalog/title/:id?type=movie` | Title details |

### User Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/watchlist` | Get user's watchlist |
| POST | `/watchlist` | Add title to watchlist |
| DELETE | `/watchlist?titleId=` | Remove title from watchlist |
| GET | `/history` | Get watch history |
| POST | `/history` | Update watch progress |
| PATCH | `/history?id=` | Mark as completed |
| DELETE | `/history?id=` | Remove from history |

### Add-ons

| Method | Path | Description |
|--------|------|-------------|
| POST | `/addons/preview` | Preview manifest from URL |
| GET | `/addons` | List installed add-ons |
| POST | `/addons` | Install add-on |
| DELETE | `/addons?id=` | Remove add-on |
| PATCH | `/addons/:id` | Update add-on (enable/disable) |
| GET | `/addons/:id` | Get add-on details |
| POST | `/addons/:id/refresh` | Refresh manifest & health check |

### Playback

| Method | Path | Description |
|--------|------|-------------|
| GET | `/playback/:titleId?episodeId=` | Get approved sources & subtitles |
| POST | `/playback/sessions` | Start playback session |
| PATCH | `/playback/sessions` | End playback session |
