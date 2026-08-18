# Pocket Helper Chat (React Native + Firebase)

This folder contains an Expo React Native chat app that:

- sends and receives messages in **Firebase Realtime Database**
- validates each outgoing message with **Gemini** before sending

## Requirements

- Node.js 18+
- npm
- Firebase project with Realtime Database enabled
- Gemini API key

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill all values in `.env`:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_GEMINI_API_KEY`
- `EXPO_PUBLIC_GEMINI_MODEL` (example: `gemini-2.0-flash`)

3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm start
```

## Scripts

- `npm start` - start Expo dev server
- `npm run android` - run on Android
- `npm run ios` - run on iOS
- `npm run web` - run on web
- `npm run typecheck` - run TypeScript checks

## How message flow works

1. User types a message and taps **Send**
2. On Android, the app validates the text with the local ML Kit + native LLM module
3. On non-Android platforms, the app falls back to Gemini validation
4. If the validator says the message is understandable, app writes to `/messages` in Realtime Database
5. If not understandable, app blocks sending and shows the reason
6. Messages are streamed live from Firebase and rendered in the chat list

## Architecture

- `src/components/` - presentational UI pieces
- `src/hooks/` - stateful chat logic
- `src/services/` - Firebase chat access and user ID helpers
- `src/types/` - shared domain types
- `src/i18n/` - string catalog and translation helper

## Android local validator

The Android validator package lives in:

- [`packages/android-local-message-validator/`](./packages/android-local-message-validator)

It uses:

- ML Kit language identification
- ML Kit GenAI Prompt API, which runs **Gemini Nano** on-device via Android's
  AICore system service

This native module will only be available in a custom Android development build
or a production build that includes the package. Expo Go will not load it.

### On-device model availability

Unlike a bundled/downloaded model file, Gemini Nano is managed entirely by the
OS: AICore downloads and updates the model itself, so there's nothing to bundle
or host. Requirements:

- Android API level 26+ (the app's `minSdkVersion` is set to 26 for this)
- A device with AICore/Gemini Nano support (mainly recent Pixel devices), with
  a **locked bootloader** — unlocked bootloaders are unsupported
- The device must have downloaded AICore's latest configuration at least once
  (usually automatic within a few minutes to hours of having network access)

On first use, `LocalMessageValidatorModule.kt` calls `isModelReady()` /
`downloadModel()`, which check the feature status via
`GenerativeModel.checkStatus()` and trigger `GenerativeModel.download()` if the
feature is downloadable but not yet available. If Gemini Nano is unavailable or
the module isn't present (e.g. Expo Go, non-Pixel devices, unlocked
bootloader), validation automatically falls back to the Gemini API (see
`src/messageValidation.ts`) instead of failing.

## Firebase data shape

Messages are stored under `/messages` with values like:

```json
{
  "text": "Hello there",
  "createdAt": 1753900000000,
  "userId": "user-abc12345"
}
```

## Notes

- The app fails fast if required Firebase or Gemini env vars are missing.
- Current validation call is client-side and uses an Expo public key variable.
