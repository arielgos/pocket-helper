export type LocalValidationResult = {
  understandable: boolean;
  reason: string;
  language?: string;
};

export type LocalModelDownloadResult = {
  path: string;
  bytes: number;
};

export declare function getNativeLocalMessageValidator(): {
  validateMessage(message: string): Promise<LocalValidationResult>;
  downloadModel(url: string): Promise<LocalModelDownloadResult>;
  isModelReady(): Promise<boolean>;
} | null;

export declare function validateMessage(
  message: string
): Promise<LocalValidationResult>;

export declare function downloadModel(
  url: string
): Promise<LocalModelDownloadResult>;

export declare function isModelReady(): Promise<boolean>;
