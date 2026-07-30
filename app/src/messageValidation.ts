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
const geminiModel = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.0-flash';

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
    throw new Error('Gemini response did not include content parts.');
  }

  const text = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  if (text.length === 0) {
    throw new Error('Gemini response content was empty.');
  }

  return text;
}

export async function validateMessageUnderstandability(
  message: string
): Promise<MessageValidationResult> {
  if (!geminiApiKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to your .env file.'
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'Decide whether this chat message is completely understandable on its own. ' +
                  'Respond only as strict JSON with this exact shape: ' +
                  '{"understandable": boolean, "reason": string}. ' +
                  'If it is not understandable, provide a short reason that helps rewrite it.\n\n' +
                  `Message: "${message}"`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${bodyText}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  const rawText = extractGeminiText(payload);
  const normalized = normalizeJsonPayload(rawText);
  const parsed = JSON.parse(normalized) as Partial<MessageValidationResult>;

  if (
    typeof parsed.understandable !== 'boolean' ||
    typeof parsed.reason !== 'string'
  ) {
    throw new Error('Gemini response JSON did not match expected schema.');
  }

  return {
    understandable: parsed.understandable,
    reason: parsed.reason.trim(),
  };
}
