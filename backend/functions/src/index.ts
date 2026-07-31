import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/v2/database";
import * as logger from "firebase-functions/logger";

// Configure global options for v2 functions
setGlobalOptions({ maxInstances: 10 });

export const health = onRequest((request, response) => {
  // Log request details safely (do NOT pass raw request or response objects)
  logger.info("Health check received", {
    method: request.method,
    path: request.path,
  });

  response.send("OK");
});

// Realtime Database onCreate trigger - fires on every new insert
export const onNewMessageCreated = onValueCreated(
  "/messages/{pushId}",
  async (event) => {
    // 1. Guard against empty data snapshots
    if (!event.data.exists()) {
      return null;
    }

    // 2. Correct access to the DataSnapshot value
    const newData = event.data.val();
    const pushId = event.params.pushId;

    // 3. Log safely (avoid logging sensitive full message payloads)
    logger.info("New message created", {
      pushId,
      hasText: Boolean(newData?.text), // example safe logging
    });

    // 4. Perform your async tasks here, for example:
    // await sendNotification(pushId, newData);

    return null;
  },
);
