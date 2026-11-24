# Android Specification

## Overview

CineWave Android is built with React Native + Expo, distributed as a manually installed APK.

## Architecture

- **Framework**: Expo 58 + Expo Router
- **Navigation**: Bottom tab navigation (Home, Watchlist, History, Add-ons)
- **State**: React Context (AuthContext) + local component state
- **Storage**: expo-secure-store for auth tokens
- **API Client**: Fetch-based HTTP client using `EXPO_PUBLIC_API_URL`

## Screens

| Screen | File | Description |
|--------|------|-------------|
| Home | `app/(tabs)/index.tsx` | Catalog listing from `/api/v1/catalog/home` |
| Watchlist | `app/(tabs)/watchlist.tsx` | User's saved titles |
| History | `app/(tabs)/history.tsx` | Watch progress and history |
| Add-ons | `app/(tabs)/addons.tsx` | Installed add-ons list |
| Login | `app/login.tsx` | Email/password login |
| Register | `app/register.tsx` | User registration |
| Player | `app/player.tsx` | Expo Video player |

## Authentication

- Token stored in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android).
- Token sent as `Authorization: Bearer <token>` header.
- Session validated against backend `/api/v1/auth/me`.

## Security

- Secure token storage (no plaintext).
- HTTPS required for production.
- No sensitive data in AsyncStorage.

## Build

- Application ID: `com.cinewave.app`
- Minimum SDK: 23 (Android 6.0)
- Target SDK: 34 (Android 14)
- Build profile: EAS Build (`preview` for APK, `production` for AAB)

## Permissions

- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`

## Dependencies

- expo ~58.0.26
- expo-router ~58.0.32
- expo-secure-store ^58.0.3
- expo-video ~58.0.14
- react-native 0.88.1
