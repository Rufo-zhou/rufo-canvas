import "server-only";
import { createHttpImageGenerationClient } from "./provider-http";

export const gptlmage2Client = createHttpImageGenerationClient({
  provider: "gptlmage2",
  apiKeyEnv: "GPTLMAGE2_API_KEY",
  baseUrlEnv: "GPTLMAGE2_API_BASE_URL",
  generatePathEnv: "GPTLMAGE2_GENERATE_PATH",
  statusPathEnv: "GPTLMAGE2_STATUS_PATH"
});
