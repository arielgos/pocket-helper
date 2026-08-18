import { Platform } from 'react-native';
import { t } from './i18n';
import {
  getNativeLocalMessageValidator,
} from '@arielgos/android-local-message-validator';

type GeminiTextPart = {
  text?: unknown;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiTextPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

export type MessageValidationResult = {
  understandable: boolean;
  reason: string;
};

const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const geminiModel = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "gemini-3.5-flash";

let localModelDownloadPromise: Promise<void> | null = null;

// Ensures Gemini Nano is downloaded via Android's AICore service on first use.
// Memoized per process; resets on failure so a later message can retry.
function ensureLocalModelDownloaded(
  nativeModule: NonNullable<ReturnType<typeof getNativeLocalMessageValidator>>,
): Promise<void> {
  if (!localModelDownloadPromise) {
    localModelDownloadPromise = (async () => {
      const ready = await nativeModule.isModelReady();
      if (!ready) {
        await nativeModule.downloadModel();
      }
    })().catch((error) => {
      localModelDownloadPromise = null;
      throw error;
    });
  }

  return localModelDownloadPromise;
}

function normalizeJsonPayload(value: string): string {
  const codeFenceMatch = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFenceMatch?.[1]) {
    return codeFenceMatch[1].trim();
  }
  return value.trim();
}

function extractGeminiText(payload: GeminiResponse): string {
  const candidate = payload.candidates?.[0];
  const parts = candidate?.content?.parts;

  if (!Array.isArray(parts)) {
    throw new Error(t("errors.geminiMissingParts"));
  }

  const text = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (text.length === 0) {
    throw new Error(t("errors.geminiEmptyContent"));
  }

  return text;
}

export async function validateMessageUnderstandability(
  message: string,
): Promise<MessageValidationResult> {
  if (Platform.OS === 'android') {
    const nativeModule = getNativeLocalMessageValidator();
    if (nativeModule) {
      try {
        await ensureLocalModelDownloaded(nativeModule);
        return await nativeModule.validateMessage(message);
      } catch (error) {
        // No on-device model deployed yet (or it failed) — fall back to Gemini.
        console.warn(
          'Local message validator unavailable, falling back to Gemini.',
          error,
        );
      }
    }
  }

  return validateWithGemini(message);
}

async function validateWithGemini(
  message: string,
): Promise<MessageValidationResult> {
  if (!geminiApiKey) {
    throw new Error(t("errors.missingGeminiApiKey"));
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: t("prompts.messageValidation", { message }),
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      t("errors.geminiRequestFailed", {
        status: String(response.status),
        body: bodyText,
      }),
    );
  }

  const payload = (await response.json()) as GeminiResponse;
  const rawText = extractGeminiText(payload);
  const normalized = normalizeJsonPayload(rawText);
  const parsed = JSON.parse(normalized) as Partial<MessageValidationResult>;

  if (
    typeof parsed.understandable !== "boolean" ||
    typeof parsed.reason !== "string"
  ) {
    throw new Error(t("errors.geminiInvalidSchema"));
  }

  return {
    understandable: parsed.understandable,
    reason: parsed.reason.trim(),
  };
}
