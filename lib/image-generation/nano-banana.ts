import "server-only";
import { createHttpImageGenerationClient } from "./provider-http";

export const nanoBananaClient = createHttpImageGenerationClient({
  provider: "nano-banana",
  apiKeyEnv: "NANO_BANANA_API_KEY",
  baseUrlEnv: "NANO_BANANA_API_BASE_URL",
  generatePathEnv: "NANO_BANANA_GENERATE_PATH",
  statusPathEnv: "NANO_BANANA_STATUS_PATH"
});
