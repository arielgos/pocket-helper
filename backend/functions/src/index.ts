import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest, Request } from "firebase-functions/v2/https";
import {
  onValueCreated,
  DatabaseEvent,
  DataSnapshot,
} from "firebase-functions/v2/database";
import { initializeApp } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import type { Response } from "express";
import { defineString } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDatabase } from "firebase-admin/database";

// Configuration constants
const FUNCTION_MAX_INSTANCES = 10;
const GEMINI_MODEL_NAME = "gemini-3.6-flash";
const MESSAGES_COLLECTION_PATH = "/sessions/{sessionId}/messages/{messageId}";

// Response constants
const HTTP_STATUS_OK = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HEALTH_CHECK_RESPONSE = "OK";

/**
 * RequestMetadata type definition for logging request information.
 */
type RequestMetadata = {
  readonly method: string;
  readonly path: string;
};

// Configure global options for v2 functions
setGlobalOptions({ maxInstances: FUNCTION_MAX_INSTANCES });

// Initialize Firebase Admin SDK
initializeApp();

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
 * Creates request metadata from the HTTP request.
 * @param {Request} request The HTTP request object.
 * @return {RequestMetadata} The extracted request metadata.
 */
function createRequestMetadata(request: Request): RequestMetadata {
  return {
    method: request.method,
    path: request.path,
  };
}

/**
 * Exposes a simple health endpoint for monitoring.
 * Returns HTTP 200 with "OK" message when the service is healthy.
 * @param request The HTTP request object.
 * @param response The HTTP response object.
 * @returns void
 */
export const health = onRequest(
  (request: Request, response: Response): void => {
    try {
      const metadata = createRequestMetadata(request);
      logHealthCheck(metadata);

      response.status(HTTP_STATUS_OK).send(HEALTH_CHECK_RESPONSE);
    } catch (error) {
      logger.error("Health check failed", { error });
      response.status(HTTP_INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
  },
);

// Define the Gemini API key parameter for secure access to the Gemini model.
const geminiApiKey = defineString("GEMINI_API_KEY");

/**
 * UserType enum for identifying different user types.
 */
enum UserType {
  System = "system",
  User = "arielgos",
}

/**
 * MessageType enum for categorizing messages.
 */
enum MessageType {
  Message = "message",
  Post = "post",
  Echo = "echo",
}

/**
 * Message interface definition for strongly-typed message data.
 */
interface Message {
  id: string;
  text: string;
  createdAt: number;
  userId: string;
  sessionId?: string;
  type: MessageType;
  [key: string]: unknown;
}

/**
 * Validates the message data.
 * @param {Message | null} messageData The message data to validate.
 * @return {boolean} True if the message data is valid.
 */
function isValidMessage(messageData: Message | null): boolean {
  if (!messageData) {
    logger.error("Received null message data. Ignoring event.");
    return false;
  }

  if (messageData.userId !== UserType.User) {
    logger.warn(`Message from user ${messageData.userId} ignored.`);
    return false;
  }

  return true;
}

/**
 * Generates AI response using Gemini model.
 * @param {string} messageText The message text to process.
 * @param {string} apiKey The Gemini API key.
 * @return {Promise<string>} The generated response text.
 */
async function generateAiResponse(
  messageText: string,
  apiKey: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
  const result = await model.generateContent(messageText);
  return result.response.text();
}

/**
 * Writes AI response to the database.
 * @param {Message} originalMessage The original message data.
 * @param {string} responseText The AI response text.
 * @return {Promise<void>}
 */
async function writeAiResponseToDatabase(
  originalMessage: Message,
  responseText: string,
): Promise<void> {
  const newMessage = {
    ...originalMessage,
    userId: UserType.System,
    createdAt: Date.now(),
    text: responseText,
  };

  const db = getDatabase();
  await db
    .ref(`/sessions/${originalMessage.sessionId}/messages`)
    .push(newMessage);

  logger.info(
    `Successfully added new AI response to session '${originalMessage.sessionId}'`,
  );
}

/**
 * Triggered when a new message is created in the database.
 * Processes user messages and generates AI responses.
 * @param event The database event containing the new message data and parameters.
 */
export const onNewMessageCreated = onValueCreated(
  MESSAGES_COLLECTION_PATH,
  async (
    event: DatabaseEvent<
      DataSnapshot,
      { sessionId: string; messageId: string }
    >,
  ): Promise<void> => {
    const messageData = event.data.val() as Message | null;

    if (!isValidMessage(messageData)) {
      return;
    }

    // TypeScript knows messageData is not null after validation
    const validMessage = messageData as Message;

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      logger.error("GEMINI_API_KEY is not defined!");
      return;
    }

    if (validMessage.type === MessageType.Message) {
      try {
        const responseText = await generateAiResponse(
          validMessage.text,
          apiKey,
        );
        await writeAiResponseToDatabase(validMessage, responseText);
      } catch (error) {
        logger.error("Failed to process message and generate AI response", {
          error,
          sessionId: validMessage.sessionId,
        });
      }
    }
  },
);
