# Android Build Guide

## Prerequisites

- Node.js 18+
- pnpm 9+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Android Studio (for local builds, optional)

## Environment Variables

Set `EXPO_PUBLIC_API_URL` to your backend URL in `.env` before building:

```
EXPO_PUBLIC_API_URL=https://your-backend-url.com
```

## EAS Build (Recommended)

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

### 3. Configure Project

```bash
cd apps/mobile
eas build:configure
```

### 4. Build APK (Preview Profile)

```bash
eas build --platform android --profile preview
```

This produces a standalone APK file (`CineWave.apk`) that can be installed manually.

### 5. Download APK

After the build completes, download the APK from the Expo dashboard or use:

```bash
eas build:list --platform android --limit 1
```

## Local Build (Alternative)

### 1. Generate Native Code

```bash
cd apps/mobile
npx expo prebuild --platform android
```

### 2. Build with Gradle

```bash
cd android
./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

### 3. Sign APK (if needed)

```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore your-key.jks \
  android/app/build/outputs/apk/release/app-release.apk \
  your-alias
```

## Manual Installation

1. Transfer `CineWave.apk` to the Android device.
2. Enable "Install from unknown sources" in Android settings:
   - Settings > Security > Unknown sources (Android 7 and below)
   - Settings > Apps > Special access > Install unknown apps (Android 8+)
3. Open the APK file and follow the installation prompts.
4. If blocked by "Play Protect", tap "Install anyway" or disable Play Protect temporarily.

## Update Procedure

1. Increment `version` in `apps/mobile/app.json`.
2. Rebuild the APK using EAS Build.
3. Users must uninstall the old version before installing the new one (or use the same signing key for seamless updates).

## Application Details

- **Package Name**: `com.cinewave.app`
- **Minimum Android Version**: Android 6.0 (API 23)
- **Target Android Version**: Android 14 (API 34)
- **Permissions**: INTERNET, ACCESS_NETWORK_STATE
- **Backend URL**: Configured via `EXPO_PUBLIC_API_URL`

## Troubleshooting

### "App not installed" error
- Ensure the APK is signed with the same key as the previously installed version.
- Uninstall the old version first, then install the new one.

### "Parse error" during installation
- The APK may be corrupted. Re-download and retry.
- Ensure the device architecture matches (arm64-v8a, armeabi-v7a, x86_64).

### Network issues
- Ensure the device can reach the backend URL configured in `EXPO_PUBLIC_API_URL`.
- Use a public URL or LAN IP, not `localhost`.
