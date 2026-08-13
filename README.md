# Pocket Helper Chat

A Firebase-powered chat application with real-time message validation and processing.

## Project Structure

```
pocket-helper/
├── app/                 # Mobile application (React Native + Expo)
│   ├── package.json
│   ├── App.tsx
│   ├── src/             # Application source code
│   ├── android/         # Android-specific configuration
│   ├── ios/             # iOS-specific configuration
│   └── packages/        # Native modules (Android local validator)
│       └── android-local-message-validator/
├── backend/             # Firebase Functions backend
│   ├── functions/       # Cloud Functions
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/         # Function source code
│   ├── firebase.json    # Firebase configuration
│   └── hosting/         # Web hosting configuration (Vite)
├── README.md            # This file
```

## Backend Functions

The backend consists of Firebase Cloud Functions that handle real-time chat message processing:

### Key Features
- Realtime Database message monitoring
- Message payload validation and normalization
- Authorization (only accepts messages from authorized user)
- Health check endpoint for monitoring
- Logging for debugging and monitoring
- Gemini API integration for message description generation
- Content validation against web articles

### Functions
1. **Health Check Endpoint** (`/health`)
   - Simple endpoint for monitoring system status
   - Returns "OK" when accessible

2. **Message Processing Function** (`onNewMessageCreated`)
   - Triggers on new messages in the Realtime Database
   - Validates message format and content
   - Authorizes messages from specific user (arielgos)
   - Logs all processed messages
   - Generates descriptions using Gemini API
   - Validates posts against web articles for factual accuracy

### Setup Instructions

1. **Prerequisites**
   - Node.js v24
   - Firebase CLI
   - Expo CLI (for mobile app)

2. **Backend Setup**
   ```bash
   cd backend/functions
   npm install
   ```

3. **Deploy Functions**
   ```bash
   firebase deploy --only functions
   ```

4. **Mobile App Setup**
   ```bash
   cd app
   npm install
   ```

## Mobile Application

The mobile application is built with React Native and Expo:

- Uses Firebase Realtime Database for chat messages
- Implements local message validation using Android-specific modules
- Provides real-time chat interface with message history
- Supports multiple platforms (Android, iOS, Web)

## Firebase Configuration

The project uses Firebase Realtime Database for storing chat messages and Cloud Functions for processing them.

## Android Local Message Validator

The Android validator package lives in:
- `app/packages/android-local-message-validator/`

It uses:
- ML Kit language identification
- MediaPipe LLM Inference for the on-device model

This native module will only be available in a custom Android development build or a production build that includes the package. Expo Go will not load it.

Before the Android build can validate messages locally, place a quantized `message-validator.task` model in the Android app's internal storage at:
- `<app-internal-storage>/local-llm/message-validator.task`

## Web Hosting

The project includes web hosting configuration using Vite:
- `backend/hosting/` - Contains the web application for hosting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.