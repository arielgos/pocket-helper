# Firebase Functions - Message Processing

This directory contains the Firebase Functions implementation for processing chat messages.

## Features

### Gemini API Integration
The system now includes functionality to:
1. Query the Google Gemini API for message descriptions
2. Validate posts against web articles

### New Functions

#### `queryGeminiForDescription(messageText: string)`: 
Generates a concise description for a message using the Gemini API.

#### `validatePostAgainstWebArticles(messageText: string)`:
Validates message content against web articles for factual accuracy.

## Environment Variables Required

- `GEMINI_API_KEY`: API key for accessing the Google Gemini API

## Implementation Details

The system processes new messages in the Realtime Database and:
1. Validates that messages come from authorized users (arielgos)
2. Generates descriptions using the Gemini API
3. Validates posts against web articles for content verification

## Deployment Notes

When deploying to Firebase, ensure the `GEMINI_API_KEY` environment variable is set in your Firebase project configuration.

## Functionality

### Health Endpoint
- `health` - HTTP endpoint for monitoring system status

### Message Processing
- `onNewMessageCreated` - Realtime Database trigger that:
  - Validates messages come from authorized user (arielgos)
  - Queries Gemini API for message descriptions
  - Validates posts against web articles
  - Logs all operations for monitoring and debugging

## Dependencies

- `node-fetch` - For making HTTP requests to the Gemini API

## Best Practices

1. **Use specific paths**: Avoid listening at the root of your database to prevent performance issues
2. **Handle errors gracefully**: Wrap your logic in try-catch blocks when needed
3. **Use parameters for dynamic paths**: Leverage path wildcards to capture values for processing
4. **Consider function regions**: Ensure your database instance and function region match for optimal performance

## Function Configuration

You can configure your functions with specific regions:

```typescript
import { setGlobalOptions } from "firebase-functions/v2";

// Set the region for all functions
setGlobalOptions({ 
  region: "us-central1",
  maxInstances: 10 
});
```