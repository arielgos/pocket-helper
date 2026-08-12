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

// AI Prompt templates
const RESEARCH_PROMPT_TEMPLATE = `Role: Act as an expert research analyst and subject-matter expert.
Task: Conduct a detailed research and analysis task on the topic provided below, incorporating
insights from the specified external link as well as up-to-date web research.

Inputs:
Topic: {topics}
External Link: {url}

Instructions:
1. Analyze the Link: Access and review the provided link. Extract its core arguments, key
findings, data points, and any unique perspectives.
2. Conduct Supplemental Research: Search for additional relevant, reliable, and recent context
on the topic to expand upon, verify, or provide counter-perspectives to the link's content.
3. Synthesize Findings: Combine the insights into a cohesive research brief.

Output Format:
- Executive Summary: A brief 3–4 sentence overview of the topic and the link's primary takeaway.
- Core Insights from the Link: Key points, stats, or arguments from the URL.
- Broader Context & Additional Findings: Important background, trends, or facts discovered
through additional research.
- Comparison / Critical Nuances: How the link's perspective compares with broader industry
consensus or alternative viewpoints.
- Key Takeaways & Next Steps: 3–5 bullet points summarizing what's most important to know.`;

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
  Process = "process",
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
 * Generates AI research response using Gemini model with research prompt.
 * @param {string} messageText The message text in format: topic [url].
 * @param {string} apiKey The Gemini API key.
 * @return {Promise<string>} The generated research response text.
 */
async function generateAiResearchResponse(
  messageText: string,
  apiKey: string,
): Promise<string> {
  // Parse message to extract URL from square brackets and topic
  // Expected format: ${topic} [${url}]
  const bracketUrlRegex = /\[(https?:\/\/[^\]]+)\]/i;
  const match = messageText.match(bracketUrlRegex);

  if (!match) {
    throw new Error(
      "No URL found in message text. Expected format: topic [url]",
    );
  }

  const url = match[1];
  const topics =
    messageText.replace(bracketUrlRegex, "").trim() || "General research";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

  const prompt = RESEARCH_PROMPT_TEMPLATE.replace("{topics}", topics).replace(
    "{url}",
    url,
  );

  logger.debug(`Generated research prompt: ${prompt}`);

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Writes AI response to the database.
 * @param {Message} originalMessage The original message data.
 * @param {string} responseText The AI response text.
 * @return {Promise<void>}
 */
async function writeResponseToDatabase(
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

    const validMessage = messageData as Message;
    const messageId = event.params.messageId;

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      logger.error("GEMINI_API_KEY is not defined!");
      return;
    }

    if (validMessage.type === MessageType.Echo) {
      logger.info(`Received ECHO message '${messageId}' Ignoring.`);
      return;
    }

    if (validMessage.type === MessageType.Message) {
      logger.info(`Processing MESSAGE for messsage '${messageId}'`);
      try {
        const responseText = await generateAiResponse(
          validMessage.text,
          apiKey,
        );
        await writeResponseToDatabase(validMessage, responseText);
      } catch (error) {
        logger.error("Failed to process message and generate AI response", {
          error,
          sessionId: validMessage.sessionId,
        });
      }
      return;
    }

    if (validMessage.type === MessageType.Post) {
      logger.info(`Processing POST for messsage '${messageId}'`);
      try {
        const responseText = await generateAiResearchResponse(
          validMessage.text,
          apiKey,
        );
        await writeResponseToDatabase(validMessage, responseText);
      } catch (error) {
        logger.error("Failed to process post and generate AI response", {
          error,
          sessionId: validMessage.sessionId,
        });
      }
      return;
    }

    if (validMessage.type === MessageType.Process) {
      logger.info(`Processing PROCESS for messsage '${messageId}'`);
      try {
        await writeResponseToDatabase(validMessage, "Processing...");
      } catch (error) {
        logger.error("Failed to process process and generate AI response", {
          error,
          sessionId: validMessage.sessionId,
        });
      }
    }

    logger.warn(
      `Received message with unrecognized type '${validMessage.type}' Ignoring.`,
    );
  },
);
