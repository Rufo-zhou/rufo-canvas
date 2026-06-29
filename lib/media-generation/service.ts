import "server-only";
import { getMediaModel } from "./catalog";
import { resolveMediaDimensions } from "./presets";
import { MediaGenerationError, type GeneratedMedia } from "./types";
import type {
  MediaAspectRatio,
  MediaGenerationProvider,
  MediaQuality,
  MediaReferenceFit,
  MediaReferenceMode,
  ProviderCredentials
} from "./types";

export type GenerateMediaInput = {
  modelId: string;
  prompt: string;
  referenceImageUrls?: string[];
  referenceMode?: MediaReferenceMode;
  referenceFit?: MediaReferenceFit;
  width?: number;
  height?: number;
  aspectRatio?: MediaAspectRatio;
  quality?: MediaQuality;
  durationSeconds?: number;
  audio?: boolean;
  seed?: number;
  providerCredentials?: ProviderCredentials;
};

export type StartedMediaGeneration = {
  providerJobId: string;
  provider: MediaGenerationProvider;
  model: string;
  width: number;
  height: number;
  durationSeconds: number;
  aspectRatio: MediaAspectRatio;
  quality: MediaQuality;
  progress: number;
  raw: Record<string, unknown>;
};

export type PolledMediaGeneration =
  | {
      status: "processing";
      progress: number;
      raw: Record<string, unknown>;
    }
  | {
      status: "completed";
      media: GeneratedMedia;
    };

export async function generateMedia(input: GenerateMediaInput): Promise<GeneratedMedia> {
  const { model, normalizedInput } = normalizeMediaInput(input);

  if (model.provider === "pollinations-free") {
    return generatePollinationsFreeImage(normalizedInput, model.providerModel);
  }

  if (model.provider === "pollinations") {
    return generatePollinationsMedia(normalizedInput, model.providerModel, model.mediaType);
  }

  if (model.provider === "huggingface") {
    return generateHuggingFaceMedia(normalizedInput, model.providerModel, model.mediaType);
  }

  if (model.provider === "agnes") {
    if (model.mediaType === "video") {
      throw new MediaGenerationError(
        "Agnes 视频需要使用异步生成流程。",
        "ASYNC_GENERATION_REQUIRED",
        409,
        "agnes"
      );
    }
    return generateAgnesImage(
      normalizedInput,
      model.providerModel,
      requireProviderApiKey("agnes", normalizedInput.providerCredentials)
    );
  }

  throw new MediaGenerationError("该模型尚未配置。", "PROVIDER_CONFIG_MISSING", 501, model.provider);
}

export async function startAsyncMediaGeneration(
  input: GenerateMediaInput
): Promise<StartedMediaGeneration> {
  const { model, normalizedInput } = normalizeMediaInput(input);

  if (model.provider !== "agnes" || model.mediaType !== "video") {
    throw new MediaGenerationError(
      "所选模型不使用异步任务流程。",
      "ASYNC_GENERATION_UNSUPPORTED",
      400,
      model.provider
    );
  }

  const apiKey = requireProviderApiKey("agnes", normalizedInput.providerCredentials);
  const created = await createAgnesVideoTask(
    normalizedInput,
    model.providerModel,
    apiKey
  );
  const providerJobId = readDeepString(created, ["video_id", "videoId", "id"]);

  if (!providerJobId) {
    throw new MediaGenerationError(
      "Agnes 视频接口没有返回 video_id。",
      "PROVIDER_RESPONSE_INVALID",
      502,
      "agnes"
    );
  }

  return {
    providerJobId,
    provider: "agnes",
    model: model.providerModel,
    width: normalizedInput.width ?? 1152,
    height: normalizedInput.height ?? 768,
    durationSeconds:
      readPositiveNumber(created, ["seconds"]) ??
      normalizedInput.durationSeconds ??
      5,
    aspectRatio: normalizedInput.aspectRatio ?? "16:9",
    quality: normalizedInput.quality ?? "high",
    progress: readPositiveNumber(created, ["progress"]) ?? 0,
    raw: created
  };
}

