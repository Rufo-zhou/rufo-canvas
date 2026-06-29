import "server-only";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  ImageGenerationClient,
  ImageGenerationProvider
} from "./types";
import { ImageGenerationError } from "./types";

type HttpProviderConfig = {
  provider: ImageGenerationProvider;
  apiKeyEnv: string;
  baseUrlEnv: string;
  generatePathEnv: string;
  statusPathEnv: string;
};

type ProviderPayload = Record<string, unknown>;

export function createHttpImageGenerationClient(config: HttpProviderConfig): ImageGenerationClient {
  return {
    async generateImage(input) {
      const endpoint = resolveEndpoint(config, config.generatePathEnv);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: buildHeaders(config),
        body: JSON.stringify(toProviderPayload(input)),
        signal: AbortSignal.timeout(resolveTimeoutMs())
      }).catch((error: unknown) => {
        throw new ImageGenerationError(
          error instanceof Error ? error.message : "Image generation request failed.",
          "PROVIDER_NETWORK_ERROR",
          502,
          config.provider
        );
      });

      return parseProviderResponse(response, config.provider);
    },
    async getGenerationStatus(id) {
      const endpoint = resolveEndpoint(config, config.statusPathEnv).replace("{id}", encodeURIComponent(id));
      const response = await fetch(endpoint, {
        method: "GET",
        headers: buildHeaders(config),
        signal: AbortSignal.timeout(resolveTimeoutMs())
      }).catch((error: unknown) => {
        throw new ImageGenerationError(
          error instanceof Error ? error.message : "Image generation status request failed.",
          "PROVIDER_NETWORK_ERROR",
          502,
          config.provider
        );
      });

      return parseProviderResponse(response, config.provider);
    }
  };
}

function resolveEndpoint(config: HttpProviderConfig, pathEnv: string) {
  const baseUrl = process.env[config.baseUrlEnv];
  const path = process.env[pathEnv];

  if (!baseUrl || !path) {
    throw new ImageGenerationError(
      `Missing provider endpoint configuration: ${config.baseUrlEnv} or ${pathEnv}.`,
      "PROVIDER_CONFIG_MISSING",
      501,
      config.provider
    );
  }

  return new URL(path, baseUrl).toString();
}

function buildHeaders(config: HttpProviderConfig) {
  const apiKey = process.env[config.apiKeyEnv];

  if (!apiKey) {
    throw new ImageGenerationError(
      `Missing provider API key: ${config.apiKeyEnv}.`,
      "PROVIDER_CONFIG_MISSING",
      501,
      config.provider
    );
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };
}

function resolveTimeoutMs() {
  const value = Number(process.env.IMAGE_GENERATION_TIMEOUT_MS ?? 60000);
  return Number.isFinite(value) && value > 0 ? value : 60000;
}

function toProviderPayload(input: GenerateImageRequest): ProviderPayload {
  return {
    prompt: input.prompt,
    negative_prompt: input.negativePrompt,
    width: input.width,
    height: input.height,
    n: input.count,
    seed: input.seed,
    reference_image_url: input.referenceImageUrl,
    metadata: input.metadata
  };
}

async function parseProviderResponse(response: Response, provider: ImageGenerationProvider): Promise<GenerateImageResponse> {
  const raw = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ImageGenerationError(
      "Image generation provider returned an error.",
      "PROVIDER_RESPONSE_ERROR",
      response.status,
      provider
    );
  }

  if (!raw || typeof raw !== "object") {
    throw new ImageGenerationError(
      "Image generation provider returned an invalid response.",
      "PROVIDER_RESPONSE_INVALID",
      502,
      provider
    );
  }

  return {
    id: readString(raw, ["id", "task_id", "request_id"]) ?? crypto.randomUUID(),
    provider,
    status: normalizeStatus(readString(raw, ["status"])),
    imageUrl: readImageUrl(raw),
    width: readNumber(raw, ["width"]),
    height: readNumber(raw, ["height"]),
    mimeType: readString(raw, ["mimeType", "mime_type"]),
    raw
  };
}

function readString(value: object, keys: string[]) {
  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return undefined;
}

function readImageUrl(value: object) {
  const record = value as Record<string, unknown>;
  const direct = readString(value, ["imageUrl", "image_url", "url"]);

  if (direct) {
    return direct;
  }

  const output = record.output;
  if (Array.isArray(output)) {
    const first = output[0];
    if (first && typeof first === "object") {
      return readString(first, ["imageUrl", "image_url", "url"]);
    }
  }

  return undefined;
}

function readNumber(value: object, keys: string[]) {
  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function normalizeStatus(status: string | undefined) {
  if (status === "processing" || status === "completed" || status === "failed") {
    return status;
  }

  return "pending";
}
