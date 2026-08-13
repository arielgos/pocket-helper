import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest, Request } from "firebase-functions/v2/https";
import {
  onValueCreated,
  DatabaseEvent,
  DataSnapshot,
} from "firebase-functions/v2/database";
import { onObjectFinalized, StorageEvent } from "firebase-functions/v2/storage";
import { initializeApp } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import type { Response } from "express";
import { defineString } from "firebase-functions/params";
import { GoogleGenAI, type Interactions } from "@google/genai";
import { getDatabase } from "firebase-admin/database";
import type { DataSnapshot as AdminDataSnapshot } from "firebase-admin/database";
import { getStorage, getDownloadURL } from "firebase-admin/storage";

// Configuration constants
const FUNCTION_MAX_INSTANCES = 10;
const GEMINI_MODEL_NAME = "gemini-3.6-flash";
const IMAGE_MODEL_NAME = "gemini-3.1-flash-lite-image";
const MESSAGES_COLLECTION_PATH = "/sessions/{sessionId}/messages/{messageId}";

// Response constants
const HTTP_STATUS_OK = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HEALTH_CHECK_RESPONSE = "OK";

// Prompt template for research and analysis tasks
const RESEARCH_PROMPT_TEMPLATE = `Role: Act as an expert research analyst and subject-matter expert.
Task: Conduct a detailed research and analysis task on the topic provided below, incorporating
insights from the specified external link as well as up-to-date web research.

Inputs in the next format TOPIC [URL]: {text}

Instructions:
1. Analyze the Link: Access and review the provided link. Extract its core arguments, key
findings, data points, and any unique perspectives.
2. Conduct Supplemental Research: Search for additional relevant, reliable, and recent context
on the topic/s to expand upon, verify, or provide counter-perspectives to the link's content.
3. Synthesize Findings: Combine the insights into a cohesive research brief.

Output Format:
- Executive Summary: A brief 3–4 sentence overview of the topic and the link's primary takeaway.
- Core Insights from the Link: Key points, stats, or arguments from the URL.
- Broader Context & Additional Findings: Important background, trends, or facts discovered
through additional research.
- Comparison / Critical Nuances: How the link's perspective compares with broader industry
consensus or alternative viewpoints.
- Key Takeaways & Next Steps: 3–5 bullet points summarizing what's most important to know.`;

// Prompt template for generating a summary and social media post
const SUMMARY_PROMPT_TEMPLATE = `You are a content strategist and social media expert.
Analyze the following conversation and create:
1. A comprehensive summary highlighting the key points, decisions, and insights
2. An engaging social media post (suitable for LinkedIn or Twitter) that captures the essence

Conversation:
{conversationText}

Please provide your response in the following format:

## Summary
[Your comprehensive summary here]

## Social Media Post
[Your engaging social media post here, including relevant hashtags]`;

// Default values
const DEFAULT_USER_ID = "arielgos";
const DEFAULT_TIMESTAMP = 0;
const PROCESSING_STATUS_MESSAGE = "Processing...";
const GENERATING_IMAGE_MESSAGE = "Generating social media image...";
const PUBLISHING_STATUS_MESSAGE = "Deploy in Progress...";
const PUBLISHING_SUCCESS_MESSAGE = "Session published successfully.";
const IMAGE_GENERATION_UNAVAILABLE_MESSAGE =
  "Image generation is currently unavailable.";

// Storage configuration
const STORAGE_BUCKET_PATH = "session-summaries";
const IMAGE_FILE_EXTENSION = ".jpg";
const IMAGE_CONTENT_TYPE = "image/jpeg";
const FIREBASE_STORAGE_URL_PREFIX = "https://firebasestorage.googleapis.com";
const POSTS_STORAGE_PATH = "posts";
const JSON_CONTENT_TYPE = "application/json";
const LATEST_JSON_FILE = "latest.json";
const CACHE_CONTROL_NO_CACHE = "no-cache, max-age=0";