export async function pollAsyncMediaGeneration(
  input: GenerateMediaInput & { providerJobId: string }
): Promise<PolledMediaGeneration> {
  const { model, normalizedInput } = normalizeMediaInput(input);

  if (model.provider !== "agnes" || model.mediaType !== "video") {
    throw new MediaGenerationError(
      "所选模型不支持异步查询。",
      "ASYNC_GENERATION_UNSUPPORTED",
      400,
      model.provider
    );
  }

  const apiKey = requireProviderApiKey("agnes", normalizedInput.providerCredentials);
  const status = await pollAgnesVideoTask(
    input.providerJobId,
    model.providerModel,
    apiKey
  );
  const assetUrl = readAssetUrl(status);

  if (assetUrl) {
    return {
      status: "completed",
      media: agnesVideoResult(normalizedInput, model.providerModel, assetUrl, status)
    };
  }

  const state = readDeepString(status, ["status", "state"])?.toLowerCase();
  if (state && ["failed", "error", "cancelled", "canceled"].includes(state)) {
    throw new MediaGenerationError(
      readDeepString(status, ["message", "error", "detail"]) ??
        "Agnes 视频生成失败。",
      "PROVIDER_RESPONSE_ERROR",
      502,
      "agnes"
    );
  }

  return {
    status: "processing",
    progress: readPositiveNumber(status, ["progress"]) ?? 0,
    raw: status
  };
}

async function generatePollinationsFreeImage(
  input: GenerateMediaInput,
  providerModel: string
): Promise<GeneratedMedia> {
  const width = clampDimension(input.width ?? 1024);
  const height = clampDimension(input.height ?? 1024);
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(input.prompt)}`);
  url.searchParams.set("model", providerModel);
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  url.searchParams.set("nologo", "true");
  url.searchParams.set("enhance", "true");
  url.searchParams.set("seed", String(input.seed ?? Math.floor(Math.random() * 2_147_483_647)));

  const response = await providerFetch(
    url,
    {
      signal: AbortSignal.timeout(120_000),
      cache: "no-store"
    },
    "pollinations-free",
    2
  );

  if (!response.ok) {
    throw new MediaGenerationError(
      response.status === 429 ? "免费图片模型当前繁忙，请稍后重试。" : "免费图片模型生成失败。",
      "PROVIDER_RESPONSE_ERROR",
      response.status,
      "pollinations-free"
    );
  }

  return responseToGeneratedMedia(response, {
    provider: "pollinations-free",
    model: providerModel,
    mediaType: "image",
    width,
    height,
    aspectRatio: input.aspectRatio,
    quality: input.quality
  });
}

async function generatePollinationsMedia(
  input: GenerateMediaInput,
  providerModel: string,
  mediaType: "image" | "video"
): Promise<GeneratedMedia> {
  const apiKey = resolveProviderApiKey(
    "pollinations",
    input.providerCredentials
  );

  if (!apiKey) {
    throw new MediaGenerationError(
      "该模型需要免费的 Pollinations API Key。请在服务器环境变量中配置 POLLINATIONS_API_KEY。",
      "PROVIDER_CONFIG_MISSING",
      501,
      "pollinations"
    );
  }

  const url = new URL(
    `https://gen.pollinations.ai/${mediaType}/${encodeURIComponent(input.prompt)}`
  );
  url.searchParams.set("model", providerModel);
  url.searchParams.set("nologo", "true");
  url.searchParams.set("safe", "true");

  if (mediaType === "image") {
    url.searchParams.set("width", String(clampDimension(input.width ?? 1024)));
    url.searchParams.set("height", String(clampDimension(input.height ?? 1024)));
    if (["gptimage", "gptimage-large", "gpt-image-2"].includes(providerModel)) {
      url.searchParams.set("quality", pollinationsImageQuality(input.quality));
    }
  } else {
    url.searchParams.set("width", String(input.width ?? 1280));
    url.searchParams.set("height", String(input.height ?? 720));
    url.searchParams.set("aspectRatio", input.aspectRatio === "9:16" ? "9:16" : "16:9");
    url.searchParams.set("duration", String(input.durationSeconds ?? 5));
    if (input.audio) {
      url.searchParams.set("audio", "true");
    }
  }

  if (input.referenceImageUrls?.length) {
    url.searchParams.set("image", input.referenceImageUrls.join("|"));
  }

  const response = await providerFetch(
    url,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(mediaType === "video" ? 600_000 : 180_000),
      cache: "no-store"
    },
    "pollinations",
    2
  );

  if (!response.ok) {
    throw await providerResponseError(
      response,
      "pollinations",
      "Pollinations 模型生成失败。"
    );
  }

  return responseToGeneratedMedia(response, {
    provider: "pollinations",
    model: providerModel,
    mediaType,
    width: input.width,
    height: input.height,
    durationSeconds: mediaType === "video" ? input.durationSeconds ?? 5 : undefined,
    aspectRatio: input.aspectRatio,
    quality: input.quality,
    audio: input.audio
  });
}

