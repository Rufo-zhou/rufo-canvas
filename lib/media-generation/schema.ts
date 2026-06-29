import { z } from "zod";

const mediaAspectRatioSchema = z.enum([
  "1:1",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "16:9",
  "9:16",
  "21:9"
]);
const mediaQualitySchema = z.enum(["standard", "high", "ultra"]);
const mediaReferenceModeSchema = z.enum([
  "none",
  "image",
  "start-frame",
  "start-end",
  "multi-image",
  "keyframes"
]);
const mediaReferenceFitSchema = z.enum(["outpaint", "crop", "contain"]);
const providerCredentialsSchema = z
  .object({
    pollinationsApiKey: z.string().trim().min(1).max(512).optional(),
    huggingFaceApiKey: z.string().trim().min(1).max(512).optional(),
    agnesApiKey: z.string().trim().min(1).max(512).optional()
  })
  .strict();

export const generateMediaRequestSchema = z.object({
  projectId: z.string().uuid(),
  modelId: z.string().trim().min(1),
  prompt: z.string().trim().min(1).max(4000),
  referenceImagePaths: z.array(z.string().trim().min(1)).max(8).optional(),
  referenceMode: mediaReferenceModeSchema.optional(),
  referenceFit: mediaReferenceFitSchema.optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  aspectRatio: mediaAspectRatioSchema.optional(),
  quality: mediaQualitySchema.optional(),
  durationSeconds: z.number().int().min(1).max(120).optional(),
  audio: z.boolean().optional(),
  seed: z.number().int().optional(),
  providerCredentials: providerCredentialsSchema.optional()
});

export const pollMediaRequestSchema = z.object({
  operation: z.literal("poll"),
  taskId: z.string().uuid(),
  providerCredentials: providerCredentialsSchema.optional()
});
