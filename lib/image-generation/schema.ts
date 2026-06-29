import { z } from "zod";

export const generateImageRequestSchema = z.object({
  projectId: z.string().uuid(),
  provider: z.enum(["nano-banana", "gptlmage2"]),
  prompt: z.string().trim().min(1),
  negativePrompt: z.string().trim().optional(),
  referenceImagePath: z.string().trim().optional(),
  width: z.number().int().positive().max(4096).optional(),
  height: z.number().int().positive().max(4096).optional(),
  count: z.number().int().positive().max(8).optional(),
  seed: z.number().int().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});
