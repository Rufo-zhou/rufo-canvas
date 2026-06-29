import { NextResponse } from "next/server";
import {
  generateMediaRequestSchema,
  pollMediaRequestSchema
} from "@/lib/media-generation/schema";
import {
  generateMedia,
  pollAsyncMediaGeneration,
  startAsyncMediaGeneration
} from "@/lib/media-generation/service";
import { getMediaModel, isMediaModelAvailable, mediaModels } from "@/lib/media-generation/catalog";
import { resolveMediaDimensions } from "@/lib/media-generation/presets";
import {
  MediaGenerationError,
  type MediaReferenceFit
} from "@/lib/media-generation/types";
import { getGenerationErrorInfo } from "@/lib/media-generation/error-guidance";
import {
  createGeneratedAsset,
  createGenerationTask,
  createSignedAssetUrl,
  getGeneratedAssetByTask,
  getGenerationTask,
  getProject,
  updateGenerationTask
} from "@/lib/supabase/database";
import type { GeneratedAsset } from "@/lib/supabase/database";
import { createSupabaseUserServerClient, getServerStorageBucketName } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export function GET() {
  return NextResponse.json({
    data: mediaModels.map((model) => ({
      ...model,
      available: isMediaModelAvailable(model)
    }))
  });
}

export async function POST(request: Request) {
  const accessToken = readBearerToken(request);

  if (!accessToken) {
    return errorResponse("UNAUTHENTICATED", "缺少登录凭证。", 401);
  }

  const body = await request.json().catch(() => null);

  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    body.operation === "poll"
  ) {
    return handlePollRequest(accessToken, body);
  }

  const parsed = generateMediaRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "媒体生成参数不正确。",
          solution: "检查模型、比例、画质、时长和参考图数量后重新提交。",
          issues: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const { providerCredentials, ...generationRequest } = parsed.data;
  const model = getMediaModel(generationRequest.modelId);

  if (!model) {
    return errorResponse("MODEL_UNSUPPORTED", "不支持所选模型。", 400);
  }

  const supabase = createSupabaseUserServerClient(accessToken);
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("UNAUTHENTICATED", "登录状态已失效。", 401);
  }

  let taskId: string | undefined;

  try {
    await getProject(supabase, generationRequest.projectId);
    if (!hasUserProviderCredential(model.provider, providerCredentials)) {
      await enforceDailyQuota(supabase, {
        userId: user.id,
        anonymous: Boolean(user.is_anonymous),
        mediaType: model.mediaType
      });
    }

    const originalReferenceImageUrls = await Promise.all(
      (generationRequest.referenceImagePaths ?? []).map((path) =>
        createSignedAssetUrl(supabase, path, 3600)
      )
    );
    const dimensions = resolveMediaDimensions(
      model.mediaType,
      generationRequest.aspectRatio ?? model.aspectRatios[0],
      generationRequest.quality ?? model.qualityOptions[0]
    );
    const referenceImageUrls =
      model.provider === "agnes" && originalReferenceImageUrls.length
        ? await prepareAgnesReferenceImages(supabase, {
            urls: originalReferenceImageUrls,
            userId: user.id,
            projectId: generationRequest.projectId,
            width: dimensions.width,
            height: dimensions.height,
            fit: generationRequest.referenceFit ?? "outpaint"
          })
        : originalReferenceImageUrls;

    const task = await createGenerationTask(supabase, {
      projectId: generationRequest.projectId,
      createdBy: user.id,
      provider: model.provider,
      prompt: generationRequest.prompt,
      requestPayload: toJson({
        ...generationRequest,
        providerModel: model.providerModel,
        mediaType: model.mediaType,
        referenceCount: referenceImageUrls.length,
        referenceFit: generationRequest.referenceFit ?? "outpaint",
        credentialSource: hasUserProviderCredential(model.provider, providerCredentials)
          ? "user"
          : "server"
      })
    });
    taskId = task.id;

    if (model.provider === "agnes" && model.mediaType === "video") {
      const started = await startAsyncMediaGeneration({
        ...generationRequest,
        referenceImageUrls,
        providerCredentials
      });
      await updateGenerationTask(supabase, task.id, {
        status: "processing",
        responsePayload: toJson({
          providerJobId: started.providerJobId,
          progress: started.progress,
          providerResponse: started.raw
        }),
        errorMessage: null
      });

      return NextResponse.json(
        {
          data: {
            status: "processing",
            taskId: task.id,
            providerJobId: started.providerJobId,
            progress: started.progress,
            pollAfterMs: 5000
          }
        },
        { status: 202 }
      );
    }

    const generation = await generateMedia({
      ...generationRequest,
      referenceImageUrls,
      providerCredentials
    });
    const stored = await uploadMedia(supabase, {
      userId: user.id,
      projectId: generationRequest.projectId,
      taskId: task.id,
      mediaUrl: generation.assetUrl,
      mimeType: generation.mimeType,
      mediaType: generation.mediaType,
      targetWidth: generation.width,
      targetHeight: generation.height
    });

    const asset = await createGeneratedAsset(supabase, {
      taskId: task.id,
      projectId: generationRequest.projectId,
      createdBy: user.id,
      provider: generation.provider,
      prompt: generationRequest.prompt,
      storageBucket: stored.bucket,
      storagePath: stored.path,
      sourceUrl: generation.assetUrl.startsWith("data:") ? null : generation.assetUrl,
      width: stored.width ?? generation.width ?? null,
      height: stored.height ?? generation.height ?? null,
      mimeType: stored.mimeType,
      mediaType: generation.mediaType,
      durationSeconds: generation.durationSeconds ?? null,
      metadata: {
        modelId: generationRequest.modelId,
        providerModel: generation.model,
        referenceImagePaths: generationRequest.referenceImagePaths ?? [],
        referenceMode: generationRequest.referenceMode ?? "none",
        referenceFit: generationRequest.referenceFit ?? "outpaint",
        aspectRatio: generation.aspectRatio ?? generationRequest.aspectRatio ?? null,
        quality: generation.quality ?? generationRequest.quality ?? null,
        audio: generation.audio ?? false
      }
    });

    await updateGenerationTask(supabase, task.id, {
      status: "completed",
      responsePayload: toJson(generation.raw),
      errorMessage: null
    });

    return NextResponse.json({
      data: {
        taskId: task.id,
        asset: {
          assetId: asset.id,
          assetUrl: await createSignedAssetUrl(supabase, stored.path, 3600),
          storagePath: asset.storage_path,
          sourceUrl: asset.source_url,
          prompt: asset.prompt,
          provider: generation.provider,
          model: generation.model,
          mediaType: generation.mediaType,
          mimeType: stored.mimeType,
          width: asset.width,
          height: asset.height,
          durationSeconds: generation.durationSeconds,
          aspectRatio: generation.aspectRatio ?? generationRequest.aspectRatio ?? null,
          quality: generation.quality ?? generationRequest.quality ?? null,
          audio: generation.audio ?? null
        }
      }
    });
  } catch (error) {
    const errorInfo = getGenerationErrorInfo({
      code:
        error instanceof MediaGenerationError
          ? error.code
          : "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "媒体生成失败。",
      provider:
        error instanceof MediaGenerationError ? error.provider : model.provider
    });
    if (taskId) {
      await updateGenerationTask(supabase, taskId, {
        status: "failed",
        responsePayload: toJson({
          errorCode: errorInfo.code,
          errorSolution: errorInfo.solution
        }),
        errorMessage: errorInfo.message
      }).catch(() => undefined);
    }

    if (error instanceof MediaGenerationError) {
      return errorResponse(error.code, error.message, error.httpStatus, error.provider);
    }

    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "媒体生成失败。",
      500
    );
  }
}

