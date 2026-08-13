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
- MediaPipe LLM Inference for the on-device model

This native module will only be available in a custom Android development build
or a production build that includes the package. Expo Go will not load it.

### Setting up the on-device model

If the model isn't available, validation automatically falls back to the
Gemini API (see `src/messageValidation.ts`) instead of failing. There are three
ways to make on-device validation actually run, in order of effort:

0. **Simplest: download it at runtime (no dev-machine step, no bundling).**
   Host a `.task` file somewhere reachable over plain HTTPS (no auth headers
   supported), e.g. Firebase Storage/GCS/S3 with a public read URL, then set:

   ```bash
   EXPO_PUBLIC_LOCAL_LLM_MODEL_URL=https://your-host/message-validator.task
   ```

   in `.env`. On the first call to `validateMessageUnderstandability` on
   Android, the app calls the native `isModelReady()`/`downloadModel(url)`
   functions to fetch it once into the app's internal storage
   (`packages/android-local-message-validator`'s `LocalMessageValidatorModule.kt`)
   — no `adb push`, no bundled asset. Note this won't work directly with gated
   Hugging Face URLs, which require an `Authorization` header; host a copy
   yourself or use option 2 below.

1. **Bundle a quantized MediaPipe LLM `.task` file as a build-time asset:**

   - `packages/android-local-message-validator/android/src/main/assets/message-validator.task`

   On first use, the native module copies it from assets into the app's
   internal storage automatically — no manual `adb push` needed after the
   initial setup.

Two ways to get a `.task` file to use with option 1 (asset) or to host
yourself for option 0, both documented in the
[MediaPipe LLM Inference guide](https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference):

2. **Recommended: download a pre-converted community model.** Browse
   [LiteRT Community on Hugging Face](https://huggingface.co/litert-community)
   (e.g. `litert-community/Gemma3-1B-IT`), accept the model's license, create a
   read-scoped Hugging Face access token, then run:

   ```bash
   HF_TOKEN=hf_xxx npm run model:download -- litert-community/Gemma3-1B-IT <exact-filename-from-repo>.task
   ```

   Check the repo's "Files" tab for the exact filename (there are usually CPU
   and GPU quantized variants).

3. **Advanced: convert your own PyTorch checkpoint** using the
   [AI Edge Torch Generative API](https://github.com/google-ai-edge/litert-torch/tree/main/litert_torch/generative)
   to produce a `.tflite` file, then bundle it with its tokenizer:

   ```bash
   pip install mediapipe
   npm run model:bundle -- \
     --tflite-model /path/to/model.tflite \
     --tokenizer-model /path/to/tokenizer.model \
     --start-token "<bos>" \
     --stop-token "<eos>" \
     --output packages/android-local-message-validator/android/src/main/assets/message-validator.task
   ```

After either option, rebuild with `npx expo run:android`. The `.task` file is
gitignored since it's a large binary — each developer/CI job needs to run one
of the steps above once.

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
