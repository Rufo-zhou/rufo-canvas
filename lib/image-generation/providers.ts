import type { ImageGenerationClient, ImageGenerationProvider } from "./types";
import { gptlmage2Client } from "./gptlmage2";
import { nanoBananaClient } from "./nano-banana";

export const imageGenerationClients: Record<ImageGenerationProvider, ImageGenerationClient> = {
  "nano-banana": nanoBananaClient,
  gptlmage2: gptlmage2Client
};
