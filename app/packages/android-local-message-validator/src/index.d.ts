export type LocalValidationResult = {
  understandable: boolean;
  reason: string;
  language?: string;
};

export type LocalModelDownloadResult = {
  ready: boolean;
};

export declare function getNativeLocalMessageValidator(): {
  validateMessage(message: string): Promise<LocalValidationResult>;
  downloadModel(): Promise<LocalModelDownloadResult>;
  isModelReady(): Promise<boolean>;
} | null;

export declare function validateMessage(
  message: string
): Promise<LocalValidationResult>;

export declare function downloadModel(): Promise<LocalModelDownloadResult>;

export declare function isModelReady(): Promise<boolean>;
