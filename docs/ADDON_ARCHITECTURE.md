# Add-on Architecture

## Overview

CineWave implements a subset of the Stremio Add-on Protocol with security hardening.

## Components

### AddonService (`lib/addon-service.ts`)
- `validateManifest(raw)` — validates manifest JSON structure
- `fetchManifest(url)` — fetches and validates manifest from URL

### SSRF Guard (`lib/ssrf-guard.ts`)
- `isPrivateIp(ip)` — checks if IP is in private range
- `isBlockedHost(hostname)` — checks if hostname is blocked
- `safeFetch(url, timeout)` — secure HTTP fetch with DNS rebinding protection

### API Routes
- `POST /api/v1/addons/preview` — validate manifest before install
- `GET /api/v1/addons` — list user's add-ons
- `POST /api/v1/addons` — install add-on (encrypted manifest URL)
- `DELETE /api/v1/addons?id=` — remove add-on
- `PATCH /api/v1/addons/:id` — enable/disable/priority
- `POST /api/v1/addons/:id/refresh` — health check

## Data Flow

1. User enters manifest URL
2. Preview endpoint fetches manifest (SSRF-protected)
3. Manifest validated (required fields, resource types)
4. User confirms install
5. Manifest URL encrypted and stored in UserAddon
6. Health check runs on refresh

## Security

- HTTPS required for manifest URLs
- DNS rebinding protection
- Private IP blocking
- Response size limit (1MB)
- Timeout enforcement (10s)
- User ownership enforcement
- Secret redaction in logs
