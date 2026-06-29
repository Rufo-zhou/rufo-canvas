"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import {
  addEdge,
  Background,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
  type OnConnectEnd,
  type ReactFlowInstance,
  type Viewport
} from "@xyflow/react";
import {
  ArrowLeft,
  Circle,
  Download,
  Eye,
  EyeOff,
  Gift,
  Grid3X3,
  ImagePlus,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Minus,
  MousePointer2,
  PenLine,
  Plus,
  Redo2,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  Upload,
  WandSparkles,
  X,
  Zap
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getLocalProject,
  loadLocalCanvasSnapshot,
  saveLocalCanvasSnapshot
} from "@/lib/local/database";
import {
  createSignedAssetUrl,
  getProject,
  listProjectAssets,
  loadLatestCanvasSnapshot,
  saveCanvasSnapshot,
  uploadProjectFile
} from "@/lib/supabase/database";
import { AgentSidebar } from "./AgentSidebar";
import { CanvasNodeActionsProvider } from "./CanvasNodeActionsContext";
import { CanvasElementNode } from "./CanvasElementNode";
import { GenerationTaskNode } from "./GenerationTaskNode";
import { ImageAssetNode } from "./ImageAssetNode";
import { MediaPreviewDialog } from "./MediaPreviewDialog";
import type {
  CanvasEdge,
  CanvasGenerationRequest,
  CanvasGenerationUpdate,
  CanvasNode,
  CanvasReferenceRequest,
  CanvasSnapshot,
  GeneratedCanvasMedia
} from "./types";

export type ProjectCanvasProps = {
  projectId: string;
  initialPrompt?: string;
};

type CanvasTool =
  | "select"
  | "marker"
  | "image"
  | "grid"
  | "frame"
  | "draw"
  | "text"
  | "generate"
  | "upload"
  | "chat";

type FloatingPanel = "layers" | "assets" | null;

type CanvasAspectRatio = NonNullable<GeneratedCanvasMedia["aspectRatio"]>;

type CanvasHistoryEntry = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

const nodeTypes = {
  imageAsset: ImageAssetNode,
  canvasElement: CanvasElementNode,
  generationTask: GenerationTaskNode
} satisfies NodeTypes;

const canvasTools = [
  { id: "select", label: "选择", icon: MousePointer2 },
  { id: "marker", label: "标记", icon: MapPin },
  { id: "image", label: "素材", icon: ImagePlus },
  { id: "grid", label: "网格", icon: Grid3X3 },
  { id: "frame", label: "画框", icon: Square },
  { id: "draw", label: "绘制", icon: PenLine },
  { id: "text", label: "文字", icon: Type },
  { id: "generate", label: "生成", icon: WandSparkles },
  { id: "upload", label: "上传", icon: Upload },
  { id: "chat", label: "对话", icon: MessageCircle }
] satisfies Array<{ id: CanvasTool; label: string; icon: typeof MousePointer2 }>;

export function ProjectCanvas({ projectId, initialPrompt }: ProjectCanvasProps) {
  return (
    <AuthGate>
      <ProjectCanvasContent projectId={projectId} initialPrompt={initialPrompt} />
    </AuthGate>
  );
}

