# Firebase Functions - Realtime Database Triggers

This document explains how to implement Firebase Realtime Database triggers in your Firebase Functions v2 environment.

## Overview

Firebase Functions v2 provides support for Realtime Database triggers that can respond to data creation, updates, and deletions in your Firebase Realtime Database.

## Available Triggers

- `onValueCreated()` - Triggered when data is created in Realtime Database
- `onValueUpdated()` - Triggered when data is updated in Realtime Database  
- `onValueDeleted()` - Triggered when data is deleted from Realtime Database
- `onValueWritten()` - Triggered when data is created, updated, or deleted

## Implementation Examples

### Basic onCreate Trigger

```typescript
import { onValueCreated } from "firebase-functions/v2/database";
import * as logger from "firebase-functions/logger";
import admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

export const onNewMessageCreated = onValueCreated(
  "/messages/{pushId}",
  (event) => {
    // Get the data that was created
    const newData = event.data.after.val();
    
    // Log the creation event
    logger.info("New message created", {
      pushId: event.params.pushId,
      data: newData
    });
    
    // Process the new data as needed
    return null;
  }
);
```

### Wildcard Path Matching

```typescript
// This will match any creation in /users/{userId}/messages/{messageId}
export const onUserMessageCreated = onValueCreated(
  "/users/{userId}/messages/{messageId}",
  (event) => {
    const messageData = event.data.after.val();
    
    logger.info("User message created", {
      userId: event.params.userId,
      messageId: event.params.messageId,
      data: messageData
    });
    
    return null;
  }
);
```

### Handling Data Changes

```typescript
// This example shows how to handle data changes with before/after snapshots
import { onValueWritten } from "firebase-functions/v2/database";

export const onMessageUpdated = onValueWritten(
  "/messages/{pushId}",
  (event) => {
    const beforeData = event.data.before.val();
    const afterData = event.data.after.val();
    
    // Only process if this is a creation (before data doesn't exist)
    if (!beforeData && afterData) {
      logger.info("New message created", {
        pushId: event.params.pushId,
        data: afterData
      });
    }
    
    return null;
  }
);
```

## Deployment

To deploy your database triggers, run:

```bash
cd backend/functions
npm run build
firebase deploy --only functions
```

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