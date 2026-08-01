import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/v2/database";
import * as logger from "firebase-functions/logger";

const FUNCTION_MAX_INSTANCES = 10;
const MESSAGES_PATH = "/messages/{pushId}";
const AUTHORIZED_USER_ID = "arielgos";

/**
 * Represents the payload shape of a chat message.
 */
type MessagePayload = {
  text: string | null;
  userId: string | null;
  createdAt: number | null;
  [key: string]: unknown;
};

type RequestMetadata = {
  method: string;
  path: string;
};

// Configure global options for v2 functions
setGlobalOptions({ maxInstances: FUNCTION_MAX_INSTANCES });

/**
 * Logs the health check request metadata.
 * @param {RequestMetadata} request The request metadata to log.
 */
function logHealthCheck(request: RequestMetadata): void {
  logger.info("Health check received", {
    method: request.method,
    path: request.path,
  });
}

/**
 * Normalizes an unknown value into a message payload.
 * @param {unknown} value The raw value from the database snapshot.
 * @return {MessagePayload | null} A normalized message payload or null.
 */
function normalizeMessagePayload(value: unknown): MessagePayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<MessagePayload>;

  if (typeof candidate.text !== "string" && candidate.text !== null) {
    return null;
  }

  if (typeof candidate.userId !== "string" && candidate.userId !== null) {
    return null;
  }

  return {
    text: candidate.text ?? null,
    userId: candidate.userId ?? null,
    createdAt: candidate.createdAt ?? null,
    ...candidate,
  } as MessagePayload;
}

/**
 * Logs the new message event in a safe way.
 * @param {string} pushId The database push ID for the message.
 * @param {MessagePayload | null} message The normalized message payload.
 */
function logNewMessageEvent(pushId: string, message: MessagePayload | null): void {
  logger.info("New message created", {
    pushId,
    message: message ? { ...message } : null,
  });
}

/**
 * Exposes a simple health endpoint for monitoring.
 */
export const health = onRequest((request, response) => {
  logHealthCheck({
    method: request.method,
    path: request.path,
  });

  response.status(200).send("OK");
});

/**
 * Handles newly created messages in the Realtime Database.
 */
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

  if (message.userId != AUTHORIZED_USER_ID) {
    logger.warn("Received message payload from an unauthorized user", {
      pushId,
      userId: message.userId,
    });
    return null;
  }

  logNewMessageEvent(pushId, message);

  // Add future async work here, for example:
  // await sendNotification(pushId, message);

  return null;
});
