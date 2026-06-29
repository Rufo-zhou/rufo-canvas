export type ImageGenerationProvider = "nano-banana" | "gptlmage2";

export type GenerationStatus = "draft" | "pending" | "processing" | "completed" | "failed";

export type GenerateImageRequest = {
  projectId?: string;
  provider: ImageGenerationProvider;
  prompt: string;
  negativePrompt?: string;
  referenceImagePath?: string;
  referenceImageUrl?: string;
  width?: number;
  height?: number;
  count?: number;
  seed?: number;
  metadata?: Record<string, string | number | boolean>;
};

export type GenerateImageResponse = {
  id: string;
  provider: ImageGenerationProvider;
  status: GenerationStatus;
  imageUrl?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  raw: unknown;
};

export type ImageGenerationClient = {
  generateImage: (input: GenerateImageRequest) => Promise<GenerateImageResponse>;
  getGenerationStatus?: (id: string) => Promise<GenerateImageResponse>;
};

export class ImageGenerationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: number,
    readonly provider?: ImageGenerationProvider
  ) {
    super(message);
    this.name = "ImageGenerationError";
  }
}