async function handlePollRequest(accessToken: string, body: unknown) {
  const parsed = pollMediaRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "任务查询参数不正确。", 400);
  }

  const supabase = createSupabaseUserServerClient(accessToken);
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("UNAUTHENTICATED", "登录状态已失效。", 401);
  }

  let task;
  try {
    task = await getGenerationTask(supabase, parsed.data.taskId);
  } catch {
    return errorResponse("TASK_NOT_FOUND", "生成任务不存在或无权访问。", 404);
  }

  if (task.status === "failed") {
    const info = getGenerationErrorInfo({
      code: "GENERATION_FAILED",
      message: task.error_message,
      provider: task.provider
    });
    return errorResponse(
      info.code,
      info.message,
      502,
      task.provider
    );
  }

  const existingAsset = await getGeneratedAssetByTask(supabase, task.id);
  if (existingAsset) {
    return NextResponse.json({
      data: {
        status: "completed",
        taskId: task.id,
        asset: await storedAssetResponse(supabase, existingAsset)
      }
    });
  }

  const storedRequest = generateMediaRequestSchema.safeParse(task.request_payload);
  const responsePayload = asRecord(task.response_payload);
  const providerJobId = readString(responsePayload, "providerJobId");

  if (!storedRequest.success || !providerJobId) {
    return errorResponse(
      "TASK_STATE_INVALID",
      "生成任务状态不完整，请重新发起生成。",
      409,
      task.provider
    );
  }

  try {
    const polled = await pollAsyncMediaGeneration({
      ...storedRequest.data,
      providerCredentials: parsed.data.providerCredentials,
      providerJobId
    });

    if (polled.status === "processing") {
      await updateGenerationTask(supabase, task.id, {
        status: "processing",
        responsePayload: toJson({
          providerJobId,
          progress: polled.progress,
          providerResponse: polled.raw
        }),
        errorMessage: null
      });

      return NextResponse.json(
        {
          data: {
            status: "processing",
            taskId: task.id,
            providerJobId,
            progress: polled.progress,
            pollAfterMs: 5000
          }
        },
        { status: 202 }
      );
    }

    const generation = polled.media;
    const stored = await uploadMedia(supabase, {
      userId: user.id,
      projectId: task.project_id,
      taskId: task.id,
      mediaUrl: generation.assetUrl,
      mimeType: generation.mimeType,
      mediaType: generation.mediaType,
      targetWidth: generation.width,
      targetHeight: generation.height
    });
    const asset = await createGeneratedAsset(supabase, {
      taskId: task.id,
      projectId: task.project_id,
      createdBy: user.id,
      provider: generation.provider,
      prompt: task.prompt,
      storageBucket: stored.bucket,
      storagePath: stored.path,
      sourceUrl: generation.assetUrl.startsWith("data:")
        ? null
        : generation.assetUrl,
      width: stored.width ?? generation.width ?? null,
      height: stored.height ?? generation.height ?? null,
      mimeType: stored.mimeType,
      mediaType: generation.mediaType,
      durationSeconds: generation.durationSeconds ?? null,
      metadata: {
        modelId: storedRequest.data.modelId,
        providerModel: generation.model,
        referenceImagePaths: storedRequest.data.referenceImagePaths ?? [],
        referenceMode: storedRequest.data.referenceMode ?? "none",
        referenceFit: storedRequest.data.referenceFit ?? "outpaint",
        aspectRatio:
          generation.aspectRatio ?? storedRequest.data.aspectRatio ?? null,
        quality: generation.quality ?? storedRequest.data.quality ?? null,
        audio: generation.audio ?? false
      }
    });

    await updateGenerationTask(supabase, task.id, {
      status: "completed",
      responsePayload: toJson({
        providerJobId,
        providerResponse: generation.raw
      }),
      errorMessage: null
    });

    return NextResponse.json({
      data: {
        status: "completed",
        taskId: task.id,
        asset: await storedAssetResponse(supabase, asset)
      }
    });
  } catch (error) {
    const permanent =
      error instanceof MediaGenerationError &&
      error.code !== "PROVIDER_NETWORK_ERROR" &&
      error.code !== "PROVIDER_TEMPORARY_ERROR";
    const errorInfo = getGenerationErrorInfo({
      code:
        error instanceof MediaGenerationError
          ? error.code
          : "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "视频任务查询失败。",
      provider:
        error instanceof MediaGenerationError
          ? error.provider
          : task.provider
    });

    if (permanent) {
      await updateGenerationTask(supabase, task.id, {
        status: "failed",
        responsePayload: toJson({
          ...asRecord(task.response_payload),
          errorCode: errorInfo.code,
          errorSolution: errorInfo.solution
        }),
        errorMessage: errorInfo.message
      }).catch(() => undefined);
    }

    if (error instanceof MediaGenerationError) {
      return errorResponse(
        error.code,
        error.message,
        error.httpStatus,
        error.provider
      );
    }

    return errorResponse("INTERNAL_ERROR", "视频任务查询失败。", 500);
  }
}