function ProjectCanvasContent({ projectId, initialPrompt }: ProjectCanvasProps) {
  const { mode: appMode, user } = useAuth();
  const supabase = useMemo(
    () => (appMode === "supabase" ? getSupabaseBrowserClient() : null),
    [appMode]
  );
  const sectionRef = useRef<HTMLElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);
  const nodesRef = useRef<CanvasNode[]>([]);
  const edgesRef = useRef<CanvasEdge[]>([]);
  const historyRef = useRef<CanvasHistoryEntry[]>([]);
  const futureRef = useRef<CanvasHistoryEntry[]>([]);
  const historySnapshotRef = useRef<CanvasHistoryEntry | null>(null);
  const [projectName, setProjectName] = useState("Rufo");
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>([]);
  const [flow, setFlow] = useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const [viewport, setViewport] = useState<Viewport | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [gridVisible, setGridVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFocusRequest, setSidebarFocusRequest] = useState(0);
  const [floatingPanel, setFloatingPanel] = useState<FloatingPanel>(null);
  const [miniMapVisible, setMiniMapVisible] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [referenceRequest, setReferenceRequest] =
    useState<CanvasReferenceRequest | null>(null);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] =
    useState<CanvasGenerationRequest | null>(null);
  const [historyAvailability, setHistoryAvailability] = useState({
    undo: 0,
    redo: 0
  });

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      if (
        loadedRef.current &&
        changes.some((change) => change.type !== "select")
      ) {
        dirtyRef.current = true;
      }
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<CanvasEdge>[]) => {
      if (
        loadedRef.current &&
        changes.some((change) => change.type !== "select")
      ) {
        dirtyRef.current = true;
      }
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const persistSnapshot = useCallback(
    async (nextNodes: CanvasNode[], nextEdges: CanvasEdge[]) => {
      if (!user) {
        return;
      }

      const snapshot: CanvasSnapshot = {
        schemaVersion: 1,
        nodes: prepareCanvasNodesForSnapshot(nextNodes),
        edges: nextEdges,
        viewport: flow?.getViewport() ?? viewport,
        updatedAt: new Date().toISOString()
      };

      if (appMode === "demo") {
        await saveLocalCanvasSnapshot(projectId, snapshot);
      } else {
        await saveCanvasSnapshot(requireSupabase(supabase), projectId, user.id, snapshot);
      }
    },
    [appMode, flow, projectId, supabase, user, viewport]
  );

  const recordHistory = useCallback(
    (snapshot?: CanvasHistoryEntry) => {
      dirtyRef.current = true;
      const entry = snapshot ?? {
        nodes: structuredClone(nodesRef.current),
        edges: structuredClone(edgesRef.current)
      };
      historyRef.current = [...historyRef.current, entry].slice(-60);
      futureRef.current = [];
      setHistoryAvailability({
        undo: historyRef.current.length,
        redo: futureRef.current.length
      });
    },
    []
  );

  const captureTransformStart = useCallback(() => {
    if (!historySnapshotRef.current) {
      historySnapshotRef.current = {
        nodes: structuredClone(nodesRef.current),
        edges: structuredClone(edgesRef.current)
      };
    }
  }, []);

  const finishTransform = useCallback(() => {
    if (!historySnapshotRef.current) {
      return;
    }

    recordHistory(historySnapshotRef.current);
    historySnapshotRef.current = null;
  }, [recordHistory]);

  const undo = useCallback(() => {
    const previous = historyRef.current.at(-1);
    if (!previous) {
      return;
    }

    futureRef.current = [
      ...futureRef.current,
      {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges)
      }
    ].slice(-60);
    historyRef.current = historyRef.current.slice(0, -1);
    setNodes(structuredClone(previous.nodes));
    setEdges(structuredClone(previous.edges));
    setHistoryAvailability({
      undo: historyRef.current.length,
      redo: futureRef.current.length
    });
  }, [edges, nodes, setEdges, setNodes]);

  const redo = useCallback(() => {
    const next = futureRef.current.at(-1);
    if (!next) {
      return;
    }

    historyRef.current = [
      ...historyRef.current,
      {
        nodes: structuredClone(nodes),
        edges: structuredClone(edges)
      }
    ].slice(-60);
    futureRef.current = futureRef.current.slice(0, -1);
    setNodes(structuredClone(next.nodes));
    setEdges(structuredClone(next.edges));
    setHistoryAvailability({
      undo: historyRef.current.length,
      redo: futureRef.current.length
    });
  }, [edges, nodes, setEdges, setNodes]);

  useEffect(() => {
    let mounted = true;

    async function loadProject() {
      loadedRef.current = false;
      dirtyRef.current = false;
      setLoading(true);
      setError(null);

      try {
        const project =
          appMode === "demo"
            ? await getLocalProject(projectId)
            : await getProject(requireSupabase(supabase), projectId);
        const snapshot =
          appMode === "demo"
            ? await loadLocalCanvasSnapshot(projectId)
            : await loadLatestCanvasSnapshot(requireSupabase(supabase), projectId);

        if (!mounted) {
          return;
        }

        setProjectName(project.name);

        if (snapshot) {
          const restoredNodes =
            appMode === "demo"
              ? snapshot.nodes
              : await restoreAssetNodeUrls(snapshot.nodes, requireSupabase(supabase));
          setNodes(
            prepareCanvasNodesForRestore(normalizeMediaNodeSizes(restoredNodes))
          );
          setEdges([]);
          afterNextPaint(() => {
            if (!mounted) {
              return;
            }
            edgesRef.current = snapshot.edges;
            setEdges(snapshot.edges);
          });
          setViewport(snapshot.viewport);
          historyRef.current = [];
          futureRef.current = [];
          historySnapshotRef.current = null;
          setHistoryAvailability({ undo: 0, redo: 0 });
          dirtyRef.current = false;
        } else {
          const assets =
            appMode === "demo"
              ? []
              : await listProjectAssets(requireSupabase(supabase), projectId);
          const assetNodes = await Promise.all(
            assets.map(async (asset, index) => {
              const assetUrl = asset.storage_path
                ? await createSignedAssetUrl(requireSupabase(supabase), asset.storage_path, 3600)
                : asset.source_url ?? "";

              return createMediaNode(
                {
                  assetId: asset.id,
                  assetUrl,
                  storagePath: asset.storage_path,
                  sourceUrl: asset.source_url,
                  prompt: asset.prompt,
                  provider: normalizeProvider(asset.provider),
                  model: readMetadataString(asset.metadata, "providerModel"),
                  mediaType: asset.media_type ?? inferMediaType(asset.mime_type),
                  mimeType: asset.mime_type ?? undefined,
                  width: asset.width,
                  height: asset.height,
                  durationSeconds: asset.duration_seconds,
                  aspectRatio: readMediaAspectRatio(asset.metadata),
                  quality: readMediaQuality(asset.metadata),
                  audio: readMetadataBoolean(asset.metadata, "audio")
                },
                index
              );
            })
          );
          setNodes(assetNodes);
          setEdges([]);
          historyRef.current = [];
          futureRef.current = [];
          historySnapshotRef.current = null;
          setHistoryAvailability({ undo: 0, redo: 0 });
          dirtyRef.current = false;
        }
      } catch (caughtError) {
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : "画布加载失败。");
        }
      } finally {
        if (mounted) {
          setLoading(false);
          window.setTimeout(() => {
            loadedRef.current = true;
          }, 0);
        }
      }
    }

    void loadProject();

    return () => {
      mounted = false;
    };
  }, [appMode, projectId, setEdges, setNodes, supabase]);

  useEffect(() => {
    if (!loadedRef.current || loading || !dirtyRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistSnapshot(nodes, edges)
        .then(() => {
          dirtyRef.current = false;
        })
        .catch((caughtError) => {
          setError(caughtError instanceof Error ? caughtError.message : "自动保存失败。");
        });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [edges, loading, nodes, persistSnapshot]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      await persistSnapshot(nodesRef.current, edgesRef.current);
      dirtyRef.current = false;
      setStatus("已保存");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  function handleGenerationStart(request: CanvasGenerationRequest) {
    recordHistory();
    setNodes((current) => {
      const existingDraft = request.draftNodeId
        ? current.find((node) => node.id === request.draftNodeId)
        : undefined;
      const generationNode = createGenerationNode(
        request,
        existingDraft?.position ??
          getCanvasCenter(flow, sectionRef.current)
      );

      if (existingDraft) {
        return current.map((node) =>
          node.id === existingDraft.id
            ? { ...generationNode, id: existingDraft.id }
            : node
        );
      }

      return [...current, generationNode];
    });
    setStatus("生成任务已添加到画布");
  }

  function handleGenerationUpdate(
    clientTaskId: string,
    update: CanvasGenerationUpdate
  ) {
    if (update.status === "completed" || update.status === "failed") {
      dirtyRef.current = true;
    }
    setNodes((current) =>
      current.map((node) =>
        node.data.kind === "generation" &&
        node.data.clientTaskId === clientTaskId
          ? {
              ...node,
              data: {
                ...node.data,
                ...update,
                progress: update.progress ?? node.data.progress
              }
            }
          : node
      )
    );
  }

  function handleGenerated(
    media: GeneratedCanvasMedia,
    clientTaskId?: string
  ) {
    recordHistory();
    const assetNodeId = `asset-${media.assetId}`;
    const sourceGenerationNode = clientTaskId
      ? nodesRef.current.find(
          (node) =>
            node.data.kind === "generation" &&
            node.data.clientTaskId === clientTaskId
        )
      : undefined;
    const sourceNodeId = sourceGenerationNode?.id;

    setNodes((current) => {
      if (current.some((node) => node.id === assetNodeId)) {
        return current
          .filter((node) => node.id !== sourceNodeId)
          .map((node) => ({
            ...node,
            selected: node.id === assetNodeId
          }));
      }

      const generationNode = sourceNodeId
        ? current.find((node) => node.id === sourceNodeId)
        : undefined;
      const nextPosition = generationNode?.position;
      const nextNode = createMediaNode(media, current.length, nextPosition);

      if (generationNode) {
        return current.map((node) =>
          node.id === generationNode.id
            ? { ...nextNode, selected: true }
            : { ...node, selected: false }
        );
      }

      return [
        ...current.map((node) => ({ ...node, selected: false })),
        { ...nextNode, selected: true }
      ];
    });

    if (sourceNodeId) {
      setEdges((current) => {
        const next = current.map((edge) => ({
          ...edge,
          source: edge.source === sourceNodeId ? assetNodeId : edge.source,
          target: edge.target === sourceNodeId ? assetNodeId : edge.target
        }));
        edgesRef.current = next;
        return next;
      });
    }
    setStatus(`${media.mediaType === "video" ? "视频" : "图片"}已添加到画布`);
    window.setTimeout(() => void flow?.fitView({ padding: 0.25, duration: 350 }), 0);
  }

  function handleTool(tool: CanvasTool) {
    setError(null);

    if (tool === "grid") {
      setGridVisible((current) => !current);
      setActiveTool("select");
      return;
    }

    if (tool === "image") {
      setFloatingPanel((current) => (current === "assets" ? null : "assets"));
      setActiveTool("select");
      return;
    }

    if (tool === "upload") {
      uploadInputRef.current?.click();
      setActiveTool("select");
      return;
    }

    if (tool === "generate" || tool === "chat") {
      setSidebarOpen(true);
      setSidebarFocusRequest((current) => current + 1);
      setActiveTool("select");
      return;
    }

    if (tool === "marker") {
      addElementNode("marker");
      setActiveTool("select");
      return;
    }

    if (tool === "frame") {
      addElementNode("frame");
      setActiveTool("select");
      return;
    }

    if (tool === "text") {
      addElementNode("text");
      setActiveTool("select");
      return;
    }

    setActiveTool(tool);
  }

  function addElementNode(kind: "marker" | "frame" | "text") {
    recordHistory();
    const position = getCanvasCenter(flow, sectionRef.current);
    const id = `${kind}-${crypto.randomUUID()}`;
    const node: CanvasNode =
      kind === "marker"
        ? {
            id,
            type: "canvasElement",
            position,
            style: { width: 48, height: 48 },
            data: { kind, label: "标记" }
          }
        : kind === "text"
          ? {
              id,
              type: "canvasElement",
              position,
              style: { width: 280, height: 96 },
              data: { kind, label: "双击或直接输入文字", text: "双击或直接输入文字" }
            }
          : {
              id,
              type: "canvasElement",
              position,
              style: { width: 520, height: 360, zIndex: -1 },
              data: { kind, label: "画框" }
            };

    setNodes((current) => [...current, node]);
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) {
      return;
    }

    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const maxBytes = mediaType === "video" ? 100 * 1024 * 1024 : 20 * 1024 * 1024;

    if (file.size > maxBytes) {
      setError(`${mediaType === "video" ? "视频" : "图片"}文件过大。`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let assetUrl: string;
      let storagePath: string | undefined;

      if (appMode === "demo") {
        assetUrl = await fileToDataUrl(file);
      } else {
        const uploaded = await uploadProjectFile(requireSupabase(supabase), {
          userId: user.id,
          projectId,
          file,
          filename: file.name,
          folder: "references",
          contentType: file.type
        });
        storagePath = uploaded.path;
        assetUrl = await createSignedAssetUrl(requireSupabase(supabase), uploaded.path, 3600);
      }

      const uploadedDimensions =
        mediaType === "image" ? await readImageFileDimensions(file) : undefined;

      handleGenerated({
        assetId: crypto.randomUUID(),
        assetUrl,
        storagePath,
        prompt: file.name,
        provider: "pollinations-free",
        model: "upload",
        mediaType,
        mimeType: file.type,
        width: uploadedDimensions?.width ?? (mediaType === "video" ? 1280 : 1024),
        height: uploadedDimensions?.height ?? (mediaType === "video" ? 720 : 1024)
      });
      setStatus("本地素材已上传");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "上传失败。");
    } finally {
      setUploading(false);
    }
  }

  function handleDrawStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeTool !== "draw") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    setDrawingPoints([{ x: event.clientX - rect.left, y: event.clientY - rect.top }]);
  }

  function handleDrawMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeTool !== "draw" || !drawingPoints.length) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setDrawingPoints((current) => [
      ...current,
      { x: event.clientX - rect.left, y: event.clientY - rect.top }
    ]);
  }

  function handleDrawEnd() {
    if (drawingPoints.length < 2) {
      setDrawingPoints([]);
      return;
    }

    const minX = Math.min(...drawingPoints.map((point) => point.x));
    const minY = Math.min(...drawingPoints.map((point) => point.y));
    const maxX = Math.max(...drawingPoints.map((point) => point.x));
    const maxY = Math.max(...drawingPoints.map((point) => point.y));
    const width = Math.max(maxX - minX, 20);
    const height = Math.max(maxY - minY, 20);
    const path = drawingPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x - minX} ${point.y - minY}`)
      .join(" ");
    const position = flow?.screenToFlowPosition({
      x: (sectionRef.current?.getBoundingClientRect().left ?? 0) + minX,
      y: (sectionRef.current?.getBoundingClientRect().top ?? 0) + minY
    }) ?? { x: minX, y: minY };

    recordHistory();
    setNodes((current) => [
      ...current,
      {
        id: `drawing-${crypto.randomUUID()}`,
        type: "canvasElement",
        position,
        style: { width, height },
        data: {
          kind: "drawing",
          label: "自由绘制",
          path,
          width,
          height,
          color: "#111827"
        }
      }
    ]);
    setDrawingPoints([]);
    setActiveTool("select");
  }

  function selectNode(nodeId: string) {
    setNodes((current) =>
      current.map((node) => ({ ...node, selected: node.id === nodeId }))
    );
    const node = flow?.getNode(nodeId);
    if (node) {
      void flow?.setCenter(node.position.x, node.position.y, {
        zoom: Math.max(viewport?.zoom ?? 1, 0.8),
        duration: 300
      });
    }
  }

  function deleteNode(nodeId: string) {
    recordHistory();
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setEdges((current) =>
      current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );
  }

  function toggleNodeVisibility(nodeId: string) {
    recordHistory();
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId ? { ...node, hidden: !node.hidden } : node
      )
    );
  }

  const duplicateNode = useCallback((nodeId: string) => {
    const source = nodesRef.current.find((node) => node.id === nodeId);
    if (!source) {
      return;
    }

    recordHistory();
    const duplicate: CanvasNode = {
      ...structuredClone(source),
      id: `${source.data.kind}-${crypto.randomUUID()}`,
      position: {
        x: source.position.x + 36,
        y: source.position.y + 36
      },
      selected: true,
      data: {
        ...structuredClone(source.data),
        label: `${source.data.label} 副本`
      }
    };
    setNodes((current) => {
      const next = [
        ...current.map((node) => ({ ...node, selected: false })),
        duplicate
      ];
      nodesRef.current = next;
      return next;
    });
  }, [recordHistory, setNodes]);

  function renameNode(nodeId: string, name: string) {
    const node = nodesRef.current.find((candidate) => candidate.id === nodeId);
    if (!node || node.data.label === name) {
      return;
    }
    recordHistory();
    setNodes((current) => {
      const next = current.map((candidate) =>
        candidate.id === nodeId
          ? {
              ...candidate,
              data: {
                ...candidate.data,
                label: name
              }
            }
          : candidate
      );
      nodesRef.current = next;
      return next;
    });
  }

  function retryGeneration(nodeId: string) {
    const node = nodesRef.current.find((candidate) => candidate.id === nodeId);
    if (!node || node.data.kind !== "generation") {
      return;
    }

    setRetryRequest({
      clientTaskId: crypto.randomUUID(),
      draftNodeId: node.id,
      prompt:
        node.data.status === "draft"
          ? ""
          : node.data.prompt ?? node.data.label,
      provider: node.data.provider ?? "pollinations-free",
      modelId: node.data.model ?? "sana-free",
      modelLabel: node.data.modelLabel ?? node.data.model ?? "生成模型",
      mediaType: node.data.mediaType ?? "image",
      aspectRatio: node.data.aspectRatio ?? "1:1",
      quality: node.data.quality ?? "standard",
      durationSeconds: node.data.durationSeconds,
      createdAt: new Date().toISOString()
    });
    setSidebarOpen(true);
    setSidebarFocusRequest((current) => current + 1);
  }

  function sendNodeToReference(
    nodeId: string,
    draftPosition?: { x: number; y: number }
  ) {
    const node = nodesRef.current.find((candidate) => candidate.id === nodeId);
    if (
      !node ||
      node.data.kind !== "asset" ||
      typeof node.data.assetUrl !== "string" ||
      typeof node.data.storagePath !== "string"
    ) {
      setError("该媒体尚未保存到项目存储，无法作为生成参考。");
      return;
    }

    let draftNodeId: string | undefined;
    if (draftPosition) {
      recordHistory();
      draftNodeId = `generation-draft-${crypto.randomUUID()}`;
      setNodes((current) => {
        const next = [
          ...current,
          createDraftGenerationNode(draftNodeId!, draftPosition, node)
        ];
        nodesRef.current = next;
        return next;
      });
      const continuationEdge: CanvasEdge = {
        id: `edge-${crypto.randomUUID()}`,
        source: nodeId,
        target: draftNodeId,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#64748b", strokeWidth: 1.5 }
      };
      afterNextPaint(() => {
        setEdges((current) => {
          const next = addEdge(continuationEdge, current);
          edgesRef.current = next;
          return next;
        });
      });
    }

    setReferenceRequest({
      requestId: crypto.randomUUID(),
      nodeId,
      label: node.data.label,
      assetUrl: node.data.assetUrl,
      storagePath: node.data.storagePath,
      mediaType: node.data.mediaType ?? "image",
      aspectRatio:
        normalizeCanvasAspectRatio(node.data.aspectRatio) ??
        inferClosestAspectRatioFromNode(node),
      draftNodeId
    });
    setSidebarOpen(true);
    setSidebarFocusRequest((current) => current + 1);
    setStatus("已将媒体加入参考素材");
  }

  const handleConnect = useCallback(
    (connection: Connection) => {
      recordHistory();
      setEdges((current) => {
        const next = addEdge(
          {
            ...connection,
            id: `edge-${crypto.randomUUID()}`,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#64748b", strokeWidth: 1.5 }
          },
          current
        );
        edgesRef.current = next;
        return next;
      });
    },
    [recordHistory, setEdges]
  );

  const handleConnectEnd: OnConnectEnd = (
    event,
    connectionState
  ) => {
    if (connectionState.toNode || !connectionState.fromNode) {
      return;
    }

    const sourceNodeId = connectionState.fromNode.id;
    const clientPoint = readPointerClientPoint(event);
    const draftPosition =
      clientPoint && flow
        ? flow.screenToFlowPosition(clientPoint)
        : connectionState.pointer ?? undefined;
    window.setTimeout(
      () => sendNodeToReference(sourceNodeId, draftPosition),
      0
    );
  };

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        const selectedNode = nodes.find((node) => node.selected);
        if (selectedNode) {
          event.preventDefault();
          duplicateNode(selectedNode.id);
        }
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [nodes, redo, undo, duplicateNode]);

  const mediaNodes = nodes.filter((node) => node.data.kind === "asset");
  const previewNode = previewNodeId
    ? nodes.find((node) => node.id === previewNodeId)
    : undefined;
  const nodeActions = {
    onBeforeTransform: captureTransformStart,
    onTransformEnd: finishTransform,
    onDelete: deleteNode,
    onDuplicate: duplicateNode,
    onUseAsReference: (nodeId: string) => sendNodeToReference(nodeId),
    onRename: renameNode,
    onOpenPreview: setPreviewNodeId,
    onRetryGeneration: retryGeneration
  };
  const canUndo = historyAvailability.undo > 0;
  const canRedo = historyAvailability.redo > 0;

  return (
    <div
      className={
        sidebarOpen
          ? "grid h-screen grid-cols-[minmax(0,1fr)_380px] overflow-hidden bg-[#f7f7f8] max-lg:grid-cols-1"
          : "grid h-screen grid-cols-1 overflow-hidden bg-[#f7f7f8]"
      }
    >
      <section ref={sectionRef} className="relative min-w-0 overflow-hidden">
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(event) => void handleUpload(event)}
        />

        <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex h-12 items-center justify-between px-4">
          <div className="pointer-events-auto flex items-center gap-3">
            <Link href="/projects" title="返回项目" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <span className="text-sm font-semibold text-slate-800">{projectName}</span>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
              保存
            </button>
            {uploading ? <span className="text-xs text-blue-600 max-sm:hidden">正在上传...</span> : null}
            {status ? <span className="text-xs text-emerald-600 max-sm:hidden">{status}</span> : null}
            {error ? <span className="max-w-96 truncate text-xs text-red-600 max-md:hidden">{error}</span> : null}
          </div>

          <div className="pointer-events-auto flex items-center gap-3 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1" title="模型接入状态">
              <Zap className="h-3.5 w-3.5 fill-lime-400 text-lime-500" aria-hidden="true" />
              多模型
            </span>
            <button type="button" title="模型与额度" onClick={() => setSidebarOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
              <Gift className="h-4 w-4" aria-hidden="true" />
            </button>
            <UserMenu />
          </div>
        </header>

        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
            正在加载画布
          </div>
        ) : (
          <CanvasNodeActionsProvider actions={nodeActions}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              nodeTypes={nodeTypes}
              onInit={setFlow}
              onConnect={handleConnect}
              onConnectEnd={handleConnectEnd}
              connectionMode={ConnectionMode.Loose}
              connectOnClick
              edgesReconnectable
              onNodeDragStart={captureTransformStart}
              onNodeDragStop={finishTransform}
              onBeforeDelete={async () => {
                recordHistory();
                return true;
              }}
              onMoveEnd={(_event, nextViewport) => {
                setViewport(nextViewport);
                if (loadedRef.current) {
                  dirtyRef.current = true;
                }
              }}
              defaultViewport={viewport}
              fitView={nodes.length > 0}
              minZoom={0.1}
              maxZoom={3}
              deleteKeyCode={["Backspace", "Delete"]}
              panOnDrag={activeTool === "select"}
              nodesDraggable={activeTool === "select"}
              selectionOnDrag={activeTool === "select"}
              defaultEdgeOptions={{
                type: "smoothstep",
                animated: true,
                style: { stroke: "#64748b", strokeWidth: 1.5 }
              }}
              proOptions={{ hideAttribution: true }}
              className="bg-[#f7f7f8]"
            >
              {gridVisible ? <Background color="#d8dde5" gap={32} size={1} /> : null}
              {miniMapVisible ? (
                <MiniMap
                  pannable
                  zoomable
                  className="!bottom-16 !left-4 !right-auto !h-32 !w-44 !border !border-slate-200 !bg-white"
                  nodeColor={(node) => (node.data.mediaType === "video" ? "#2563eb" : "#94a3b8")}
                />
              ) : null}
            </ReactFlow>
          </CanvasNodeActionsProvider>
        )}

        {!loading && nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <p className="text-sm text-slate-400">输入想法生成图片或视频，也可以从底部工具栏添加内容</p>
          </div>
        ) : null}

        {activeTool === "draw" ? (
          <div
            className="absolute inset-0 z-20 cursor-crosshair"
            onPointerDown={handleDrawStart}
            onPointerMove={handleDrawMove}
            onPointerUp={handleDrawEnd}
            onPointerCancel={handleDrawEnd}
          >
            {drawingPoints.length > 1 ? (
              <svg className="h-full w-full">
                <polyline
                  points={drawingPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke="#111827"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </div>
        ) : null}

        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 text-slate-500">
          <button
            type="button"
            title="撤销"
            disabled={!canUndo}
            onClick={undo}
            className="rounded-md p-1.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="重做"
            disabled={!canRedo}
            onClick={redo}
            className="rounded-md p-1.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="h-4 w-px bg-slate-200" />
          <button
            type="button"
            title="缩小"
            onClick={() => void flow?.zoomOut({ duration: 160 })}
            className="rounded-md p-1.5 hover:bg-white"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="放大"
            onClick={() => void flow?.zoomIn({ duration: 160 })}
            className="rounded-md p-1.5 hover:bg-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="适配全部内容"
            onClick={() => void flow?.fitView({ padding: 0.18, duration: 260 })}
            className="rounded-md p-1.5 hover:bg-white"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="h-4 w-px bg-slate-200" />
          <button
            type="button"
            title="导航缩略图"
            onClick={() => setMiniMapVisible((current) => !current)}
            className={miniMapVisible ? "rounded-md bg-slate-900 p-1.5 text-white" : "rounded-md p-1.5 hover:bg-white"}
          >
            <Circle className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="图层"
            onClick={() => setFloatingPanel((current) => (current === "layers" ? null : "layers"))}
            className={floatingPanel === "layers" ? "rounded-md bg-slate-900 p-1.5 text-white" : "rounded-md p-1.5 hover:bg-white"}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="资产"
            onClick={() => setFloatingPanel((current) => (current === "assets" ? null : "assets"))}
            className={floatingPanel === "assets" ? "rounded-md bg-slate-900 p-1.5 text-white" : "rounded-md p-1.5 hover:bg-white"}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="h-4 w-px bg-slate-200" />
          <span className="w-10 text-xs">{Math.round((viewport?.zoom ?? 1) * 100)}%</span>
        </div>

        {floatingPanel ? (
          <CanvasPanel
            panel={floatingPanel}
            nodes={nodes}
            mediaNodes={mediaNodes}
            onClose={() => setFloatingPanel(null)}
            onSelect={selectNode}
            onDelete={deleteNode}
            onToggleVisibility={toggleNodeVisibility}
          />
        ) : null}

        <div className="absolute bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-lg shadow-slate-200/70">
          {canvasTools.map((tool) => {
            const Icon = tool.icon;
            const active =
              activeTool === tool.id ||
              (tool.id === "grid" && gridVisible) ||
              (tool.id === "image" && floatingPanel === "assets");

            return (
              <button
                key={tool.id}
                type="button"
                title={tool.label}
                onClick={() => handleTool(tool.id)}
                className={
                  active
                    ? "flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white"
                    : "flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      {sidebarOpen ? (
        <AgentSidebar
          projectId={projectId}
          initialPrompt={initialPrompt}
          focusRequest={sidebarFocusRequest}
          referenceRequest={referenceRequest}
          retryRequest={retryRequest}
          onGenerationStart={handleGenerationStart}
          onGenerationUpdate={handleGenerationUpdate}
          onGenerated={handleGenerated}
          onClose={() => setSidebarOpen(false)}
        />
      ) : (
        <button
          type="button"
          title="打开 Agent"
          onClick={() => setSidebarOpen(true)}
          className="absolute right-4 top-16 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {previewNode ? (
        <MediaPreviewDialog
          node={previewNode}
          onClose={() => setPreviewNodeId(null)}
          onRename={(name) => renameNode(previewNode.id, name)}
        />
      ) : null}
    </div>
  );
}

function CanvasPanel({
  panel,
  nodes,
  mediaNodes,
  onClose,
  onSelect,
  onDelete,
  onToggleVisibility
}: {
  panel: Exclude<FloatingPanel, null>;
  nodes: CanvasNode[];
  mediaNodes: CanvasNode[];
  onClose: () => void;
  onSelect: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onToggleVisibility: (nodeId: string) => void;
}) {
  const items = panel === "layers" ? [...nodes].reverse() : [...mediaNodes].reverse();

  return (
    <div className="absolute bottom-14 left-4 z-40 flex max-h-80 w-72 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="flex h-10 items-center justify-between border-b border-slate-100 px-3">
        <h3 className="text-xs font-semibold text-slate-800">{panel === "layers" ? "图层" : "媒体资产"}</h3>
        <button type="button" title="关闭" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 overflow-y-auto p-2">
        {items.length ? (
          items.map((node) => (
            <div key={node.id} className="mb-1 flex items-center gap-2 rounded-md border border-slate-100 px-2 py-2 hover:bg-slate-50">
              <button type="button" onClick={() => onSelect(node.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-xs font-medium text-slate-700">{node.data.label}</span>
                <span className="block text-[10px] text-slate-400">{node.data.mediaType ?? node.data.kind}</span>
              </button>
              {panel === "layers" ? (
                <button type="button" title={node.hidden ? "显示" : "隐藏"} onClick={() => onToggleVisibility(node.id)} className="rounded p-1 text-slate-400 hover:bg-white">
                  {node.hidden ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              ) : node.data.assetUrl ? (
                <a href={node.data.assetUrl} download={node.data.label} title="下载" className="rounded p-1 text-slate-400 hover:bg-white">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : null}
              <button type="button" title="删除" onClick={() => onDelete(node.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))
        ) : (
          <p className="px-2 py-6 text-center text-xs text-slate-400">暂无内容</p>
        )}
      </div>
    </div>
  );
}

function createGenerationNode(
  request: CanvasGenerationRequest,
  position: { x: number; y: number }
): CanvasNode {
  const ratio = readAspectRatioValue(request.aspectRatio) ?? 1;
  const naturalWidth = request.mediaType === "video" ? 1280 : 1024;
  const naturalHeight = Math.max(Math.round(naturalWidth / ratio), 1);
  const size = getCanvasMediaSize(
    naturalWidth,
    naturalHeight,
    request.mediaType,
    request.aspectRatio
  );

  return {
    id: request.draftNodeId ?? `generation-${request.clientTaskId}`,
    type: "generationTask",
    position,
    style: size,
    data: {
      kind: "generation",
      label: request.prompt,
      prompt: request.prompt,
      provider: request.provider,
      model: request.modelId,
      modelLabel: request.modelLabel,
      clientTaskId: request.clientTaskId,
      mediaType: request.mediaType,
      aspectRatio: request.aspectRatio,
      quality: request.quality,
      durationSeconds: request.durationSeconds,
      status: "processing",
      statusLabel: "正在提交任务",
      progress: 3,
      createdAt: request.createdAt
    }
  };
}

function createDraftGenerationNode(
  id: string,
  position: { x: number; y: number },
  sourceNode?: CanvasNode
): CanvasNode {
  const sourceSize = sourceNode ? readCanvasNodeSize(sourceNode) : null;
  const mediaType = sourceNode?.data.mediaType ?? "image";
  const aspectRatio =
    normalizeCanvasAspectRatio(sourceNode?.data.aspectRatio) ??
    (sourceSize
      ? inferClosestAspectRatio(sourceSize.width, sourceSize.height)
      : undefined);

  return {
    id,
    type: "generationTask",
    position,
    style: sourceSize ?? { width: 300, height: 300 },
    data: {
      kind: "generation",
      label: "等待填写生成描述",
      prompt: "等待填写生成描述",
      mediaType,
      aspectRatio: aspectRatio ?? undefined,
      status: "draft",
      statusLabel: "等待设置参数",
      progress: 0,
      width: sourceSize?.width,
      height: sourceSize?.height
    }
  };
}

function createMediaNode(
  media: GeneratedCanvasMedia,
  index: number,
  position?: { x: number; y: number }
): CanvasNode {
  const naturalWidth = media.width ?? (media.mediaType === "video" ? 1280 : 1024);
  const naturalHeight = media.height ?? (media.mediaType === "video" ? 720 : 1024);
  const { width, height } = getCanvasMediaSize(
    naturalWidth,
    naturalHeight,
    media.mediaType,
    media.aspectRatio
  );

  return {
    id: `asset-${media.assetId}`,
    type: "imageAsset",
    dragHandle: media.mediaType === "video" ? ".media-drag-handle" : undefined,
    position: position ?? {
      x: 120 + index * 36,
      y: 120 + index * 36
    },
    style: { width, height },
    data: {
      label: media.prompt || "生成媒体",
      kind: "asset",
      assetId: media.assetId,
      assetUrl: media.assetUrl,
      storagePath: media.storagePath ?? undefined,
      provider: media.provider,
      model: media.model,
      prompt: media.prompt,
      mediaType: media.mediaType,
      mimeType: media.mimeType,
      durationSeconds: media.durationSeconds ?? undefined,
      aspectRatio: media.aspectRatio ?? undefined,
      quality: media.quality ?? undefined,
      audio: media.audio ?? undefined,
      width: naturalWidth,
      height: naturalHeight,
      status: "completed"
    }
  };
}

function readPointerClientPoint(event: MouseEvent | TouchEvent) {
  if ("changedTouches" in event) {
    const touch = event.changedTouches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  return { x: event.clientX, y: event.clientY };
}

function afterNextPaint(callback: () => void) {
  window.setTimeout(callback, 80);
}

function prepareCanvasNodesForSnapshot(nodes: CanvasNode[]) {
  return nodes.map((node) => {
    const initialWidth =
      readPositiveNumber(node.measured?.width) ??
      readPositiveNumber(node.style?.width) ??
      node.initialWidth;
    const initialHeight =
      readPositiveNumber(node.measured?.height) ??
      readPositiveNumber(node.style?.height) ??
      node.initialHeight;

    return {
      ...node,
      initialWidth,
      initialHeight,
      selected: false,
      dragging: undefined,
      measured: undefined
    };
  });
}

function prepareCanvasNodesForRestore(nodes: CanvasNode[]) {
  return nodes.map((node) => {
    const initialWidth =
      readPositiveNumber(node.initialWidth) ??
      readPositiveNumber(node.measured?.width) ??
      readPositiveNumber(node.style?.width) ??
      undefined;
    const initialHeight =
      readPositiveNumber(node.initialHeight) ??
      readPositiveNumber(node.measured?.height) ??
      readPositiveNumber(node.style?.height) ??
      undefined;

    return {
      ...node,
      initialWidth,
      initialHeight,
      selected: false,
      dragging: undefined,
      measured: undefined
    };
  });
}

function normalizeMediaNodeSizes(nodes: CanvasNode[]) {
  return nodes.map((node) => {
    if (node.data.kind !== "asset") {
      return node;
    }

    const width = readPositiveNumber(node.data.width);
    const height = readPositiveNumber(node.data.height);
    const styleWidth = readPositiveNumber(node.style?.width);
    const styleHeight = readPositiveNumber(node.style?.height);

    if (!width || !height) {
      return node;
    }

    const expectedSize = getCanvasMediaSize(
      width,
      height,
      node.data.mediaType ?? "image",
      node.data.aspectRatio
    );
    const expectedRatio = expectedSize.width / expectedSize.height;
    const nodeRatio =
      styleWidth && styleHeight ? styleWidth / styleHeight : Number.NaN;
    const oversized =
      Boolean(styleWidth && styleWidth > 720) ||
      Boolean(styleHeight && styleHeight > 720);
    const distorted =
      !Number.isFinite(nodeRatio) ||
      Math.abs(nodeRatio - expectedRatio) / expectedRatio > 0.01;
    const dragHandle =
      node.data.mediaType === "video" ? ".media-drag-handle" : undefined;

    if (!oversized && !distorted) {
      return {
        ...node,
        dragHandle
      };
    }

    return {
      ...node,
      dragHandle,
      style: {
        ...node.style,
        ...expectedSize
      }
    };
  });
}

async function restoreAssetNodeUrls(
  nodes: CanvasNode[],
  supabase: ReturnType<typeof getSupabaseBrowserClient>
) {
  return Promise.all(
    nodes.map(async (node) => {
      if (node.data.kind !== "asset" || typeof node.data.storagePath !== "string") {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          assetUrl: await createSignedAssetUrl(supabase, node.data.storagePath, 3600)
        }
      };
    })
  );
}

function getCanvasCenter(
  flow: ReactFlowInstance<CanvasNode, CanvasEdge> | null,
  section: HTMLElement | null
) {
  const rect = section?.getBoundingClientRect();

  if (!flow || !rect) {
    return { x: 160, y: 120 };
  }

  return flow.screenToFlowPosition({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  });
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("无法读取文件。"));
    reader.readAsDataURL(file);
  });
}

function getCanvasMediaSize(
  naturalWidth: number,
  naturalHeight: number,
  mediaType: GeneratedCanvasMedia["mediaType"],
  aspectRatio?: GeneratedCanvasMedia["aspectRatio"]
) {
  const ratio =
    naturalWidth > 0 && naturalHeight > 0
      ? naturalWidth / naturalHeight
      : readAspectRatioValue(aspectRatio) ??
        (mediaType === "video" ? 16 / 9 : 1);
  const maxWidth = mediaType === "video" ? 560 : 520;
  const maxHeight = mediaType === "video" ? 420 : 520;
  let width = Math.min(naturalWidth, maxWidth);
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  return {
    width: Math.round(Math.max(width, 180)),
    height: Math.round(Math.max(height, 120))
  };
}

function readPositiveNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function readCanvasNodeSize(node: CanvasNode) {
  const width =
    readPositiveNumber(node.measured?.width) ??
    readPositiveNumber(node.style?.width) ??
    readPositiveNumber(node.initialWidth) ??
    readPositiveNumber(node.data.width);
  const height =
    readPositiveNumber(node.measured?.height) ??
    readPositiveNumber(node.style?.height) ??
    readPositiveNumber(node.initialHeight) ??
    readPositiveNumber(node.data.height);

  return width && height
    ? {
        width: Math.round(width),
        height: Math.round(height)
      }
    : null;
}

function inferClosestAspectRatioFromNode(node: CanvasNode) {
  const size = readCanvasNodeSize(node);
  return size ? inferClosestAspectRatio(size.width, size.height) : undefined;
}

function normalizeCanvasAspectRatio(value: unknown): CanvasAspectRatio | undefined {
  return value === "1:1" ||
    value === "4:3" ||
    value === "3:4" ||
    value === "3:2" ||
    value === "2:3" ||
    value === "16:9" ||
    value === "9:16" ||
    value === "21:9"
    ? value
    : undefined;
}

function inferClosestAspectRatio(
  width: number,
  height: number
): CanvasAspectRatio {
  const ratio = width / height;
  const candidates: CanvasAspectRatio[] = [
    "1:1",
    "4:3",
    "3:4",
    "3:2",
    "2:3",
    "16:9",
    "9:16",
    "21:9"
  ];

  return candidates.reduce((best, candidate) => {
    const candidateRatio = readAspectRatioValue(candidate) ?? 1;
    const bestRatio = readAspectRatioValue(best) ?? 1;
    return Math.abs(candidateRatio - ratio) < Math.abs(bestRatio - ratio)
      ? candidate
      : best;
  }, "1:1" as CanvasAspectRatio);
}

async function readImageFileDimensions(file: File) {
  if (!file.type.startsWith("image/")) {
    return undefined;
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      width: image.naturalWidth,
      height: image.naturalHeight
    };
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function inferMediaType(mimeType: string | null) {
  return mimeType?.startsWith("video/") ? "video" : "image";
}

function readMetadataString(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" ? candidate : undefined;
}

function readMetadataBoolean(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "boolean" ? candidate : undefined;
}

function readMediaAspectRatio(value: unknown): GeneratedCanvasMedia["aspectRatio"] {
  const candidate = readMetadataString(value, "aspectRatio");
  return candidate === "1:1" ||
    candidate === "4:3" ||
    candidate === "3:4" ||
    candidate === "3:2" ||
    candidate === "2:3" ||
    candidate === "16:9" ||
    candidate === "9:16" ||
    candidate === "21:9"
    ? candidate
    : undefined;
}

function readMediaQuality(value: unknown): GeneratedCanvasMedia["quality"] {
  const candidate = readMetadataString(value, "quality");
  return candidate === "standard" ||
    candidate === "high" ||
    candidate === "ultra"
    ? candidate
    : undefined;
}

function readAspectRatioValue(value?: GeneratedCanvasMedia["aspectRatio"]) {
  if (!value) {
    return null;
  }

  const [width, height] = value.split(":").map(Number);
  return width > 0 && height > 0 ? width / height : null;
}

function normalizeProvider(value: string) {
  if (
    value === "pollinations-free" ||
    value === "pollinations" ||
    value === "huggingface" ||
    value === "agnes" ||
    value === "nano-banana" ||
    value === "gptlmage2"
  ) {
    return value;
  }

  return "pollinations-free";
}

function requireSupabase(client: ReturnType<typeof getSupabaseBrowserClient> | null) {
  if (!client) {
    throw new Error("Supabase 客户端未配置。");
  }

  return client;
}
