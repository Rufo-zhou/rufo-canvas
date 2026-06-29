import type { SupabaseClient } from "@supabase/supabase-js";
import type { CanvasSnapshot } from "@/components/canvas/types";
import type { GenerationStatus } from "@/lib/image-generation/types";
import type { MediaGenerationProvider, MediaType } from "@/lib/media-generation/types";
import { getStorageBucketName } from "./client";
import type { Database, Json } from "./types";

export type SupabaseAppClient = SupabaseClient<Database>;

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type GeneratedAsset = Database["public"]["Tables"]["generated_assets"]["Row"];
export type GenerationTask = Database["public"]["Tables"]["generation_tasks"]["Row"];

export type CreateProjectInput = {
  name: string;
  ownerId: string;
};

export type CreateGenerationTaskInput = {
  projectId: string;
  createdBy: string;
  provider: MediaGenerationProvider;
  prompt: string;
  negativePrompt?: string;
  requestPayload: Json;
};

export type CreateGeneratedAssetInput = {
  taskId: string;
  projectId: string;
  createdBy: string;
  provider: MediaGenerationProvider;
  prompt: string;
  storageBucket?: string | null;
  storagePath?: string | null;
  sourceUrl?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  mediaType?: MediaType;
  durationSeconds?: number | null;
  metadata?: Json | null;
};

export async function listProjects(supabase: SupabaseAppClient) {
  const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return data;
}

export async function getProject(supabase: SupabaseAppClient, projectId: string) {
  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();

  if (error) {
    throw new Error(`Failed to load project: ${error.message}`);
  }

  return data;
}

export async function createProject(supabase: SupabaseAppClient, input: CreateProjectInput) {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      owner_id: input.ownerId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data;
}

export async function deleteProject(supabase: SupabaseAppClient, projectId: string) {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

export async function loadLatestCanvasSnapshot(supabase: SupabaseAppClient, projectId: string) {
  const { data, error } = await supabase
    .from("canvas_snapshots")
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load canvas snapshot: ${error.message}`);
  }

  return data?.snapshot as CanvasSnapshot | undefined;
}

export async function saveCanvasSnapshot(
  supabase: SupabaseAppClient,
  projectId: string,
  userId: string,
  snapshot: CanvasSnapshot
) {
  const { data: latest, error: latestError } = await supabase
    .from("canvas_snapshots")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new Error(`Failed to inspect canvas version: ${latestError.message}`);
  }

  const { data, error } = await supabase
    .from("canvas_snapshots")
    .insert({
      project_id: projectId,
      created_by: userId,
      version: (latest?.version ?? 0) + 1,
      snapshot: serializeJson(snapshot)
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save canvas snapshot: ${error.message}`);
  }

  return data;
}

function serializeJson(value: CanvasSnapshot): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function createGenerationTask(
  supabase: SupabaseAppClient,
  input: CreateGenerationTaskInput
) {
  const { data, error } = await supabase
    .from("generation_tasks")
    .insert({
      project_id: input.projectId,
      created_by: input.createdBy,
      provider: input.provider,
      prompt: input.prompt,
      negative_prompt: input.negativePrompt ?? null,
      status: "pending",
      request_payload: input.requestPayload
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create generation task: ${error.message}`);
  }

  return data;
}

export async function updateGenerationTask(
  supabase: SupabaseAppClient,
  taskId: string,
  input: {
    status: Exclude<GenerationStatus, "draft">;
    responsePayload?: Json | null;
    errorMessage?: string | null;
  }
) {
  const { data, error } = await supabase
    .from("generation_tasks")
    .update({
      status: input.status,
      response_payload: input.responsePayload ?? null,
      error_message: input.errorMessage ?? null
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update generation task: ${error.message}`);
  }

  return data;
}

export async function getGenerationTask(
  supabase: SupabaseAppClient,
  taskId: string
) {
  const { data, error } = await supabase
    .from("generation_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error) {
    throw new Error(`Failed to load generation task: ${error.message}`);
  }

  return data;
}

export async function listProjectGenerationTasks(
  supabase: SupabaseAppClient,
  projectId: string,
  limit = 100
) {
  const { data, error } = await supabase
    .from("generation_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`生成历史加载失败：${error.message}`);
  }

  return data;
}

export async function getGeneratedAssetByTask(
  supabase: SupabaseAppClient,
  taskId: string
) {
  const { data, error } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load generated asset: ${error.message}`);
  }

  return data;
}

export async function createGeneratedAsset(
  supabase: SupabaseAppClient,
  input: CreateGeneratedAssetInput
) {
  const { data, error } = await supabase
    .from("generated_assets")
    .insert({
      task_id: input.taskId,
      project_id: input.projectId,
      created_by: input.createdBy,
      provider: input.provider,
      prompt: input.prompt,
      storage_bucket: input.storageBucket ?? null,
      storage_path: input.storagePath ?? null,
      source_url: input.sourceUrl ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      mime_type: input.mimeType ?? null,
      media_type: input.mediaType ?? "image",
      duration_seconds: input.durationSeconds ?? null,
      metadata: input.metadata ?? null
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create generated asset: ${error.message}`);
  }

  return data;
}

export async function listProjectAssets(supabase: SupabaseAppClient, projectId: string) {
  const { data, error } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load project assets: ${error.message}`);
  }

  return data;
}

export async function uploadProjectFile(
  supabase: SupabaseAppClient,
  input: {
    userId: string;
    projectId: string;
    file: File | Blob;
    filename: string;
    folder: "references" | "generations";
    contentType?: string;
  }
) {
  const bucket = getStorageBucketName();
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${input.userId}/${input.projectId}/${input.folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, input.file, {
    contentType: input.contentType,
    upsert: false
  });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return { bucket, path };
}

export async function createSignedAssetUrl(supabase: SupabaseAppClient, storagePath: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(getStorageBucketName()).createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
