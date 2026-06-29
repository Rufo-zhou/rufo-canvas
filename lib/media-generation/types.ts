export type MediaType = "image" | "video";

export type MediaAspectRatio =
  | "1:1"
  | "4:3"
  | "3:4"
  | "3:2"
  | "2:3"
  | "16:9"
  | "9:16"
  | "21:9";

export type MediaQuality = "standard" | "high" | "ultra";

export type MediaReferenceMode =
  | "none"
  | "image"
  | "start-frame"
  | "start-end"
  | "multi-image"
  | "keyframes";

export type MediaReferenceFit = "outpaint" | "crop" | "contain";

export type MediaGenerationProvider =
  | "pollinations-free"
  | "pollinations"
  | "huggingface"
  | "agnes"
  | "nano-banana"
  | "gptlmage2";

export type ProviderCredentials = {
  pollinationsApiKey?: string;
  huggingFaceApiKey?: string;
  agnesApiKey?: string;
};

export type MediaModel = {
  id: string;
  provider: MediaGenerationProvider;
  providerModel: string;
  label: string;
  mediaType: MediaType;
  freeTier: boolean;
  requiresKey: boolean;
  supportsReference: boolean;
  supportsAudio?: boolean;
  referenceModes?: MediaReferenceMode[];
  maxReferenceImages?: number;
  aspectRatios: MediaAspectRatio[];
  qualityOptions: MediaQuality[];
  durationOptions?: number[];
  durationOptionsByQuality?: Partial<Record<MediaQuality, number[]>>;
  description: string;
};

export type GeneratedMedia = {
  id: string;
  provider: MediaGenerationProvider;
  model: string;
  mediaType: MediaType;
  assetUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  aspectRatio?: MediaAspectRatio;
  quality?: MediaQuality;
  audio?: boolean;
  raw: unknown;
};

export type PendingMediaGeneration = {
  status: "processing";
  taskId: string;
  providerJobId: string;
  progress?: number;
  pollAfterMs: number;
};

export class MediaGenerationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: number,
    readonly provider?: MediaGenerationProvider
  ) {
    super(message);
    this.name = "MediaGenerationError";
  }
}