// Image generation configuration
const MAX_IMAGE_PROMPT_LENGTH = 500;
const SOCIAL_MEDIA_POST_REGEX = /## Social Media Post\s+([\s\S]+)/i;
const IMAGE_PROMPT_BASE =
  "Create a professional, eye-catching social media " +
  "graphic with the following content: ";
const IMAGE_PROMPT_STYLE =
  ". Style: modern, clean, professional business " +
  "aesthetic with bold typography.";

// Fixed generation parameters for image generation via the Interactions API.
const IMAGE_GENERATION_CONFIG = {
  temperature: 1,
  max_output_tokens: 65536,
  top_p: 0.95,
  thinking_level: "minimal",
};

// Status placeholders written during Process handling; excluded when
// collecting the actual generated content for publishing.
const STATUS_ONLY_MESSAGES = new Set([
  PUBLISHING_SUCCESS_MESSAGE,
  PUBLISHING_STATUS_MESSAGE,
  PROCESSING_STATUS_MESSAGE,
  GENERATING_IMAGE_MESSAGE,
  IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
]);

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
  Publish = "publish",
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
 * SessionMessage type for summary generation.
 */
interface SessionMessage {
  text: string;
  userId: string;
  createdAt: number;
}

/**
 * Raw message data from database snapshot.
 */
