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
2. App sends the text to Gemini for understandability validation
3. If Gemini says the message is understandable, app writes to `/messages` in Realtime Database
4. If not understandable, app blocks sending and shows Gemini's reason
5. Messages are streamed live from Firebase and rendered in the chat list

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