async function generateHuggingFaceMedia(
  input: GenerateMediaInput,
  providerModel: string,
  mediaType: "image" | "video"
): Promise<GeneratedMedia> {
  const apiKey = resolveProviderApiKey(
    "huggingface",
    input.providerCredentials
  );

  if (!apiKey) {
    throw new MediaGenerationError(
      "请配置 HUGGINGFACE_API_KEY 后使用 Hugging Face 免费额度。",
      "PROVIDER_CONFIG_MISSING",
      501,
      "huggingface"
    );
  }

  const response = await providerFetch(
    `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(providerModel)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: input.prompt,
        parameters: {
          width: input.width,
          height: input.height,
          seed: input.seed
        }
      }),
      signal: AbortSignal.timeout(mediaType === "video" ? 600_000 : 180_000)
    },
    "huggingface",
    2
  );

  if (!response.ok) {
    throw await providerResponseError(
      response,
      "huggingface",
      "Hugging Face 模型生成失败。"
    );
  }

  return responseToGeneratedMedia(response, {
    provider: "huggingface",
    model: providerModel,
    mediaType,
    width: input.width,
    height: input.height,
    durationSeconds: input.durationSeconds,
    aspectRatio: input.aspectRatio,
    quality: input.quality,
    audio: input.audio
  });
}

async function generateAgnesImage(
  input: GenerateMediaInput,
  providerModel: string,
  apiKey: string
): Promise<GeneratedMedia> {
  const width = clampDimension(input.width ?? 1024);
  const height = clampDimension(input.height ?? 1024);
  const extraBody: Record<string, unknown> = {
    response_format: "url"
  };

  if (input.referenceImageUrls?.length) {
    extraBody.image = input.referenceImageUrls;
  }

  const response = await providerFetch(
    "https://apihub.agnes-ai.com/v1/images/generations",
    {
      method: "POST",
      headers: providerHeaders(apiKey),
      body: JSON.stringify({
        model: providerModel,
        prompt: promptWithReferenceFit(input),
        size: `${width}x${height}`,
        extra_body: extraBody
      }),
      signal: AbortSignal.timeout(300_000),
      cache: "no-store"
    },
    "agnes",
    2
  );
  const json = await readJsonResponse(response, "agnes");
  const assetUrl = readAssetUrl(json);

  if (!assetUrl) {
    throw new MediaGenerationError(
      "Agnes 图片接口没有返回可用图片地址。",
      "PROVIDER_RESPONSE_INVALID",
      502,
      "agnes"
    );
  }

  return {
    id: crypto.randomUUID(),
    provider: "agnes",
    model: providerModel,
    mediaType: "image",
    assetUrl,
    mimeType: inferDataUrlMimeType(assetUrl, "image/png"),
    width,
    height,
    aspectRatio: input.aspectRatio,
    quality: input.quality,
    raw: json
  };
}

async function createAgnesVideoTask(
  input: GenerateMediaInput,
  providerModel: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const width = input.width ?? 1280;
  const height = input.height ?? 720;
  const durationSeconds = input.durationSeconds ?? 5;
  const frameRate = 24;
  const body: Record<string, unknown> = {
    model: providerModel,
    prompt: promptWithReferenceFit(input),
    width,
    height,
    num_frames: agnesFrameCount(durationSeconds, input.quality),
    frame_rate: frameRate
  };
  const referenceImages = input.referenceImageUrls ?? [];

  if (referenceImages.length) {
    if (input.referenceMode === "start-frame") {
      body.image = referenceImages[0];
      body.mode = "ti2vid";
    } else {
      body.extra_body = {
        image: referenceImages,
        ...(input.referenceMode === "keyframes" ||
        input.referenceMode === "start-end"
          ? { mode: "keyframes" }
          : {})
      };
    }
  }

  const response = await providerFetch(
    "https://apihub.agnes-ai.com/v1/videos",
    {
      method: "POST",
      headers: providerHeaders(apiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
      cache: "no-store"
    },
    "agnes",
    3
  );

  return readJsonResponse(response, "agnes");
}

async function pollAgnesVideoTask(
  videoId: string,
  providerModel: string,
  apiKey: string
) {
  const statusUrl = new URL("https://apihub.agnes-ai.com/agnesapi");
  statusUrl.searchParams.set("video_id", videoId);
  statusUrl.searchParams.set("model_name", providerModel);
  const response = await providerFetch(
    statusUrl,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: AbortSignal.timeout(60_000),
      cache: "no-store"
    },
    "agnes",
    2
  );

  return readJsonResponse(response, "agnes");
}

function agnesVideoResult(
  input: GenerateMediaInput,
  providerModel: string,
  assetUrl: string,
  raw: unknown
): GeneratedMedia {
  const actualDimensions = readDimensions(raw) ?? {
    width: input.width,
    height: input.height
  };

  return {
    id: crypto.randomUUID(),
    provider: "agnes",
    model: providerModel,
    mediaType: "video",
    assetUrl,
    mimeType: inferDataUrlMimeType(assetUrl, "video/mp4"),
    width: actualDimensions.width,
    height: actualDimensions.height,
    durationSeconds:
      readPositiveNumber(raw, ["seconds"]) ?? input.durationSeconds ?? 5,
    aspectRatio: input.aspectRatio,
    quality: input.quality,
    raw
  };
}

async function responseToGeneratedMedia(
  response: Response,
  metadata: Omit<GeneratedMedia, "id" | "assetUrl" | "mimeType" | "raw">
): Promise<GeneratedMedia> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await response.json()) as Record<string, unknown>;
    const assetUrl = readAssetUrl(json);

    if (!assetUrl) {
      throw new MediaGenerationError(
        "模型返回结果中没有媒体地址。",
        "PROVIDER_RESPONSE_INVALID",
        502,
        metadata.provider
      );
    }

    return {
      id: crypto.randomUUID(),
      ...metadata,
      assetUrl,
      mimeType: metadata.mediaType === "video" ? "video/mp4" : "image/png",
      raw: json
    };
  }

  const blob = await response.blob();

  if (!blob.size) {
    throw new MediaGenerationError(
      "模型返回了空文件。",
      "PROVIDER_RESPONSE_INVALID",
      502,
      metadata.provider
    );
  }

  const bytes = Buffer.from(await blob.arrayBuffer());
  const mimeType =
    blob.type || (metadata.mediaType === "video" ? "video/mp4" : "image/jpeg");

  return {
    id: crypto.randomUUID(),
    ...metadata,
    assetUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
    mimeType,
    raw: {
      source: response.url,
      byteLength: bytes.byteLength
    }
  };
}

function readAssetUrl(value: Record<string, unknown>, depth = 0): string | undefined {
  for (const key of [
    "url",
    "imageUrl",
    "image_url",
    "videoUrl",
    "video_url",
    "output_url",
    "remixed_from_video_id"
  ]) {
    const candidate = value[key];
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  for (const key of ["b64_json", "base64", "image_base64"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate.startsWith("data:")
        ? candidate
        : `data:image/png;base64,${candidate}`;
    }
  }

  if (depth >= 4) {
    return undefined;
  }

  for (const key of ["data", "output", "result", "response", "video"]) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (item && typeof item === "object") {
          const nested = readAssetUrl(item as Record<string, unknown>, depth + 1);
          if (nested) {
            return nested;
          }
        }
      }
    } else if (candidate && typeof candidate === "object") {
      const nested = readAssetUrl(
        candidate as Record<string, unknown>,
        depth + 1
      );
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

function clampDimension(value: number) {
  return Math.min(Math.max(Math.round(value), 256), 2048);
}

function pollinationsImageQuality(quality?: MediaQuality) {
  if (quality === "ultra") return "hd";
  if (quality === "high") return "high";
  return "medium";
}

function normalizeMediaInput(input: GenerateMediaInput) {
  const model = getMediaModel(input.modelId);

  if (!model) {
    throw new MediaGenerationError("不支持所选模型。", "MODEL_UNSUPPORTED", 400);
  }

  const aspectRatio = input.aspectRatio ?? model.aspectRatios[0];
  const quality = input.quality ?? model.qualityOptions[0];

  if (!model.aspectRatios.includes(aspectRatio)) {
    throw new MediaGenerationError(
      "该模型不支持所选画面比例。",
      "ASPECT_RATIO_UNSUPPORTED",
      400,
      model.provider
    );
  }

  if (!model.qualityOptions.includes(quality)) {
    throw new MediaGenerationError(
      "该模型不支持所选画质。",
      "QUALITY_UNSUPPORTED",
      400,
      model.provider
    );
  }

  const durationOptions =
    model.durationOptionsByQuality?.[quality] ?? model.durationOptions;

  if (
    model.mediaType === "video" &&
    input.durationSeconds &&
    !durationOptions?.includes(input.durationSeconds)
  ) {
    throw new MediaGenerationError(
      "该模型不支持所选视频时长。",
      "DURATION_UNSUPPORTED",
      400,
      model.provider
    );
  }

  const referenceImages = input.referenceImageUrls ?? [];
  const referenceMode =
    referenceImages.length > 0
      ? input.referenceMode ??
        model.referenceModes?.[0] ??
        (model.mediaType === "video" ? "start-frame" : "image")
      : "none";

  if (
    referenceMode !== "none" &&
    (!model.supportsReference ||
      !model.referenceModes?.includes(referenceMode))
  ) {
    throw new MediaGenerationError(
      "该模型不支持所选参考模式。",
      "REFERENCE_MODE_UNSUPPORTED",
      400,
      model.provider
    );
  }

  const modelReferenceLimit =
    model.maxReferenceImages ?? (model.supportsReference ? 1 : 0);
  const referenceLimit =
    referenceMode === "start-frame"
      ? 1
      : referenceMode === "start-end"
        ? Math.min(modelReferenceLimit, 2)
        : modelReferenceLimit;

  if (referenceImages.length > referenceLimit) {
    throw new MediaGenerationError(
      "参考图片数量超过该模型限制。",
      "REFERENCE_LIMIT_EXCEEDED",
      400,
      model.provider
    );
  }

  if (
    ["start-end", "multi-image", "keyframes"].includes(referenceMode) &&
    referenceImages.length < 2
  ) {
    throw new MediaGenerationError(
      "所选参考模式至少需要两张图片。",
      "REFERENCE_IMAGES_REQUIRED",
      400,
      model.provider
    );
  }

  const dimensions = resolveMediaDimensions(model.mediaType, aspectRatio, quality);
  const normalizedInput: GenerateMediaInput = {
    ...input,
    aspectRatio,
    quality,
    width: dimensions.width,
    height: dimensions.height,
    referenceMode,
    referenceImageUrls: referenceMode === "none" ? [] : referenceImages,
    referenceFit:
      referenceMode === "none" ? undefined : input.referenceFit ?? "outpaint",
    durationSeconds:
      model.mediaType === "video"
        ? input.durationSeconds ?? durationOptions?.[0] ?? 5
        : undefined,
    audio: Boolean(input.audio && model.supportsAudio)
  };

  return { model, normalizedInput };
}

function resolveProviderApiKey(
  provider: MediaGenerationProvider,
  credentials?: ProviderCredentials
) {
  if (provider === "pollinations") {
    return credentials?.pollinationsApiKey ?? process.env.POLLINATIONS_API_KEY;
  }
  if (provider === "huggingface") {
    return credentials?.huggingFaceApiKey ?? process.env.HUGGINGFACE_API_KEY;
  }
  if (provider === "agnes") {
    return credentials?.agnesApiKey ?? process.env.AGNES_API_KEY;
  }

  return undefined;
}

function requireProviderApiKey(
  provider: MediaGenerationProvider,
  credentials?: ProviderCredentials
) {
  const apiKey = resolveProviderApiKey(provider, credentials);

  if (!apiKey) {
    throw new MediaGenerationError(
      provider === "agnes"
        ? "请在 API 设置中填写 Agnes AI Key，或由管理员配置 AGNES_API_KEY。"
        : "所选模型缺少供应商 API Key。",
      "PROVIDER_CONFIG_MISSING",
      501,
      provider
    );
  }

  return apiKey;
}

function providerHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

async function providerResponseError(
  response: Response,
  provider: MediaGenerationProvider,
  fallback: string
) {
  const text = await response.text().catch(() => "");
  const message = readProviderErrorMessage(text) ?? fallback;

  if (response.status === 402) {
    return new MediaGenerationError(
      `${provider} API Key 有效，但供应商账户余额不足。`,
      "PROVIDER_BALANCE_REQUIRED",
      402,
      provider
    );
  }
  if (response.status === 401 || response.status === 403) {
    return new MediaGenerationError(
      `${provider} API Key 无效、已过期或没有该模型权限。`,
      "PROVIDER_AUTH_ERROR",
      response.status,
      provider
    );
  }
  if (response.status === 429) {
    return new MediaGenerationError(
      `${provider} 当前额度或请求频率已达到上限，请稍后重试。`,
      "PROVIDER_RATE_LIMITED",
      429,
      provider
    );
  }

  return new MediaGenerationError(
    message,
    response.status >= 500
      ? "PROVIDER_TEMPORARY_ERROR"
      : "PROVIDER_RESPONSE_ERROR",
    response.status,
    provider
  );
}

async function readJsonResponse(
  response: Response,
  provider: MediaGenerationProvider
) {
  const json = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    if (response.status === 402) {
      throw new MediaGenerationError(
        `${provider} API Key 有效，但供应商账户余额不足。`,
        "PROVIDER_BALANCE_REQUIRED",
        402,
        provider
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new MediaGenerationError(
        `${provider} API Key 无效、已过期或没有该模型权限。`,
        "PROVIDER_AUTH_ERROR",
        response.status,
        provider
      );
    }

    throw new MediaGenerationError(
      (json && readDeepString(json, ["message", "error", "detail"])) ??
        `${provider} 接口请求失败。`,
      response.status >= 500
        ? "PROVIDER_TEMPORARY_ERROR"
        : "PROVIDER_RESPONSE_ERROR",
      response.status,
      provider
    );
  }

  if (!json) {
    throw new MediaGenerationError(
      `${provider} 接口返回了无效数据。`,
      "PROVIDER_RESPONSE_INVALID",
      502,
      provider
    );
  }

  return json;
}

async function providerFetch(
  input: string | URL,
  init: RequestInit,
  provider: MediaGenerationProvider,
  attempts = 1
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (response.status < 500 || attempt === attempts - 1) {
        return response;
      }
      await response.body?.cancel().catch(() => undefined);
    } catch {
      if (attempt === attempts - 1) {
        break;
      }
    }

    await delay(700 * 2 ** attempt);
  }

  throw new MediaGenerationError(
    `无法连接 ${provider} 服务，请检查网络后重试。`,
    "PROVIDER_NETWORK_ERROR",
    502,
    provider
  );
}

function readDeepString(
  value: Record<string, unknown>,
  keys: string[],
  depth = 0
): string | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  if (depth >= 4) {
    return undefined;
  }

  for (const candidate of Object.values(value)) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = readDeepString(
        candidate as Record<string, unknown>,
        keys,
        depth + 1
      );
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

function readProviderErrorMessage(text: string) {
  if (!text) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return readDeepString(parsed, ["message", "detail", "error"]);
  } catch {
    return text.length <= 500 ? text : `${text.slice(0, 500)}…`;
  }
}

function readPositiveNumber(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    const number =
      typeof candidate === "number"
        ? candidate
        : typeof candidate === "string"
          ? Number(candidate)
          : Number.NaN;
    if (Number.isFinite(number) && number >= 0) {
      return number;
    }
  }

  return undefined;
}

function readDimensions(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const size = readDeepString(value as Record<string, unknown>, ["size"]);
  const match = size?.match(/^(\d+)x(\d+)$/i);
  if (!match) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2])
  };
}

function agnesFrameCount(
  durationSeconds: number,
  quality: MediaQuality = "high"
) {
  const commonFrames: Record<number, number> = {
    3: 81,
    5: 121,
    10: 241,
    18: 441
  };

  const frameCount =
    commonFrames[durationSeconds] ??
    Math.max(Math.round((durationSeconds * 24 - 1) / 8) * 8 + 1, 9);
  const maximumFrames =
    quality === "ultra" ? 169 : quality === "high" ? 409 : 961;

  return Math.min(frameCount, maximumFrames);
}

function promptWithReferenceFit(input: GenerateMediaInput) {
  if (!input.referenceImageUrls?.length) {
    return input.prompt;
  }

  const target = input.aspectRatio ?? "the requested aspect ratio";
  const instruction =
    input.referenceFit === "crop"
      ? `Recompose and intelligently crop the reference into ${target}. Preserve natural subject proportions and never stretch or squeeze the reference.`
      : input.referenceFit === "contain"
        ? `Preserve the complete reference content inside ${target}. Keep natural proportions and extend the surrounding background without stretching.`
        : `Adapt the reference to ${target} by naturally outpainting and extending the composition. Preserve the subject's original proportions, identity, and geometry; never stretch, squeeze, or distort it.`;

  return `${input.prompt}\n\nReference composition requirement: ${instruction}`;
}

function inferDataUrlMimeType(assetUrl: string, fallback: string) {
  return assetUrl.startsWith("data:")
    ? assetUrl.slice(5, assetUrl.indexOf(";")) || fallback
    : fallback;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