interface RawMessageData {
  text?: string;
  userId?: string;
  createdAt?: number;
  type?: MessageType;
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
 * @param {GoogleGenAI} ai The Gemini AI instance.
 * @return {Promise<string>} The generated response text.
 */
async function generateAiResponse(
  messageText: string,
  ai: GoogleGenAI,
): Promise<string> {
  const result = await ai.models.generateContent({
    model: GEMINI_MODEL_NAME,
    contents: messageText,
  });
  return result.text || "";
}

/**
 * Generates AI research response using Gemini model with research prompt.
 * @param {string} messageText The message text in format: topic [url].
 * @param {GoogleGenAI} ai The Gemini AI instance.
 * @return {Promise<string>} The generated research response text.
 */
async function generateAiResearchResponse(
  messageText: string,
  ai: GoogleGenAI,
): Promise<string> {
  const prompt = RESEARCH_PROMPT_TEMPLATE.replace("{text}", messageText);
  logger.debug(`Generated research prompt: ${prompt}`);
  const result = await ai.models.generateContent({
    model: GEMINI_MODEL_NAME,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return result.text || "";
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
 * Fetches messages from database for a given session.
 * @param {string} sessionId The session ID to fetch messages from.
 * @return {Promise<AdminDataSnapshot>} The database snapshot containing messages.
 */
async function fetchSessionMessages(
  sessionId: string,
): Promise<AdminDataSnapshot> {
  const db = getDatabase();
  return await db.ref(`/sessions/${sessionId}/messages`).once("value");
}

/**
 * Extracts and filters valid messages from a database snapshot.
 * Excludes Process-type messages to avoid circular processing.
 * @param {AdminDataSnapshot} snapshot The database snapshot to extract messages from.
 * @return {SessionMessage[]} Array of valid session messages.
 */
function extractValidMessages(snapshot: AdminDataSnapshot): SessionMessage[] {
  const messages: SessionMessage[] = [];

  snapshot.forEach((childSnapshot) => {
    const msg = childSnapshot.val() as RawMessageData;
    if (msg && msg.text && msg.type !== MessageType.Process) {
      messages.push({
        text: msg.text,
        userId: msg.userId || DEFAULT_USER_ID,
        createdAt: msg.createdAt || DEFAULT_TIMESTAMP,
      });
    }
  });

  return messages;
}

/**
 * Sorts messages chronologically by creation time.
 * @param {SessionMessage[]} messages The messages to sort.
 * @return {SessionMessage[]} The sorted messages.
 */
function sortMessagesByTime(messages: SessionMessage[]): SessionMessage[] {
  return messages.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Formats messages as a numbered conversation text.
 * @param {SessionMessage[]} messages The messages to format.
 * @return {string} The formatted conversation text.
 */
function formatConversationText(messages: SessionMessage[]): string {
  return messages
    .map((msg, index) => `[${index + 1}] ${msg.userId}: ${msg.text}`)
    .join("\n");
}

/**
 * Creates a summary prompt from conversation text.
 * @param {string} conversationText The formatted conversation text.
 * @return {string} The complete prompt for AI summary generation.
 */
function buildSummaryPrompt(conversationText: string): string {
  return SUMMARY_PROMPT_TEMPLATE.replace(
    "{conversationText}",
    conversationText,
  );
}

/**
 * Fetches all messages from a session and generates a summary with social media post.
 * @param {string} sessionId The session ID to fetch messages from.
 * @param {GoogleGenAI} ai The Gemini AI instance.
 * @return {Promise<string>} The generated summary and social media post.
 */
async function generateSessionSummary(
  sessionId: string,
  ai: GoogleGenAI,
): Promise<string> {
  const messagesSnapshot = await fetchSessionMessages(sessionId);

  if (!messagesSnapshot.exists()) {
    throw new Error(`Session ${sessionId} not found or contains no messages`);
  }

  const messages = extractValidMessages(messagesSnapshot);

  if (messages.length === 0) {
    throw new Error(
      `No valid messages found in session ${sessionId} for summary generation`,
    );
  }

  const sortedMessages = sortMessagesByTime(messages);
  const conversationText = formatConversationText(sortedMessages);
  const summaryPrompt = buildSummaryPrompt(conversationText);

  return await generateAiResponse(summaryPrompt, ai);
}

/**
 * Extracts social media content from summary text.
 * @param {string} summaryText The summary text to extract from.
 * @return {string} The extracted social media content or full summary.
 */
function extractSocialMediaContent(summaryText: string): string {
  const socialMediaMatch = summaryText.match(SOCIAL_MEDIA_POST_REGEX);
  return socialMediaMatch ? socialMediaMatch[1].trim() : summaryText;
}

/**
 * Creates an image prompt from the summary text.
 * @param {string} summaryText The summary text to extract prompt from.
 * @return {string} The image generation prompt.
 */
function createImagePromptFromSummary(summaryText: string): string {
  const socialContent = extractSocialMediaContent(summaryText);
  const contentSnippet = socialContent.substring(0, MAX_IMAGE_PROMPT_LENGTH);

  return `${IMAGE_PROMPT_BASE}${contentSnippet}${IMAGE_PROMPT_STYLE}`;
}

/**
 * Generates an image from text using Gemini's native image generation model.
 * @param {string} prompt The text prompt for image generation.
 * @param {GoogleGenAI} ai The Gemini AI instance.
 * @return {Promise<Buffer>} The generated image as a buffer.
 * @throws {Error} If no image data is returned by the model.
 */
async function generateImageFromText(
  prompt: string,
  ai: GoogleGenAI,
): Promise<Buffer> {
  const interaction = await ai.interactions.create({
    model: IMAGE_MODEL_NAME,
    input: prompt,
    generation_config: IMAGE_GENERATION_CONFIG,
    response_modalities: ["image"],
  });

  logger.info("Prompt sent to Gemini for image generation", { prompt });

  // Union type "Step" only exposes `content` on the "model_output" variant.
  const modelOutputSteps = interaction.steps.filter(
    (step): step is Interactions.ModelOutputStep =>
      step.type === "model_output",
  );

  const imagePart = modelOutputSteps
    .flatMap((step) => step.content ?? [])
    .find(
      (content): content is Interactions.ImageContent =>
        content.type === "image" && !!content.data,
    );

  if (!imagePart) {
    throw new Error("No image data found in response steps.");
  }

  return Buffer.from(imagePart.data as string, "base64");
}

/**
 * Generates a storage file name for an image.
 * @param {string} sessionId The session ID.
 * @param {number} timestamp The timestamp.
 * @return {string} The file path.
 */
function generateImageFileName(sessionId: string, timestamp: number): string {
  return `${STORAGE_BUCKET_PATH}/${sessionId}/${timestamp}${IMAGE_FILE_EXTENSION}`;
}

/**
 * Uploads an image buffer to Firebase Storage.
 * @param {Buffer} imageBuffer The image data to upload.
 * @param {string} sessionId The session ID for organizing files.
 * @return {Promise<string>} The public URL of the uploaded image.
 */
async function uploadImageToStorage(
  imageBuffer: Buffer,
  sessionId: string,
): Promise<string> {
  const storage = getStorage();
  const bucket = storage.bucket();

  const timestamp = Date.now();
  const fileName = generateImageFileName(sessionId, timestamp);
  const file = bucket.file(fileName);

  await file.save(imageBuffer, {
    metadata: {
      contentType: IMAGE_CONTENT_TYPE,
      metadata: {
        sessionId,
        timestamp: timestamp.toString(),
      },
    },
  });

  return getDownloadURL(file);
}

/**
 * Generates an image from summary text and uploads it to storage.
 * @param {string} summaryText The summary text to create image from.
 * @param {string} sessionId The session ID.
 * @param {GoogleGenAI} ai The Gemini AI instance.
 * @return {Promise<string>} The public URL of the generated image.
 */
async function generateAndUploadSummaryImage(
  summaryText: string,
  sessionId: string,
  ai: GoogleGenAI,
): Promise<string> {
  const imagePrompt = createImagePromptFromSummary(summaryText);
  logger.info("Generating image from summary", { sessionId });

  const imageBuffer = await generateImageFromText(imagePrompt, ai);
  logger.info("Image generated, uploading to storage", { sessionId });

  const imageUrl = await uploadImageToStorage(imageBuffer, sessionId);
  logger.info("Image uploaded successfully", { sessionId, imageUrl });

  return imageUrl;
}

/**
 * Fetches the AI-generated Process results for a session, in chronological
 * order. Only messages authored by the system are eligible for publishing.
 * @param {string} sessionId The session ID to fetch messages from.
 * @return {Promise<SessionMessage[]>} The sorted process-result messages.
 */
async function fetchProcessResultMessages(
  sessionId: string,
): Promise<SessionMessage[]> {
  const messagesSnapshot = await fetchSessionMessages(sessionId);
  const validMessages: SessionMessage[] = [];

  messagesSnapshot.forEach((childSnapshot) => {
    const msg = childSnapshot.val() as RawMessageData;
    const isPublishableResult =
      msg &&
      msg.text &&
      msg.type === MessageType.Process &&
      msg.userId === UserType.System &&
      !STATUS_ONLY_MESSAGES.has(msg.text);

    if (isPublishableResult) {
      validMessages.push({
        text: msg.text as string,
        userId: msg.userId || DEFAULT_USER_ID,
        createdAt: msg.createdAt || DEFAULT_TIMESTAMP,
      });
    }
  });

  return sortMessagesByTime(validMessages);
}

/**
 * Publishes a session by collecting its generated process results.
 * @param {string} sessionId The session ID to publish.
 * @return {Promise<string | undefined>} The public download URL of the
 *   saved publish payload, or undefined if there was nothing to publish.
 */
async function publishSession(sessionId: string): Promise<string | undefined> {
  const sortedMessages = await fetchProcessResultMessages(sessionId);

  const contentPost = sortedMessages.find((msg) =>
    msg.text.includes("## Social Media Post"),
  );
  const imagePost = sortedMessages.find((msg) =>
    msg.text.includes(FIREBASE_STORAGE_URL_PREFIX),
  );

  logger.info(`Session '${sessionId}' publish results`, {
    contentPost: contentPost?.text,
    imagePost: imagePost?.text,
  });

  if (!contentPost && !imagePost) {
    logger.warn(
      `No content or image found for session '${sessionId}' during publish.`,
    );
    return undefined;
  }

  const postPayload = {
    date: Date.now(),
    content: contentPost?.text,
    image: imagePost?.text,
  };

  try {
    const bucket = getStorage().bucket();
    const jsonFileName = `${POSTS_STORAGE_PATH}/${sessionId}.json`;
    const jsonFile = bucket.file(jsonFileName);
    await jsonFile.save(JSON.stringify(postPayload), {
      contentType: JSON_CONTENT_TYPE,
      metadata: {
        sessionId: sessionId,
        timestamp: Date.now().toString(),
      },
    });

    // Generates a random download token and builds the public URL.
    const jsonUrl = await getDownloadURL(jsonFile);
    logger.info(`Publish payload saved for session '${sessionId}'`, {
      jsonFileName,
      jsonUrl,
    });
    return jsonUrl;
  } catch (error) {
    logger.error("Failed to save publish payload to storage", {
      error,
      sessionId,
    });
    return undefined;
  }
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
    const sessionId = event.params.sessionId;

    if (validMessage.type === MessageType.Publish) {
      logger.info(`Processing PUBLISH message '${messageId}'`);
      try {
        await writeResponseToDatabase(validMessage, PUBLISHING_STATUS_MESSAGE);
        const publishUrl = await publishSession(sessionId);
        const successMessage = `${PUBLISHING_SUCCESS_MESSAGE} ${publishUrl}`;
        await writeResponseToDatabase(validMessage, successMessage);
      } catch (error) {
        logger.error("Failed to execute PUBLISH", {
          error,
          sessionId,
        });
      }
      return;
    }

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      logger.error("GEMINI_API_KEY is not defined!");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    if (validMessage.type === MessageType.Echo) {
      logger.info(`Received ECHO message '${messageId}' Ignoring.`);
      return;
    }

    if (validMessage.type === MessageType.Message) {
      logger.info(`Processing MESSAGE for message '${messageId}'`);
      try {
        const responseText = await generateAiResponse(validMessage.text, ai);
        await writeResponseToDatabase(validMessage, responseText);
      } catch (error) {
        logger.error("Failed to process message and generate AI response", {
          error,
          sessionId,
        });
      }
      return;
    }

    if (validMessage.type === MessageType.Post) {
      logger.info(`Processing POST for message '${messageId}'`);
      try {
        const responseText = await generateAiResearchResponse(
          validMessage.text,
          ai,
        );
        await writeResponseToDatabase(validMessage, responseText);
      } catch (error) {
        logger.error("Failed to process POST and generate AI response", {
          error,
          sessionId,
        });
      }
      return;
    }

    if (validMessage.type === MessageType.Process) {
      logger.info(`Processing PROCESS message '${messageId}'`);
      try {
        await writeResponseToDatabase(validMessage, PROCESSING_STATUS_MESSAGE);

        const summaryText = await generateSessionSummary(sessionId, ai);

        await writeResponseToDatabase(validMessage, summaryText);

        try {
          await writeResponseToDatabase(validMessage, GENERATING_IMAGE_MESSAGE);

          const imageUrl = await generateAndUploadSummaryImage(
            summaryText,
            sessionId,
            ai,
          );

          await writeResponseToDatabase(validMessage, imageUrl);
        } catch (imageError) {
          logger.error("Image generation failed, continuing without image", {
            error: imageError,
            sessionId,
          });
          await writeResponseToDatabase(
            validMessage,
            IMAGE_GENERATION_UNAVAILABLE_MESSAGE,
          );
        }
      } catch (error) {
        logger.error(
          "Failed to generate session summary and social media post",
          {
            error,
            sessionId,
          },
        );
      }
      return;
    }

    logger.warn(
      `Received message with unrecognized type '${validMessage.type}' Ignoring.`,
    );
  },
);

/**
 * Storage metadata for the latest.json file generation.
 */
interface LatestJsonPayload {
  updatedAt: string;
  totalItems: number;
  urls: string[];
}

/**
 * Checks if the file should trigger the latest.json generation.
 * Prevents infinite loops by excluding latest.json itself.
 * @param {string} fileName The name of the file that triggered the event.
 * @return {boolean} True if the file should trigger generation.
 */
function shouldProcessFile(fileName: string): boolean {
  if (fileName === LATEST_JSON_FILE) {
    logger.info("Skipping execution: triggered by latest.json update.");
    return false;
  }
  return true;
}

/**
 * Filters out non-content files from the bucket file list.
 * Excludes latest.json and folder objects (ending with '/').
 * @param {string} fileName The name of the file to check.
 * @return {boolean} True if the file should be included in the list.
 */
function shouldIncludeFile(fileName: string): boolean {
  return fileName !== LATEST_JSON_FILE && !fileName.endsWith("/");
}

/**
 * Fetches all content files from a storage bucket and returns their public URLs.
 * @param {string} bucketName The name of the storage bucket.
 * @return {Promise<string[]>} Array of public URLs for all content files.
 */
async function fetchBucketFileUrls(bucketName: string): Promise<string[]> {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const [files] = await bucket.getFiles();

  return files
    .filter((file) => shouldIncludeFile(file.name))
    .map((file) => file.publicUrl());
}

/**
 * Creates the payload object for latest.json.
 * @param {string[]} publicUrls Array of public URLs.
 * @return {LatestJsonPayload} The structured payload object.
 */
function createLatestJsonPayload(publicUrls: string[]): LatestJsonPayload {
  return {
    updatedAt: new Date().toISOString(),
    totalItems: publicUrls.length,
    urls: publicUrls,
  };
}

/**
 * Saves the latest.json file to the storage bucket and makes it publicly accessible.
 * @param {string} bucketName The name of the storage bucket.
 * @param {LatestJsonPayload} payload The payload to save.
 * @return {Promise<string>} The public URL of the saved file.
 */
async function saveLatestJsonFile(
  bucketName: string,
  payload: LatestJsonPayload,
): Promise<string> {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const latestFile = bucket.file(LATEST_JSON_FILE);

  await latestFile.save(JSON.stringify(payload, null, 2), {
    contentType: JSON_CONTENT_TYPE,
    resumable: false,
    metadata: {
      cacheControl: CACHE_CONTROL_NO_CACHE,
    },
  });

  const publicUrl = await getDownloadURL(latestFile);
  logger.info(`latest.json updated and made public at ${publicUrl}`, {
    bucketName,
    totalItems: payload.totalItems,
  });

  return publicUrl;
}

/**
 * Triggered when a file is finalized (created/updated) in Cloud Storage.
 * Generates and updates a latest.json file containing all file URLs in the bucket.
 * Prevents infinite loops by ignoring updates to latest.json itself.
 * @param event The storage event containing file metadata.
 */
export const generateLatestJson = onObjectFinalized(
  {
    bucket: POSTS_STORAGE_PATH,
  },
  async (event: StorageEvent): Promise<void> => {
    const fileName = event.data.name;
    const bucketName = event.data.bucket;

    logger.info("Storage event received", { fileName, bucketName });

    if (!shouldProcessFile(fileName)) {
      return;
    }

    try {
      const publicUrls = await fetchBucketFileUrls(bucketName);
      const payload = createLatestJsonPayload(publicUrls);
      const latestJsonUrl = await saveLatestJsonFile(bucketName, payload);

      logger.info(
        `Successfully updated ${LATEST_JSON_FILE} with ${publicUrls.length} file URLs.`,
        { bucketName, latestJsonUrl },
      );
    } catch (error) {
      logger.error("Failed to generate latest.json", {
        error,
        fileName,
        bucketName,
      });
      throw error;
    }
  },
);