async function enforceDailyQuota(
  supabase: ReturnType<typeof createSupabaseUserServerClient>,
  input: {
    userId: string;
    anonymous: boolean;
    mediaType: "image" | "video";
  }
) {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("generation_tasks")
    .select("id", { count: "exact", head: true })
    .eq("created_by", input.userId)
    .gte("created_at", startOfDay.toISOString());

  if (error) {
    throw new Error(`无法检查今日用量：${error.message}`);
  }

  const limit =
    input.mediaType === "video"
      ? input.anonymous
        ? 1
        : 3
      : input.anonymous
        ? 20
        : 50;

  if ((count ?? 0) >= limit) {
    throw new MediaGenerationError(
      `今日免费生成次数已达到 ${limit} 次，请明天再试或使用自己的供应商 Key。`,
      "DAILY_QUOTA_EXCEEDED",
      429
    );
  }
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : undefined;
}

function errorResponse(code: string, message: string, status: number, provider?: string) {
  const error = getGenerationErrorInfo({ code, message, provider });
  return NextResponse.json(
    { error },
    { status }
  );
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

async function storedAssetResponse(
  supabase: ReturnType<typeof createSupabaseUserServerClient>,
  asset: GeneratedAsset
) {
  const metadata = asRecord(asset.metadata);

  return {
    assetId: asset.id,
    assetUrl: asset.storage_path
      ? await createSignedAssetUrl(supabase, asset.storage_path, 3600)
      : asset.source_url ?? "",
    storagePath: asset.storage_path,
    sourceUrl: asset.source_url,
    prompt: asset.prompt,
    provider: asset.provider,
    model: readString(metadata, "providerModel"),
    mediaType: asset.media_type,
    mimeType: asset.mime_type,
    width: asset.width,
    height: asset.height,
    durationSeconds: asset.duration_seconds,
    aspectRatio: readString(metadata, "aspectRatio"),
    quality: readString(metadata, "quality"),
    audio: metadata.audio === true
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: Record<string, unknown>, key: string) {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : undefined;
}

function hasUserProviderCredential(
  provider: string,
  credentials:
    | {
        pollinationsApiKey?: string;
        huggingFaceApiKey?: string;
        agnesApiKey?: string;
      }
    | undefined
) {
  if (provider === "pollinations") {
    return Boolean(credentials?.pollinationsApiKey);
  }
  if (provider === "huggingface") {
    return Boolean(credentials?.huggingFaceApiKey);
  }
  if (provider === "agnes") {
    return Boolean(credentials?.agnesApiKey);
  }

  return false;
}

async function prepareAgnesReferenceImages(
  supabase: ReturnType<typeof createSupabaseUserServerClient>,
  input: {
    urls: string[];
    userId: string;
    projectId: string;
    width: number;
    height: number;
    fit: MediaReferenceFit;
  }
) {
  const bucket = getServerStorageBucketName();

  return Promise.all(
    input.urls.map(async (url, index) => {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60_000),
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`参考图读取失败：${response.status}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      const prepared = await prepareReferenceImageSafely(bytes, {
        width: input.width,
        height: input.height,
        fit: input.fit
      });
      const path = `${input.userId}/${input.projectId}/references/prepared/${crypto.randomUUID()}-${index}.webp`;
      const { error } = await supabase.storage.from(bucket).upload(path, prepared, {
        contentType: "image/webp",
        upsert: false
      });
      if (error) {
        throw new Error(`参考图适配失败：${error.message}`);
      }

      return createSignedAssetUrl(supabase, path, 3600);
    })
  );
}

async function uploadMedia(
  supabase: ReturnType<typeof createSupabaseUserServerClient>,
  input: {
    userId: string;
    projectId: string;
    taskId: string;
    mediaUrl: string;
    mimeType: string;
    mediaType: "image" | "video";
    targetWidth?: number;
    targetHeight?: number;
  }
) {
  const blob = input.mediaUrl.startsWith("data:")
    ? dataUrlToBlob(input.mediaUrl)
    : await remoteMediaToBlob(input.mediaUrl);
  let mimeType = input.mimeType || blob.type;
  let bytes: Buffer = Buffer.from(await blob.arrayBuffer());
  let dimensions =
    input.mediaType === "image" ? readImageDimensions(bytes, mimeType) : null;

  if (
    input.mediaType === "image" &&
    input.targetWidth &&
    input.targetHeight
  ) {
    const normalized = await normalizeGeneratedImageSafely(bytes, {
      width: input.targetWidth,
      height: input.targetHeight
    });
    if (normalized) {
      bytes = normalized.bytes;
      mimeType = normalized.mimeType;
      dimensions = {
        width: normalized.width,
        height: normalized.height
      };
    } else {
      dimensions = {
        width: input.targetWidth,
        height: input.targetHeight
      };
    }
  }

  const extension = extensionForMimeType(mimeType, input.mediaType);
  const bucket = getServerStorageBucketName();
  const path = `${input.userId}/${input.projectId}/generations/${input.taskId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: mimeType,
    upsert: false
  });

  if (error) {
    throw new Error(`媒体文件保存失败：${error.message}`);
  }

  return {
    bucket,
    path,
    mimeType,
    width: dimensions?.width,
    height: dimensions?.height
  };
}

async function normalizeGeneratedImageSafely(
  bytes: Buffer,
  target: { width: number; height: number }
) {
  try {
    const { normalizeGeneratedImage } = await import(
      "@/lib/media-generation/image-normalization"
    );
    return normalizeGeneratedImage(bytes, target);
  } catch {
    return null;
  }
}

async function prepareReferenceImageSafely(
  bytes: Buffer,
  target: {
    width: number;
    height: number;
    fit: MediaReferenceFit;
  }
) {
  try {
    const { prepareReferenceImage } = await import(
      "@/lib/media-generation/image-normalization"
    );
    return prepareReferenceImage(bytes, target);
  } catch {
    return bytes;
  }
}

async function remoteMediaToBlob(mediaUrl: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(mediaUrl, {
        signal: AbortSignal.timeout(120_000),
        cache: "no-store"
      });

      if (response.ok) {
        return response.blob();
      }

      if (response.status < 500) {
        throw new Error(`媒体下载返回 ${response.status}。`);
      }
    } catch (error) {
      if (attempt === 2) {
        throw new Error(
          error instanceof Error
            ? `无法下载模型生成的媒体文件：${error.message}`
            : "无法下载模型生成的媒体文件。"
        );
      }
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 800 * 2 ** attempt)
    );
  }

  throw new Error("无法下载模型生成的媒体文件。");
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);

  if (!match) {
    throw new Error("无效的媒体数据。");
  }

  const mimeType = match[1] || "application/octet-stream";
  const payload = match[3] ?? "";
  const bytes = match[2]
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");

  return new Blob([bytes], { type: mimeType });
}

