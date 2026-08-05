# Pocket Helper Chat

A Firebase-powered chat application with real-time message validation and processing.

## Project Structure

```
pocket-helper/
├── app/                 # Mobile application (React Native)
│   ├── package.json
│   ├── App.tsx
│   └── src/             # Application source code
├── backend/             # Firebase Functions backend
│   ├── functions/       # Cloud Functions
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/         # Function source code
│   ├── firebase.json    # Firebase configuration
│   └── public/          # Static files for hosting
└── README.md            # This file
```

## Backend Functions

The backend consists of Firebase Cloud Functions that handle real-time chat message processing:

### Key Features
- Realtime Database message monitoring
- Message payload validation and normalization
- Authorization (only accepts messages from authorized user)
- Health check endpoint for monitoring
- Logging for debugging and monitoring

### Functions
1. **Health Check Endpoint** (`/health`)
   - Simple endpoint for monitoring system status
   - Returns "OK" when accessible

2. **Message Processing Function** (`onNewMessageCreated`)
   - Triggers on new messages in the Realtime Database
   - Validates message format and content
   - Authorizes messages from specific user (arielgos)
   - Logs all processed messages

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

## Firebase Configuration

The project uses Firebase Realtime Database for storing chat messages and Cloud Functions for processing them.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.