import type { Edge, Node, Viewport } from "@xyflow/react";
import type { GenerationStatus } from "@/lib/image-generation/types";
import type {
  MediaGenerationProvider,
  MediaAspectRatio,
  MediaQuality,
  MediaType
} from "@/lib/media-generation/types";

export type CanvasNodeKind =
  | "prompt"
  | "generation"
  | "asset"
  | "text"
  | "frame"
  | "marker"
  | "drawing";

export type CanvasNodeData = Record<string, unknown> & {
  label: string;
  kind: CanvasNodeKind;
  prompt?: string;
  negativePrompt?: string;
  provider?: MediaGenerationProvider;
  model?: string;
  status?: GenerationStatus;
  assetId?: string;
  assetUrl?: string;
  storagePath?: string;
  mediaType?: MediaType;
  mimeType?: string;
  durationSeconds?: number;
  aspectRatio?: MediaAspectRatio;
  quality?: MediaQuality;
  audio?: boolean;
  text?: string;
  color?: string;
  path?: string;
  width?: number;
  height?: number;
  progress?: number;
  taskId?: string;
  clientTaskId?: string;
  modelLabel?: string;
  statusLabel?: string;
  errorCode?: string;
  errorMessage?: string;
  errorSolution?: string;
  createdAt?: string;
};

export type CanvasNode = Node<CanvasNodeData>;

export type CanvasEdge = Edge<Record<string, unknown> & {
  label?: string;
}>;

export type CanvasSnapshot = {
  schemaVersion: 1;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport?: Viewport;
  updatedAt: string;
};

export type GeneratedCanvasMedia = {
  assetId: string;
  assetUrl: string;
  storagePath?: string | null;
  sourceUrl?: string | null;
  prompt: string;
  provider: MediaGenerationProvider;
  model?: string;
  mediaType: MediaType;
  mimeType?: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  aspectRatio?: MediaAspectRatio | null;
  quality?: MediaQuality | null;
  audio?: boolean | null;
};

export type GeneratedCanvasImage = GeneratedCanvasMedia;

export type CanvasReferenceRequest = {
  requestId: string;
  nodeId: string;
  label: string;
  assetUrl: string;
  storagePath: string;
  draftNodeId?: string;
};

export type CanvasGenerationRequest = {
  clientTaskId: string;
  draftNodeId?: string;
  prompt: string;
  provider: MediaGenerationProvider;
  modelId: string;
  modelLabel: string;
  mediaType: MediaType;
  aspectRatio: MediaAspectRatio;
  quality: MediaQuality;
  durationSeconds?: number;
  createdAt: string;
};

export type CanvasGenerationUpdate = {
  taskId?: string;
  progress?: number;
  status: "pending" | "processing" | "completed" | "failed";
  statusLabel?: string;
  errorCode?: string;
  errorMessage?: string;
  errorSolution?: string;
};