function extensionForMimeType(mimeType: string, mediaType: "image" | "video") {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("quicktime")) return "mov";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("svg")) return "svg";
  if (mimeType.includes("jpeg")) return "jpg";
  return mediaType === "video" ? "mp4" : "jpg";
}

function readImageDimensions(bytes: Buffer, mimeType: string) {
  if (mimeType.includes("png")) {
    return readPngDimensions(bytes);
  }
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return readJpegDimensions(bytes);
  }
  if (mimeType.includes("webp")) {
    return readWebpDimensions(bytes);
  }
  if (mimeType.includes("gif")) {
    return readGifDimensions(bytes);
  }
  if (mimeType.includes("svg")) {
    return readSvgDimensions(bytes);
  }

  return (
    readPngDimensions(bytes) ??
    readJpegDimensions(bytes) ??
    readWebpDimensions(bytes) ??
    readGifDimensions(bytes) ??
    readSvgDimensions(bytes)
  );
}

function readPngDimensions(bytes: Buffer) {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes.toString("ascii", 1, 4) !== "PNG"
  ) {
    return null;
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

function readJpegDimensions(bytes: Buffer) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3 && offset + 8 < bytes.length) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7)
      };
    }
    offset += 2 + length;
  }

  return null;
}

function readWebpDimensions(bytes: Buffer) {
  if (
    bytes.length < 30 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3)
    };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1
    };
  }

  return null;
}

function readGifDimensions(bytes: Buffer) {
  if (
    bytes.length < 10 ||
    (bytes.toString("ascii", 0, 6) !== "GIF87a" &&
      bytes.toString("ascii", 0, 6) !== "GIF89a")
  ) {
    return null;
  }

  return {
    width: bytes.readUInt16LE(6),
    height: bytes.readUInt16LE(8)
  };
}

function readSvgDimensions(bytes: Buffer) {
  const text = bytes.toString("utf8", 0, Math.min(bytes.length, 4096));
  if (!text.includes("<svg")) {
    return null;
  }

  const width = readSvgLength(text.match(/\bwidth=["']?([\d.]+)/i)?.[1]);
  const height = readSvgLength(text.match(/\bheight=["']?([\d.]+)/i)?.[1]);
  if (width && height) {
    return { width, height };
  }

  const viewBox = text.match(/\bviewBox=["']?([\d.\s-]+)/i)?.[1];
  const parts = viewBox?.trim().split(/\s+/).map(Number);
  if (parts?.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
    return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
  }

  return null;
}

function readSvgLength(value?: string) {
  if (!value) {
    return null;
  }
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}
