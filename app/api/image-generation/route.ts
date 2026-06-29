import { NextResponse } from "next/server";
import { generateImage } from "@/lib/image-generation/service";
import { generateImageRequestSchema } from "@/lib/image-generation/schema";
import { ImageGenerationError } from "@/lib/image-generation/types";
import {
  createGeneratedAsset,
  createGenerationTask,
  createSignedAssetUrl,
  getProject,
  updateGenerationTask
} from "@/lib/supabase/database";
import { createSupabaseUserServerClient, getServerStorageBucketName } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export async function POST(request: Request) {
  const accessToken = readBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Missing Authorization bearer token."
        }
      },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = generateImageRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid image generation request.",
          issues: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const supabase = createSupabaseUserServerClient(accessToken);
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid user session."
        }
      },
      { status: 401 }
    );
  }

  let taskId: string | undefined;

  try {
    await getProject(supabase, parsed.data.projectId);

    const referenceImageUrl = parsed.data.referenceImagePath
      ? await createSignedAssetUrl(supabase, parsed.data.referenceImagePath, 900)
      : undefined;

    const requestPayload = toJson({
      ...parsed.data,
      referenceImageUrl
    });

    const task = await createGenerationTask(supabase, {
      projectId: parsed.data.projectId,
      createdBy: user.id,
      provider: parsed.data.provider,
      prompt: parsed.data.prompt,
      negativePrompt: parsed.data.negativePrompt,
      requestPayload
    });
    taskId = task.id;

    const generation = await generateImage({
      ...parsed.data,
      referenceImageUrl
    });

    if (!generation.imageUrl) {
      throw new ImageGenerationError("Image generation did not return an image URL.", "PROVIDER_RESPONSE_INVALID", 502, parsed.data.provider);
    }

    const stored = await uploadGeneratedImageToStorage(supabase, {
      userId: user.id,
      projectId: parsed.data.projectId,
      taskId: task.id,
      imageUrl: generation.imageUrl,
      mimeType: generation.mimeType
    });

    const asset = await createGeneratedAsset(supabase, {
      taskId: task.id,
      projectId: parsed.data.projectId,
      createdBy: user.id,
      provider: parsed.data.provider,
      prompt: parsed.data.prompt,
      storageBucket: stored.bucket,
      storagePath: stored.path,
      sourceUrl: generation.imageUrl.startsWith("data:") ? null : generation.imageUrl,
      width: generation.width ?? parsed.data.width ?? null,
      height: generation.height ?? parsed.data.height ?? null,
      mimeType: stored.mimeType,
      metadata: {
        referenceImagePath: parsed.data.referenceImagePath ?? null,
        providerTaskId: generation.id
      }
    });

    await updateGenerationTask(supabase, task.id, {
      status: generation.status === "failed" ? "failed" : "completed",
      responsePayload: toJson(generation.raw),
      errorMessage: null
    });

    const signedUrl = await createSignedAssetUrl(supabase, stored.path, 3600);

    return NextResponse.json({
      data: {
        generation,
        asset: {
          assetId: asset.id,
          imageUrl: signedUrl,
          storagePath: asset.storage_path,
          sourceUrl: asset.source_url,
          prompt: asset.prompt,
          provider: asset.provider,
          width: asset.width,
          height: asset.height
        }
      }
    });
  } catch (error) {
    if (taskId) {
      await updateGenerationTask(supabase, taskId, {
        status: "failed",
        responsePayload: null,
        errorMessage: error instanceof Error ? error.message : "Image generation failed."
      }).catch(() => undefined);
    }

    if (error instanceof ImageGenerationError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            provider: error.provider
          }
        },
        { status: error.httpStatus }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Image generation failed."
        }
      },
      { status: 500 }
    );
  }
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length).trim();
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

async function uploadGeneratedImageToStorage(
  supabase: ReturnType<typeof createSupabaseUserServerClient>,
  input: {
    userId: string;
    projectId: string;
    taskId: string;
    imageUrl: string;
    mimeType?: string;
  }
) {
  const blob = input.imageUrl.startsWith("data:")
    ? dataUrlToBlob(input.imageUrl)
    : await remoteImageToBlob(input.imageUrl);

  const mimeType = input.mimeType || blob.type || "image/png";
  const extension = mimeType.includes("svg") ? "svg" : mimeType.includes("jpeg") ? "jpg" : "png";
  const bucket = getServerStorageBucketName();
  const path = `${input.userId}/${input.projectId}/generations/${input.taskId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: mimeType,
    upsert: false
  });

  if (error) {
    throw new Error(`Failed to upload generated image: ${error.message}`);
  }

  return { bucket, path, mimeType };
}

async function remoteImageToBlob(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Failed to download generated image.");
  }

  return response.blob();
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);

  if (!match) {
    throw new Error("Invalid generated image data URL.");
  }

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  const bytes = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");

  return new Blob([bytes], { type: mimeType });
}
