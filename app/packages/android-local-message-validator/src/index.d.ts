export type LocalValidationResult = {
  understandable: boolean;
  reason: string;
  language?: string;
};

export declare function getNativeLocalMessageValidator(): {
  validateMessage(message: string): Promise<LocalValidationResult>;
} | null;

export declare function validateMessage(
  message: string
): Promise<LocalValidationResult>;
