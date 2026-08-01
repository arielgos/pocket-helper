import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/v2/database";
import * as logger from "firebase-functions/logger";

const FUNCTION_MAX_INSTANCES = 10;
const MESSAGES_PATH = "/messages/{pushId}";

type MessagePayload = {
  text?: string | null;
  [key: string]: unknown;
};

type RequestMetadata = {
  method: string;
  path: string;
};

// Configure global options for v2 functions
setGlobalOptions({ maxInstances: FUNCTION_MAX_INSTANCES });

function logHealthCheck(request: RequestMetadata): void {
  logger.info("Health check received", {
    method: request.method,
    path: request.path,
  });
}

function normalizeMessagePayload(value: unknown): MessagePayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as MessagePayload;
}

function logNewMessageEvent(pushId: string, message: MessagePayload | null): void {
  logger.info("New message created", {
    pushId,
    hasText: Boolean(message?.text),
  });
}

export const health = onRequest((request, response) => {
  logHealthCheck({
    method: request.method,
    path: request.path,
  });

  response.status(200).send("OK");
});

export const onNewMessageCreated = onValueCreated(MESSAGES_PATH, async (event) => {
  if (!event.data.exists()) {
    return null;
  }

  const pushId = event.params.pushId;
  const message = normalizeMessagePayload(event.data.val());

  if (!message) {
    logger.warn("Received message payload with an unexpected format", {
      pushId,
    });

    return null;
  }

  logNewMessageEvent(pushId, message);

  // Add future async work here, for example:
  // await sendNotification(pushId, message);

  return null;
});
