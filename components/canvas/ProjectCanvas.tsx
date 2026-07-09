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
  SelectionMode,
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
  Check,
  Circle,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileJson,
  Gift,
  Grid3X3,
  HelpCircle,
  ImagePlus,
  Layers,
  Languages,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Minus,
  Monitor,
  MousePointer2,
  Moon,
  PenLine,
  Plus,
  Redo2,
  Save,
  Share2,
  Square,
  Sun,
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
import {
  usePreferences,
  type RufoLanguage,
  type RufoThemeMode
} from "@/components/settings/PreferencesProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getLocalProject,
  loadLocalCanvasSnapshot,
  saveLocalCanvasSnapshot,
  updateLocalProjectName
} from "@/lib/local/database";
import {
  createSignedAssetUrl,
  getProject,
  listProjectAssets,
  loadLatestCanvasSnapshot,
  saveCanvasSnapshot,
  updateProjectName,
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
  CanvasMediaEditMode,
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

type CanvasNodePosition = {
  x: number;
  y: number;
};

type ModelCatalogItem = {
  id: string;
  label: string;
  provider: string;
  mediaType: "image" | "video";
  freeTier?: boolean;
  requiresKey?: boolean;
  available?: boolean;
  aspectRatios?: string[];
  qualityOptions?: string[];
  durationOptions?: number[];
  description?: string;
};

type AutosaveState = "saved" | "saving" | "dirty" | "error";

type CanvasCopy = {
  tools: Record<CanvasTool, string>;
  theme: Record<RufoThemeMode, string> & { theme: string; language: string };
  topbar: {
    back: string;
    projectName: string;
    editProjectName: string;
    saveProjectName: string;
    save: string;
    saving: string;
    uploading: string;
    help: string;
    share: string;
    exportJson: string;
    modelStatus: string;
    multiModel: string;
  };
  autosave: Record<AutosaveState, string>;
  status: {
    renamed: string;
    exported: string;
    copied: string;
    copyFailed: string;
    generationAdded: string;
    imageAdded: string;
    videoAdded: string;
    saved: string;
  };
  errors: { loadCanvas: string; autoSave: string; save: string; rename: string };
  canvas: {
    loading: string;
    empty: string;
    zoomOut: string;
    zoomIn: string;
    fitView: string;
    minimap: string;
    layers: string;
    assets: string;
    undo: string;
    redo: string;
  };
  selection: {
    selected: string;
    copy: string;
    group: string;
    ungroup: string;
    delete: string;
  };
  panels: {
    close: string;
    layers: string;
    assets: string;
    empty: string;
    show: string;
    hide: string;
    download: string;
    delete: string;
  };
  share: {
    title: string;
    copyLink: string;
    copied: string;
    copyError: string;
    exportJson: string;
    body: (projectName: string) => string;
  };
  help: {
    title: string;
    body: string;
    items: Array<[string, string]>;
  };
  models: {
    title: string;
    loading: string;
    error: string;
    available: string;
    needKey: string;
    image: string;
    video: string;
    ratio: string;
    quality: string;
    duration: string;
    openAgent: string;
    summary: (total: number, available: number, image: number, video: number) => string;
  };
};

const canvasCopyByLanguage: Record<RufoLanguage, CanvasCopy> = {
  "zh-CN": {
    tools: { select: "选择", marker: "标记", image: "素材", grid: "网格", frame: "画框", draw: "绘制", text: "文字", generate: "生成", upload: "上传", chat: "对话" },
    theme: { theme: "主题", language: "语言", system: "跟随系统", light: "日间", dark: "夜间" },
    topbar: { back: "返回项目", projectName: "项目名称", editProjectName: "编辑项目名称", saveProjectName: "保存项目名称", save: "保存", saving: "保存中", uploading: "正在上传...", help: "画布帮助", share: "分享项目", exportJson: "导出画布 JSON", modelStatus: "模型与额度", multiModel: "多模型" },
    autosave: { saved: "已自动保存", saving: "自动保存中", dirty: "有未保存更改", error: "自动保存失败" },
    status: { renamed: "项目名称已更新", exported: "画布 JSON 已导出", copied: "项目链接已复制", copyFailed: "项目链接复制失败，请手动复制浏览器地址栏链接。", generationAdded: "生成任务已添加到画布", imageAdded: "图片已添加到画布", videoAdded: "视频已添加到画布", saved: "已保存" },
    errors: { loadCanvas: "画布加载失败。", autoSave: "自动保存失败。", save: "保存失败。", rename: "项目重命名失败。" },
    canvas: { loading: "正在加载画布", empty: "输入想法生成图片或视频，也可以从底部工具栏添加内容", zoomOut: "缩小", zoomIn: "放大", fitView: "适配全部内容", minimap: "导航缩略图", layers: "图层", assets: "资产", undo: "撤销", redo: "重做" },
    selection: { selected: "已选", copy: "复制", group: "打组", ungroup: "取消打组", delete: "删除" },
    panels: { close: "关闭", layers: "图层", assets: "媒体资产", empty: "暂无内容", show: "显示", hide: "隐藏", download: "下载", delete: "删除" },
    share: { title: "分享与导出", copyLink: "复制项目链接", copied: "已复制项目链接。", copyError: "复制失败，请手动复制浏览器地址栏链接。", exportJson: "导出画布 JSON", body: (projectName) => `${projectName} 的链接可复制给有权限的用户，画布 JSON 可用于备份或迁移。` },
    help: { title: "画布操作帮助", body: "这些操作都已经接入当前 Rufo 画布，不是静态说明。", items: [["框选多个节点", "在画布空白处拖拽，选中后可复制、删除、打组或取消打组。"], ["移动画布", "按住空格拖拽，或使用鼠标中键/右键拖动画布。"], ["继续生成", "选中图片或视频后点击闪光按钮，或从节点两侧拖出连接线。"], ["上传素材", "底部上传按钮支持图片和视频，上传后会作为可拖动节点。"], ["历史记录", "右侧 Agent 顶部时钟按钮可查看生成历史和失败原因。"], ["快捷键", "Delete 删除，Cmd/Ctrl+Z 撤销，Shift+Cmd/Ctrl+Z 重做，Cmd/Ctrl+D 复制。"]] },
    models: { title: "模型与额度状态", loading: "正在读取模型状态", error: "模型状态加载失败，请稍后重试。", available: "可用", needKey: "需 Key", image: "图片", video: "视频", ratio: "比例", quality: "画质", duration: "时长", openAgent: "打开 Agent 设置", summary: (total, available, image, video) => `当前模型池：${total || "-"} 个模型，${available || 0} 个可直接使用，图片 ${image || 0} 个，视频 ${video || 0} 个。` }
  },
  en: {
    tools: { select: "Select", marker: "Pin", image: "Assets", grid: "Grid", frame: "Frame", draw: "Draw", text: "Text", generate: "Generate", upload: "Upload", chat: "Agent" },
    theme: { theme: "Theme", language: "Language", system: "System", light: "Light", dark: "Dark" },
    topbar: { back: "Back to projects", projectName: "Project name", editProjectName: "Edit project name", saveProjectName: "Save project name", save: "Save", saving: "Saving", uploading: "Uploading...", help: "Canvas help", share: "Share project", exportJson: "Export canvas JSON", modelStatus: "Models and quota", multiModel: "Multi-model" },
    autosave: { saved: "Autosaved", saving: "Autosaving", dirty: "Unsaved changes", error: "Autosave failed" },
    status: { renamed: "Project name updated", exported: "Canvas JSON exported", copied: "Project link copied", copyFailed: "Failed to copy the link. Copy the browser URL manually.", generationAdded: "Generation task added to canvas", imageAdded: "Image added to canvas", videoAdded: "Video added to canvas", saved: "Saved" },
    errors: { loadCanvas: "Failed to load canvas.", autoSave: "Autosave failed.", save: "Save failed.", rename: "Failed to rename project." },
    canvas: { loading: "Loading canvas", empty: "Enter an idea to generate images or videos, or add content from the bottom toolbar.", zoomOut: "Zoom out", zoomIn: "Zoom in", fitView: "Fit all content", minimap: "Minimap", layers: "Layers", assets: "Assets", undo: "Undo", redo: "Redo" },
    selection: { selected: "Selected", copy: "Copy", group: "Group", ungroup: "Ungroup", delete: "Delete" },
    panels: { close: "Close", layers: "Layers", assets: "Media assets", empty: "No content", show: "Show", hide: "Hide", download: "Download", delete: "Delete" },
    share: { title: "Share and export", copyLink: "Copy project link", copied: "Project link copied.", copyError: "Copy failed. Copy the browser URL manually.", exportJson: "Export canvas JSON", body: (projectName) => `Copy the ${projectName} link for permitted users, or export JSON for backup and migration.` },
    help: { title: "Canvas help", body: "These are active Rufo canvas operations, not static descriptions.", items: [["Box-select nodes", "Drag on empty canvas space, then copy, delete, group, or ungroup the selection."], ["Move the canvas", "Hold Space and drag, or use middle/right mouse drag."], ["Continue generation", "Select media and use the sparkle action, or drag connections from node sides."], ["Upload media", "Use the upload tool for images and videos; uploads become draggable nodes."], ["History", "Use the Agent history button to review tasks and failure reasons."], ["Shortcuts", "Delete removes, Cmd/Ctrl+Z undoes, Shift+Cmd/Ctrl+Z redoes, Cmd/Ctrl+D duplicates."]] },
    models: { title: "Models and quota", loading: "Reading model status", error: "Failed to load model status. Try again later.", available: "Ready", needKey: "Needs key", image: "Image", video: "Video", ratio: "Ratio", quality: "Quality", duration: "Duration", openAgent: "Open Agent settings", summary: (total, available, image, video) => `Model pool: ${total || "-"} models, ${available || 0} ready, ${image || 0} image, ${video || 0} video.` }
  },
  ja: {
    tools: { select: "選択", marker: "マーク", image: "素材", grid: "グリッド", frame: "フレーム", draw: "描画", text: "テキスト", generate: "生成", upload: "アップロード", chat: "Agent" },
    theme: { theme: "テーマ", language: "言語", system: "システム", light: "ライト", dark: "ダーク" },
    topbar: { back: "プロジェクトへ戻る", projectName: "プロジェクト名", editProjectName: "名前を編集", saveProjectName: "名前を保存", save: "保存", saving: "保存中", uploading: "アップロード中...", help: "ヘルプ", share: "共有", exportJson: "JSON書き出し", modelStatus: "モデルと上限", multiModel: "マルチモデル" },
    autosave: { saved: "自動保存済み", saving: "自動保存中", dirty: "未保存の変更", error: "自動保存失敗" },
    status: { renamed: "プロジェクト名を更新しました", exported: "キャンバス JSON を書き出しました", copied: "リンクをコピーしました", copyFailed: "リンクをコピーできません。ブラウザの URL を手動でコピーしてください。", generationAdded: "生成タスクを追加しました", imageAdded: "画像を追加しました", videoAdded: "動画を追加しました", saved: "保存しました" },
    errors: { loadCanvas: "キャンバスを読み込めませんでした。", autoSave: "自動保存に失敗しました。", save: "保存に失敗しました。", rename: "名前の変更に失敗しました。" },
    canvas: { loading: "キャンバスを読み込み中", empty: "アイデアを入力して画像や動画を生成するか、下部ツールバーから追加してください。", zoomOut: "縮小", zoomIn: "拡大", fitView: "全体を表示", minimap: "ミニマップ", layers: "レイヤー", assets: "素材", undo: "元に戻す", redo: "やり直し" },
    selection: { selected: "選択済み", copy: "コピー", group: "グループ化", ungroup: "解除", delete: "削除" },
    panels: { close: "閉じる", layers: "レイヤー", assets: "メディア素材", empty: "内容なし", show: "表示", hide: "非表示", download: "ダウンロード", delete: "削除" },
    share: { title: "共有と書き出し", copyLink: "リンクをコピー", copied: "リンクをコピーしました。", copyError: "コピーできません。URL を手動でコピーしてください。", exportJson: "JSON書き出し", body: (projectName) => `${projectName} のリンクを共有し、JSON はバックアップや移行に使えます。` },
    help: { title: "キャンバス操作", body: "これらは Rufo キャンバスに実装済みの操作です。", items: [["複数ノード選択", "空白部分をドラッグし、コピー、削除、グループ化、解除ができます。"], ["キャンバス移動", "Space を押しながらドラッグ、または中/右クリックで移動します。"], ["継続生成", "メディアを選択してスパーク操作、またはノード横から接続をドラッグします。"], ["素材アップロード", "画像と動画をアップロードするとドラッグ可能なノードになります。"], ["履歴", "Agent の履歴ボタンでタスクと失敗理由を確認できます。"], ["ショートカット", "Delete 削除、Cmd/Ctrl+Z 元に戻す、Shift+Cmd/Ctrl+Z やり直し、Cmd/Ctrl+D 複製。"]] },
    models: { title: "モデルと上限", loading: "モデル状態を読み込み中", error: "モデル状態を読み込めません。", available: "利用可", needKey: "Key 必要", image: "画像", video: "動画", ratio: "比率", quality: "品質", duration: "時間", openAgent: "Agent 設定を開く", summary: (total, available, image, video) => `モデル数：${total || "-"}、利用可能 ${available || 0}、画像 ${image || 0}、動画 ${video || 0}。` }
  },
  ko: {
    tools: { select: "선택", marker: "마커", image: "소재", grid: "그리드", frame: "프레임", draw: "그리기", text: "텍스트", generate: "생성", upload: "업로드", chat: "Agent" },
    theme: { theme: "테마", language: "언어", system: "시스템", light: "라이트", dark: "다크" },
    topbar: { back: "프로젝트로 돌아가기", projectName: "프로젝트 이름", editProjectName: "이름 편집", saveProjectName: "이름 저장", save: "저장", saving: "저장 중", uploading: "업로드 중...", help: "도움말", share: "공유", exportJson: "JSON 내보내기", modelStatus: "모델 및 한도", multiModel: "멀티 모델" },
    autosave: { saved: "자동 저장됨", saving: "자동 저장 중", dirty: "저장되지 않음", error: "자동 저장 실패" },
    status: { renamed: "프로젝트 이름이 업데이트되었습니다", exported: "캔버스 JSON을 내보냈습니다", copied: "링크를 복사했습니다", copyFailed: "링크 복사 실패. 브라우저 주소를 직접 복사하세요.", generationAdded: "생성 작업을 캔버스에 추가했습니다", imageAdded: "이미지를 캔버스에 추가했습니다", videoAdded: "비디오를 캔버스에 추가했습니다", saved: "저장됨" },
    errors: { loadCanvas: "캔버스를 불러오지 못했습니다.", autoSave: "자동 저장에 실패했습니다.", save: "저장에 실패했습니다.", rename: "프로젝트 이름 변경에 실패했습니다." },
    canvas: { loading: "캔버스 불러오는 중", empty: "아이디어를 입력해 이미지나 영상을 생성하거나 하단 도구에서 콘텐츠를 추가하세요.", zoomOut: "축소", zoomIn: "확대", fitView: "전체 맞춤", minimap: "미니맵", layers: "레이어", assets: "자산", undo: "실행 취소", redo: "다시 실행" },
    selection: { selected: "선택됨", copy: "복사", group: "그룹", ungroup: "그룹 해제", delete: "삭제" },
    panels: { close: "닫기", layers: "레이어", assets: "미디어 자산", empty: "콘텐츠 없음", show: "표시", hide: "숨기기", download: "다운로드", delete: "삭제" },
    share: { title: "공유 및 내보내기", copyLink: "링크 복사", copied: "링크를 복사했습니다.", copyError: "복사 실패. 브라우저 주소를 직접 복사하세요.", exportJson: "JSON 내보내기", body: (projectName) => `${projectName} 링크를 공유하고 JSON은 백업 또는 이전에 사용할 수 있습니다.` },
    help: { title: "캔버스 도움말", body: "이 작업들은 Rufo 캔버스에 실제로 연결되어 있습니다.", items: [["여러 노드 선택", "빈 캔버스에서 드래그해 선택한 뒤 복사, 삭제, 그룹, 그룹 해제가 가능합니다."], ["캔버스 이동", "Space를 누른 채 드래그하거나 가운데/오른쪽 버튼으로 이동합니다."], ["이어 생성", "미디어를 선택해 스파크 작업을 쓰거나 노드 양쪽에서 연결을 끌어냅니다."], ["소재 업로드", "이미지와 영상을 업로드하면 드래그 가능한 노드가 됩니다."], ["기록", "Agent 기록 버튼에서 작업과 실패 이유를 확인합니다."], ["단축키", "Delete 삭제, Cmd/Ctrl+Z 실행 취소, Shift+Cmd/Ctrl+Z 다시 실행, Cmd/Ctrl+D 복제."]] },
    models: { title: "모델 및 한도", loading: "모델 상태 읽는 중", error: "모델 상태를 불러오지 못했습니다.", available: "사용 가능", needKey: "Key 필요", image: "이미지", video: "비디오", ratio: "비율", quality: "품질", duration: "시간", openAgent: "Agent 설정 열기", summary: (total, available, image, video) => `모델 풀: ${total || "-"}개, 사용 가능 ${available || 0}개, 이미지 ${image || 0}개, 비디오 ${video || 0}개.` }
  }
};

const canvasLanguageLabels: Record<RufoLanguage, string> = {
  "zh-CN": "中文",
  en: "EN",
  ja: "日本語",
  ko: "한국어"
};

const nodeTypes = {
  imageAsset: ImageAssetNode,
  canvasElement: CanvasElementNode,
  generationTask: GenerationTaskNode
} satisfies NodeTypes;

const canvasTools = [
  { id: "select", icon: MousePointer2 },
  { id: "marker", icon: MapPin },
  { id: "image", icon: ImagePlus },
  { id: "grid", icon: Grid3X3 },
  { id: "frame", icon: Square },
  { id: "draw", icon: PenLine },
  { id: "text", icon: Type },
  { id: "generate", icon: WandSparkles },
  { id: "upload", icon: Upload },
  { id: "chat", icon: MessageCircle }
] satisfies Array<{ id: CanvasTool; icon: typeof MousePointer2 }>;

export function ProjectCanvas({ projectId, initialPrompt }: ProjectCanvasProps) {
  return (
    <AuthGate>
      <ProjectCanvasContent projectId={projectId} initialPrompt={initialPrompt} />
    </AuthGate>
  );
}

function ProjectCanvasContent({ projectId, initialPrompt }: ProjectCanvasProps) {
  const { mode: appMode, user } = useAuth();
  const { themeMode, language, setThemeMode, setLanguage } = usePreferences();
  const copy = canvasCopyByLanguage[language];
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
  const [draftProjectName, setDraftProjectName] = useState("Rufo");
  const [renamingProject, setRenamingProject] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>([]);
  const [flow, setFlow] = useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const [viewport, setViewport] = useState<Viewport | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("saved");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [gridVisible, setGridVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFocusRequest, setSidebarFocusRequest] = useState(0);
  const [sidebarSettingsRequest, setSidebarSettingsRequest] = useState(0);
  const [floatingPanel, setFloatingPanel] = useState<FloatingPanel>(null);
  const [miniMapVisible, setMiniMapVisible] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [referenceRequest, setReferenceRequest] =
    useState<CanvasReferenceRequest | null>(null);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] =
    useState<CanvasGenerationRequest | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [modelStatusOpen, setModelStatusOpen] = useState(false);
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
        setAutosaveState("dirty");
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
        setAutosaveState("dirty");
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
      setAutosaveState("dirty");
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
        setDraftProjectName(project.name);

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
          setError(caughtError instanceof Error ? caughtError.message : copy.errors.loadCanvas);
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
  }, [appMode, copy.errors.loadCanvas, projectId, setEdges, setNodes, supabase]);

  useEffect(() => {
    if (!loadedRef.current || loading || !dirtyRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAutosaveState("saving");
      void persistSnapshot(nodes, edges)
        .then(() => {
          dirtyRef.current = false;
          setAutosaveState("saved");
          setError((current) => (isAutosaveError(current, copy.errors.autoSave) ? null : current));
        })
        .catch((caughtError) => {
          setAutosaveState("error");
          setError(caughtError instanceof Error ? caughtError.message : copy.errors.autoSave);
        });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [copy.errors.autoSave, edges, loading, nodes, persistSnapshot, viewport]);

  useEffect(() => {
    function flushBeforeHidden() {
      if (document.visibilityState !== "hidden" || !loadedRef.current || !dirtyRef.current) {
        return;
      }

      void persistSnapshot(nodesRef.current, edgesRef.current)
        .then(() => {
          dirtyRef.current = false;
          setAutosaveState("saved");
          setError((current) => (isAutosaveError(current, copy.errors.autoSave) ? null : current));
        })
        .catch(() => {
          setAutosaveState("error");
        });
    }

    document.addEventListener("visibilitychange", flushBeforeHidden);
    return () => document.removeEventListener("visibilitychange", flushBeforeHidden);
  }, [copy.errors.autoSave, persistSnapshot]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      await persistSnapshot(nodesRef.current, edgesRef.current);
      dirtyRef.current = false;
      setAutosaveState("saved");
      setStatus(copy.status.saved);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.errors.save);
    } finally {
      setSaving(false);
    }
  }

  async function handleRenameProject() {
    if (!user) {
      return;
    }

    const nextName = draftProjectName.trim() || "Rufo";
    if (nextName === projectName) {
      return;
    }

    setError(null);

    try {
      if (appMode === "demo") {
        await updateLocalProjectName(projectId, nextName);
      } else {
        await updateProjectName(requireSupabase(supabase), projectId, nextName);
      }
      setProjectName(nextName);
      setDraftProjectName(nextName);
      setStatus(copy.status.renamed);
    } catch (caughtError) {
      setDraftProjectName(projectName);
      setError(caughtError instanceof Error ? caughtError.message : copy.errors.rename);
    }
  }

  function handleExportCanvas() {
    const snapshot: CanvasSnapshot = {
      schemaVersion: 1,
      nodes: prepareCanvasNodesForSnapshot(nodesRef.current),
      edges: edgesRef.current,
      viewport: flow?.getViewport() ?? viewport,
      updatedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFilename(projectName)}-canvas.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(copy.status.exported);
  }

  async function handleCopyProjectLink() {
    try {
      await copyTextToClipboard(window.location.href);
      setStatus(copy.status.copied);
      return true;
    } catch {
      setError(copy.status.copyFailed);
      return false;
    }
  }

  function handleGenerationStart(request: CanvasGenerationRequest) {
    recordHistory();
    setNodes((current) => {
      const existingDraft = request.draftNodeId
        ? current.find((node) => node.id === request.draftNodeId)
        : undefined;
      const baseGenerationNode = createGenerationNode(
        request,
        existingDraft?.position ??
          getCanvasCenter(flow, sectionRef.current)
      );
      const existingDraftSize = existingDraft
        ? readCanvasNodeSize(existingDraft)
        : null;
      const generationNode = existingDraft
        ? {
            ...baseGenerationNode,
            style: existingDraftSize
              ? { ...baseGenerationNode.style, ...existingDraftSize }
              : baseGenerationNode.style,
            data: {
              ...baseGenerationNode.data,
              width: existingDraft?.data.width,
              height: existingDraft?.data.height,
              preserveCanvasSize:
                existingDraft?.data.preserveCanvasSize ?? Boolean(existingDraftSize)
            }
          }
        : {
            ...baseGenerationNode,
            position: findAvailableCanvasPosition(
              baseGenerationNode.position,
              readCanvasNodeSize(baseGenerationNode),
              current
            )
          };

      if (existingDraft) {
        const next = current.map((node) =>
          node.id === existingDraft.id
            ? { ...generationNode, id: existingDraft.id }
            : node
        );
        nodesRef.current = next;
        return next;
      }

      const next = [...current, generationNode];
      nodesRef.current = next;
      return next;
    });
    setStatus(copy.status.generationAdded);
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
        const next = current
          .filter((node) => node.id !== sourceNodeId)
          .map((node) => ({
            ...node,
            selected: node.id === assetNodeId
          }));
        nodesRef.current = next;
        return next;
      }

      const generationNode = sourceNodeId
        ? current.find((node) => node.id === sourceNodeId)
        : undefined;
      const nextPosition = generationNode?.position;
      const provisionalNode = createMediaNode(media, current.length, nextPosition);
      const inheritedCanvasSize =
        generationNode?.data.preserveCanvasSize === true
          ? readCanvasNodeSize(generationNode)
          : null;
      const nextNode = {
        ...provisionalNode,
        style: inheritedCanvasSize
          ? { ...provisionalNode.style, ...inheritedCanvasSize }
          : provisionalNode.style,
        data: {
          ...provisionalNode.data,
          preserveCanvasSize: Boolean(inheritedCanvasSize)
        },
        position: generationNode
          ? generationNode.position
          : findAvailableCanvasPosition(
              provisionalNode.position,
              inheritedCanvasSize ?? readCanvasNodeSize(provisionalNode),
              current
            )
      };

      if (generationNode) {
        const next = current.map((node) =>
          node.id === generationNode.id
            ? { ...nextNode, selected: true }
            : { ...node, selected: false }
        );
        nodesRef.current = next;
        return next;
      }

      const next = [
        ...current.map((node) => ({ ...node, selected: false })),
        { ...nextNode, selected: true }
      ];
      nodesRef.current = next;
      return next;
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
    setStatus(media.mediaType === "video" ? copy.status.videoAdded : copy.status.imageAdded);
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

    setNodes((current) => {
      const nextNode = {
        ...node,
        position: findAvailableCanvasPosition(
          node.position,
          readCanvasNodeSize(node),
          current
        )
      };
      const next = [...current, nextNode];
      nodesRef.current = next;
      return next;
    });
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
      const positionedDuplicate = {
        ...duplicate,
        position: findAvailableCanvasPosition(
          duplicate.position,
          readCanvasNodeSize(duplicate),
          current
        )
      };
      const next = [
        ...current.map((node) => ({ ...node, selected: false })),
        positionedDuplicate
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

  function editMediaNode(nodeId: string, mode: CanvasMediaEditMode) {
    const source = nodesRef.current.find((candidate) => candidate.id === nodeId);
    if (!source || source.data.kind !== "asset") {
      return;
    }

    recordHistory();

    if (mode === "crop") {
      const enteringCrop = source.data.objectFit !== "cover";
      const nextObjectFit = enteringCrop ? ("cover" as const) : ("contain" as const);
      const nextResizeMode = enteringCrop ? ("free" as const) : ("aspect" as const);
      setNodes((current) => {
        const next = current.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                selected: true,
                data: {
                  ...node.data,
                  objectFit: nextObjectFit,
                  resizeMode: nextResizeMode
                }
              }
            : { ...node, selected: false }
        );
        nodesRef.current = next;
        return next;
      });
      setStatus(
        enteringCrop
          ? "已启用裁切框：拖动边角可改变裁切范围"
          : "已恢复完整适应显示"
      );
      return;
    }

    setNodes((current) => {
      const currentSource =
        current.find((candidate) => candidate.id === nodeId) ?? source;
      const editNode = createMediaEditElementNode(currentSource, current, mode);
      const next = [
        ...current.map((node) => ({ ...node, selected: false })),
        editNode
      ];
      nodesRef.current = next;
      return next;
    });
    setStatus(mediaEditStatusLabel(mode));
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

    recordHistory();
    const draftNodeId = `generation-draft-${crypto.randomUUID()}`;
    setNodes((current) => {
      const currentSource =
        current.find((candidate) => candidate.id === nodeId) ?? node;
      const draftNode = createDraftGenerationNode(
        draftNodeId,
        { x: 0, y: 0 },
        currentSource
      );
      const positionedDraftNode = {
        ...draftNode,
        position: findContinuationDraftPosition({
          sourceNode: currentSource,
          draftNode,
          nodes: current,
          requestedPosition: draftPosition
        })
      };
      const next = [...current, positionedDraftNode];
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
  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedGroupNodes = selectedNodes.filter((node) =>
    nodes.some((candidate) => candidate.parentId === node.id)
  );
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
    onEditMedia: editMediaNode,
    onRetryGeneration: retryGeneration
  };
  const canUndo = historyAvailability.undo > 0;
  const canRedo = historyAvailability.redo > 0;

  function deleteSelectedNodes() {
    const selectedIds = collectSelectedNodeIds(nodesRef.current);
    if (!selectedIds.size) {
      return;
    }

    recordHistory();
    setNodes((current) => {
      const next = current.filter((node) => !selectedIds.has(node.id));
      nodesRef.current = next;
      return next;
    });
    setEdges((current) => {
      const next = current.filter(
        (edge) => !selectedIds.has(edge.source) && !selectedIds.has(edge.target)
      );
      edgesRef.current = next;
      return next;
    });
  }

  function duplicateSelectedNodes() {
    const sourceNodes = collectSelectedNodes(nodesRef.current);
    if (!sourceNodes.length) {
      return;
    }

    recordHistory();
    const selectedIds = new Set(sourceNodes.map((node) => node.id));
    const idMap = new Map(
      sourceNodes.map((node) => [node.id, `${node.data.kind}-${crypto.randomUUID()}`])
    );
    const duplicates = sourceNodes.map((node) => {
      const parentId =
        typeof node.parentId === "string" ? node.parentId : undefined;
      const parentIsDuplicated =
        typeof parentId === "string" && idMap.has(parentId);
      const nextParentId =
        parentIsDuplicated && parentId ? idMap.get(parentId) : node.parentId;
      const nextExtent = typeof nextParentId === "string" ? undefined : node.extent;

      return {
        ...structuredClone(node),
        id: idMap.get(node.id)!,
        parentId: nextParentId,
        extent: nextExtent,
        position: {
          x: parentIsDuplicated ? node.position.x : node.position.x + 44,
          y: parentIsDuplicated ? node.position.y : node.position.y + 44
        },
        selected: true,
        data: {
          ...structuredClone(node.data),
          label: `${node.data.label} 副本`
        }
      };
    });
    const duplicateEdges = edgesRef.current
      .filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))
      .map((edge) => ({
        ...structuredClone(edge),
        id: `edge-${crypto.randomUUID()}`,
        source: idMap.get(edge.source) ?? edge.source,
        target: idMap.get(edge.target) ?? edge.target
      }));

    setNodes((current) => {
      const next = [
        ...current.map((node) => ({ ...node, selected: false })),
        ...duplicates
      ];
      nodesRef.current = next;
      return next;
    });
    setEdges((current) => {
      const next = [...current, ...duplicateEdges];
      edgesRef.current = next;
      return next;
    });
  }

  function groupSelectedNodes() {
    const sourceNodes = nodesRef.current.filter(
      (node) => node.selected && !node.hidden
    );

    if (sourceNodes.length < 2) {
      setStatus("请先框选至少两个节点再打组");
      return;
    }

    const bounds = getNodesAbsoluteBounds(sourceNodes, nodesRef.current);
    if (!bounds) {
      return;
    }

    recordHistory();
    const padding = 36;
    const groupId = `group-${crypto.randomUUID()}`;
    const groupPosition = {
      x: bounds.x - padding,
      y: bounds.y - padding
    };
    const selectedIds = new Set(sourceNodes.map((node) => node.id));
    const groupNode: CanvasNode = {
      id: groupId,
      type: "canvasElement",
      position: groupPosition,
      style: {
        width: Math.round(bounds.width + padding * 2),
        height: Math.round(bounds.height + padding * 2),
        zIndex: -1
      },
      data: {
        kind: "frame",
        label: `分组 ${sourceNodes.length} 项`
      },
      selected: true
    };

    setNodes((current) => {
      const nextChildren = current.map((node) => {
        if (!selectedIds.has(node.id)) {
          return { ...node, selected: false };
        }

        const absolutePosition = getNodeAbsolutePosition(node, current);
        return {
          ...node,
          parentId: groupId,
          extent: undefined,
          position: {
            x: Math.round(absolutePosition.x - groupPosition.x),
            y: Math.round(absolutePosition.y - groupPosition.y)
          },
          selected: false
        };
      });
      const next = [groupNode, ...nextChildren];
      nodesRef.current = next;
      return next;
    });
    setStatus(`已打组 ${sourceNodes.length} 个节点`);
  }

  function ungroupSelectedNodes() {
    const currentNodes = nodesRef.current;
    const groupIds = new Set(
      currentNodes
        .filter(
          (node) =>
            node.selected &&
            currentNodes.some((candidate) => candidate.parentId === node.id)
        )
        .map((node) => node.id)
    );

    if (!groupIds.size) {
      setStatus("请先选中一个分组画框");
      return;
    }

    recordHistory();
    const groupsById = new Map(
      currentNodes
        .filter((node) => groupIds.has(node.id))
        .map((node) => [node.id, node])
    );

    setNodes((current) => {
      const next = current.flatMap((node) => {
        if (groupIds.has(node.id)) {
          return [];
        }

        if (typeof node.parentId === "string" && groupIds.has(node.parentId)) {
          const parent = groupsById.get(node.parentId);
          return [
            {
              ...node,
              parentId: undefined,
              extent: undefined,
              position: {
                x: Math.round((parent?.position.x ?? 0) + node.position.x),
                y: Math.round((parent?.position.y ?? 0) + node.position.y)
              },
              selected: true
            }
          ];
        }

        return [node];
      });
      nodesRef.current = next;
      return next;
    });
    setStatus("已取消打组");
  }

  return (
    <div
      className={
        sidebarOpen
          ? "rufo-route-enter rufo-canvas grid h-screen grid-cols-[minmax(0,1fr)_380px] overflow-hidden bg-[color:var(--rufo-canvas-bg)] text-[color:var(--rufo-canvas-fg)] max-lg:grid-cols-1"
          : "rufo-route-enter rufo-canvas grid h-screen grid-cols-1 overflow-hidden bg-[color:var(--rufo-canvas-bg)] text-[color:var(--rufo-canvas-fg)]"
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
            <Link href="/projects" title={copy.topbar.back} aria-label={copy.topbar.back} className="rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                event.currentTarget.querySelector("input")?.blur();
              }}
              className="pointer-events-auto flex items-center gap-1"
            >
              <input
                value={draftProjectName}
                onChange={(event) => setDraftProjectName(event.target.value)}
                onFocus={() => setRenamingProject(true)}
                onBlur={() => {
                  setRenamingProject(false);
                  void handleRenameProject();
                }}
                className="h-10 w-44 rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-slate-800 outline-none hover:border-slate-200 hover:bg-white focus:border-slate-300 focus:bg-white"
                aria-label={copy.topbar.projectName}
                title={copy.topbar.editProjectName}
              />
              {renamingProject ? (
                <button
                  type="submit"
                  title={copy.topbar.saveProjectName}
                  aria-label={copy.topbar.saveProjectName}
                  className="rufo-canvas-icon-button flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-white"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <Edit3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              )}
            </form>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              aria-label={saving ? copy.topbar.saving : copy.topbar.save}
              className="inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
              {saving ? copy.topbar.saving : copy.topbar.save}
            </button>
            <span
              role="status"
              aria-live="polite"
              className={
                autosaveState === "error"
                  ? "rufo-canvas-status-live text-xs text-red-600 max-sm:hidden"
                  : autosaveState === "dirty"
                    ? "rufo-canvas-status-live text-xs text-amber-600 max-sm:hidden"
                    : autosaveState === "saving"
                      ? "rufo-canvas-status-live text-xs text-blue-600 max-sm:hidden"
                      : "rufo-canvas-status-live text-xs text-slate-400 max-sm:hidden"
              }
            >
              {copy.autosave[autosaveState]}
            </span>
            {uploading ? <span role="status" aria-live="polite" className="text-xs text-blue-600 max-sm:hidden">{copy.topbar.uploading}</span> : null}
            {status ? <span role="status" aria-live="polite" className="text-xs text-emerald-600 max-sm:hidden">{status}</span> : null}
            {error ? <span role="alert" className="max-w-96 truncate text-xs text-red-600 max-md:hidden">{error}</span> : null}
          </div>

          <div className="pointer-events-auto flex items-center gap-3 text-xs font-medium text-slate-500">
            <CanvasPreferenceControls
              copy={copy}
              themeMode={themeMode}
              language={language}
              setThemeMode={setThemeMode}
              setLanguage={setLanguage}
            />
            <button
              type="button"
              title={copy.topbar.help}
              aria-label={copy.topbar.help}
              onClick={() => setHelpDialogOpen(true)}
              className="rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              title={copy.topbar.share}
              aria-label={copy.topbar.share}
              onClick={() => setShareDialogOpen(true)}
              className="rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              title={copy.topbar.exportJson}
              aria-label={copy.topbar.exportJson}
              onClick={handleExportCanvas}
              className="rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <FileJson className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="inline-flex items-center gap-1" title={copy.topbar.modelStatus}>
              <Zap className="h-3.5 w-3.5 fill-lime-400 text-lime-500" aria-hidden="true" />
              {copy.topbar.multiModel}
            </span>
            <button type="button" title={copy.topbar.modelStatus} aria-label={copy.topbar.modelStatus} onClick={() => setModelStatusOpen(true)} className="rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
              <Gift className="h-4 w-4" aria-hidden="true" />
            </button>
            <UserMenu />
          </div>
        </header>

        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
            {copy.canvas.loading}
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
              connectionRadius={52}
              connectionDragThreshold={2}
              connectOnClick
              edgesReconnectable
              selectionMode={SelectionMode.Partial}
              onNodeDragStart={captureTransformStart}
              onNodeDragStop={finishTransform}
              onSelectionDragStart={captureTransformStart}
              onSelectionDragStop={finishTransform}
              onBeforeDelete={async () => {
                recordHistory();
                return true;
              }}
              onMoveEnd={(_event, nextViewport) => {
                setViewport(nextViewport);
                if (loadedRef.current) {
                  dirtyRef.current = true;
                  setAutosaveState("dirty");
                }
              }}
              defaultViewport={viewport}
              fitView={false}
              minZoom={0.1}
              maxZoom={3}
              deleteKeyCode={["Backspace", "Delete"]}
              panOnDrag={activeTool === "select" ? [1, 2] : false}
              panActivationKeyCode="Space"
              selectionKeyCode={null}
              multiSelectionKeyCode={["Meta", "Control", "Shift"]}
              nodesDraggable={activeTool === "select"}
              selectionOnDrag={activeTool === "select"}
              defaultEdgeOptions={{
                type: "smoothstep",
                animated: true,
                style: { stroke: "#64748b", strokeWidth: 1.5 }
              }}
              proOptions={{ hideAttribution: true }}
              className="bg-[color:var(--rufo-canvas-bg)]"
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
            <p className="text-sm text-slate-400">{copy.canvas.empty}</p>
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

        {selectedNodes.length ? (
          <SelectionActionBar
            copy={copy}
            selectedCount={selectedNodes.length}
            canGroup={selectedNodes.length >= 2}
            canUngroup={selectedGroupNodes.length > 0}
            onDuplicate={duplicateSelectedNodes}
            onGroup={groupSelectedNodes}
            onUngroup={ungroupSelectedNodes}
            onDelete={deleteSelectedNodes}
          />
        ) : null}

        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 text-slate-500">
          <button
            type="button"
            title={copy.canvas.undo}
            aria-label={copy.canvas.undo}
            disabled={!canUndo}
            onClick={undo}
            className="rufo-canvas-icon-button rounded-md p-2.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title={copy.canvas.redo}
            aria-label={copy.canvas.redo}
            disabled={!canRedo}
            onClick={redo}
            className="rufo-canvas-icon-button rounded-md p-2.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="h-4 w-px bg-slate-200" />
          <button
            type="button"
            title={copy.canvas.zoomOut}
            aria-label={copy.canvas.zoomOut}
            onClick={() => void flow?.zoomOut({ duration: 160 })}
            className="rufo-canvas-icon-button rounded-md p-2.5 hover:bg-white"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title={copy.canvas.zoomIn}
            aria-label={copy.canvas.zoomIn}
            onClick={() => void flow?.zoomIn({ duration: 160 })}
            className="rufo-canvas-icon-button rounded-md p-2.5 hover:bg-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title={copy.canvas.fitView}
            aria-label={copy.canvas.fitView}
            onClick={() => void flow?.fitView({ padding: 0.18, duration: 260 })}
            className="rufo-canvas-icon-button rounded-md p-2.5 hover:bg-white"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="h-4 w-px bg-slate-200" />
          <button
            type="button"
            title={copy.canvas.minimap}
            aria-label={copy.canvas.minimap}
            onClick={() => setMiniMapVisible((current) => !current)}
            className={miniMapVisible ? "rufo-canvas-icon-button rounded-md bg-slate-900 p-2.5 text-white" : "rufo-canvas-icon-button rounded-md p-2.5 hover:bg-white"}
          >
            <Circle className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title={copy.canvas.layers}
            aria-label={copy.canvas.layers}
            onClick={() => setFloatingPanel((current) => (current === "layers" ? null : "layers"))}
            className={floatingPanel === "layers" ? "rufo-canvas-icon-button rounded-md bg-slate-900 p-2.5 text-white" : "rufo-canvas-icon-button rounded-md p-2.5 hover:bg-white"}
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title={copy.canvas.assets}
            aria-label={copy.canvas.assets}
            onClick={() => setFloatingPanel((current) => (current === "assets" ? null : "assets"))}
            className={floatingPanel === "assets" ? "rufo-canvas-icon-button rounded-md bg-slate-900 p-2.5 text-white" : "rufo-canvas-icon-button rounded-md p-2.5 hover:bg-white"}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="h-4 w-px bg-slate-200" />
          <span className="w-10 text-xs">{Math.round((viewport?.zoom ?? 1) * 100)}%</span>
        </div>

        {floatingPanel ? (
          <CanvasPanel
            panel={floatingPanel}
            copy={copy}
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
                title={copy.tools[tool.id]}
                aria-label={copy.tools[tool.id]}
                onClick={() => handleTool(tool.id)}
                className={
                  active
                    ? "rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-md bg-slate-900 text-white"
                    : "rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
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
          settingsRequest={sidebarSettingsRequest}
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
          title="Rufo Agent"
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
          onEdit={(mode) => editMediaNode(previewNode.id, mode)}
        />
      ) : null}

      {shareDialogOpen ? (
        <ShareCanvasDialog
          copy={copy}
          projectName={projectName}
          onClose={() => setShareDialogOpen(false)}
          onCopyLink={handleCopyProjectLink}
          onExport={handleExportCanvas}
        />
      ) : null}

      {helpDialogOpen ? (
        <CanvasHelpDialog copy={copy} onClose={() => setHelpDialogOpen(false)} />
      ) : null}

      {modelStatusOpen ? (
        <ModelStatusDialog
          copy={copy}
          onClose={() => setModelStatusOpen(false)}
          onOpenAgent={() => {
            setModelStatusOpen(false);
            setSidebarOpen(true);
            setSidebarSettingsRequest((current) => current + 1);
          }}
        />
      ) : null}
    </div>
  );
}

function CanvasPreferenceControls({
  copy,
  themeMode,
  language,
  setThemeMode,
  setLanguage
}: {
  copy: CanvasCopy;
  themeMode: RufoThemeMode;
  language: RufoLanguage;
  setThemeMode: (themeMode: RufoThemeMode) => void;
  setLanguage: (language: RufoLanguage) => void;
}) {
  const ThemeIcon = themeMode === "light" ? Sun : themeMode === "dark" ? Moon : Monitor;

  return (
    <div className="hidden items-center gap-2 xl:flex">
      <label className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-slate-500 shadow-sm">
        <ThemeIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{copy.theme.theme}</span>
        <select
          value={themeMode}
          onChange={(event) => setThemeMode(event.target.value as RufoThemeMode)}
          className="bg-transparent text-[11px] font-medium outline-none"
          aria-label={copy.theme.theme}
        >
          <option value="system">{copy.theme.system}</option>
          <option value="light">{copy.theme.light}</option>
          <option value="dark">{copy.theme.dark}</option>
        </select>
      </label>
      <label className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-slate-500 shadow-sm">
        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{copy.theme.language}</span>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as RufoLanguage)}
          className="bg-transparent text-[11px] font-medium outline-none"
          aria-label={copy.theme.language}
        >
          {Object.entries(canvasLanguageLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CanvasPanel({
  panel,
  copy,
  nodes,
  mediaNodes,
  onClose,
  onSelect,
  onDelete,
  onToggleVisibility
}: {
  panel: Exclude<FloatingPanel, null>;
  copy: CanvasCopy;
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
        <h3 className="text-xs font-semibold text-slate-800">{panel === "layers" ? copy.panels.layers : copy.panels.assets}</h3>
        <button type="button" title={copy.panels.close} onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
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
                <button type="button" title={node.hidden ? copy.panels.show : copy.panels.hide} onClick={() => onToggleVisibility(node.id)} className="rounded p-1 text-slate-400 hover:bg-white">
                  {node.hidden ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              ) : node.data.assetUrl ? (
                <a href={node.data.assetUrl} download={node.data.label} title={copy.panels.download} className="rounded p-1 text-slate-400 hover:bg-white">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : null}
              <button type="button" title={copy.panels.delete} onClick={() => onDelete(node.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))
        ) : (
          <p className="px-2 py-6 text-center text-xs text-slate-400">{copy.panels.empty}</p>
        )}
      </div>
    </div>
  );
}

function SelectionActionBar({
  copy,
  selectedCount,
  canGroup,
  canUngroup,
  onDuplicate,
  onGroup,
  onUngroup,
  onDelete
}: {
  copy: CanvasCopy;
  selectedCount: number;
  canGroup: boolean;
  canUngroup: boolean;
  onDuplicate: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-16 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/80">
      <span className="px-2 text-xs font-semibold text-slate-600">
        {copy.selection.selected} {selectedCount}
      </span>
      <button
        type="button"
        title={copy.selection.copy}
        onClick={onDuplicate}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.selection.copy}
      </button>
      <button
        type="button"
        title={copy.selection.group}
        disabled={!canGroup}
        onClick={onGroup}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Layers className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.selection.group}
      </button>
      <button
        type="button"
        title={copy.selection.ungroup}
        disabled={!canUngroup}
        onClick={onUngroup}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Square className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.selection.ungroup}
      </button>
      <button
        type="button"
        title={copy.selection.delete}
        onClick={onDelete}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.selection.delete}
      </button>
    </div>
  );
}

function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

function ShareCanvasDialog({
  copy,
  projectName,
  onClose,
  onCopyLink,
  onExport
}: {
  copy: CanvasCopy;
  projectName: string;
  onClose: () => void;
  onCopyLink: () => Promise<boolean>;
  onExport: () => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");

  useCloseOnEscape(onClose);

  async function handleCopyLink() {
    const copied = await onCopyLink();
    setCopyState(copied ? "success" : "error");
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{copy.share.title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {copy.share.body(projectName)}
            </p>
          </div>
          <button type="button" title={copy.panels.close} onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {copy.share.copyLink}
          </button>
          {copyState === "success" ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              {copy.share.copied}
            </p>
          ) : copyState === "error" ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {copy.share.copyError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileJson className="h-4 w-4" aria-hidden="true" />
            {copy.share.exportJson}
          </button>
        </div>
      </section>
    </div>
  );
}

function CanvasHelpDialog({ copy, onClose }: { copy: CanvasCopy; onClose: () => void }) {
  useCloseOnEscape(onClose);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{copy.help.title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {copy.help.body}
            </p>
          </div>
          <button type="button" title={copy.panels.close} onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {copy.help.items.map(([title, body]) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModelStatusDialog({
  copy,
  onClose,
  onOpenAgent
}: {
  copy: CanvasCopy;
  onClose: () => void;
  onOpenAgent: () => void;
}) {
  const [models, setModels] = useState<ModelCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useCloseOnEscape(onClose);

  useEffect(() => {
    let mounted = true;
    fetch("/api/media-generation")
      .then((response) => response.json())
      .then((payload: { data?: ModelCatalogItem[] }) => {
        if (mounted) {
          setModels(payload.data ?? []);
          setError(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setError(copy.models.error);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [copy.models.error]);

  const availableCount = models.filter((model) => model.available).length;
  const imageCount = models.filter((model) => model.mediaType === "image").length;
  const videoCount = models.filter((model) => model.mediaType === "video").length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="flex max-h-[min(760px,calc(100vh-32px))] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{copy.models.title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {copy.models.summary(models.length, availableCount, imageCount, videoCount)}
            </p>
          </div>
          <button type="button" title={copy.panels.close} onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-36 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              {copy.models.loading}
            </div>
          ) : error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {models.map((model) => (
                <article key={model.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{model.label}</h3>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {canvasProviderDisplayName(model.provider)} · {model.mediaType === "video" ? copy.models.video : copy.models.image}
                      </p>
                    </div>
                    <span className={model.available ? "rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700" : "rounded bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"}>
                      {model.available ? copy.models.available : copy.models.needKey}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{model.description}</p>
                  <p className="mt-2 text-[10px] text-slate-400">
                    {copy.models.ratio} {model.aspectRatios?.join(" / ") ?? "-"} · {copy.models.quality} {model.qualityOptions?.join(" / ") ?? "-"}
                    {model.durationOptions?.length ? ` · ${copy.models.duration} ${model.durationOptions.join(" / ")}s` : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
        <footer className="flex justify-end border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onOpenAgent}
            className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {copy.models.openAgent}
          </button>
        </footer>
      </section>
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
      height: sourceSize?.height,
      preserveCanvasSize: Boolean(sourceSize)
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

function createMediaEditElementNode(
  sourceNode: CanvasNode,
  allNodes: CanvasNode[],
  mode: Exclude<CanvasMediaEditMode, "crop">
): CanvasNode {
  const sourcePosition = getNodeAbsolutePosition(sourceNode, allNodes);
  const sourceSize = readCanvasNodeSize(sourceNode) ?? { width: 320, height: 320 };
  const id = `${mode}-${crypto.randomUUID()}`;

  if (mode === "text") {
    const width = Math.round(Math.min(Math.max(sourceSize.width * 0.58, 180), sourceSize.width - 24));
    return {
      id,
      type: "canvasElement",
      position: {
        x: Math.round(sourcePosition.x + sourceSize.width * 0.08),
        y: Math.round(sourcePosition.y + sourceSize.height * 0.12)
      },
      style: { width, height: 86, zIndex: 40 },
      selected: true,
      data: {
        kind: "text",
        label: "点击编辑文字",
        text: "点击编辑文字"
      }
    };
  }

  if (mode === "selection") {
    const width = Math.round(Math.min(Math.max(sourceSize.width * 0.5, 140), sourceSize.width - 28));
    const height = Math.round(Math.min(Math.max(sourceSize.height * 0.42, 110), sourceSize.height - 28));
    return {
      id,
      type: "canvasElement",
      position: {
        x: Math.round(sourcePosition.x + (sourceSize.width - width) / 2),
        y: Math.round(sourcePosition.y + (sourceSize.height - height) / 2)
      },
      style: { width, height, zIndex: 35 },
      selected: true,
      data: {
        kind: "frame",
        label: "框选区域"
      }
    };
  }

  const width = Math.round(Math.min(Math.max(sourceSize.width * 0.62, 140), sourceSize.width - 30));
  const height = Math.round(Math.min(Math.max(sourceSize.height * 0.28, 72), sourceSize.height - 30));
  const midY = Math.round(height * 0.55);
  return {
    id,
    type: "canvasElement",
    position: {
      x: Math.round(sourcePosition.x + sourceSize.width * 0.14),
      y: Math.round(sourcePosition.y + sourceSize.height * 0.18)
    },
    style: { width, height, zIndex: 45 },
    selected: true,
    data: {
      kind: "drawing",
      label: "涂鸦标注",
      path: `M 12 ${midY} C ${Math.round(width * 0.25)} 8 ${Math.round(width * 0.45)} ${height - 12} ${Math.round(width * 0.64)} ${midY} S ${width - 26} 12 ${width - 12} ${Math.round(height * 0.42)}`,
      width,
      height,
      color: "#f97316"
    }
  };
}

function mediaEditStatusLabel(mode: CanvasMediaEditMode) {
  if (mode === "doodle") return "已添加涂鸦标注层";
  if (mode === "selection") return "已添加框选区域";
  if (mode === "text") return "已添加文字层";
  return "已更新媒体编辑模式";
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
      extent: typeof node.parentId === "string" ? undefined : node.extent,
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

    if (node.data.preserveCanvasSize === true) {
      return {
        ...node,
        dragHandle:
          node.data.mediaType === "video" ? ".media-drag-handle" : undefined
      };
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
  const selectedRatio = readAspectRatioValue(aspectRatio);
  const naturalRatio =
    naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : null;
  const ratio =
    selectedRatio ?? naturalRatio ?? (mediaType === "video" ? 16 / 9 : 1);
  const maxWidth = mediaType === "video" ? 560 : 520;
  const maxHeight = mediaType === "video" ? 420 : 520;
  let width = Math.min(naturalWidth > 0 ? naturalWidth : maxWidth, maxWidth);
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

function safeFilename(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "rufo-canvas"
  );
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Clipboard copy failed.");
  }
}

function canvasProviderDisplayName(provider: string) {
  if (provider === "pollinations") return "Pollinations";
  if (provider === "huggingface") return "Hugging Face";
  if (provider === "agnes") return "Agnes AI";
  if (provider === "nano-banana") return "Nano Banana";
  if (provider === "gptlmage2") return "GPTlmage2";
  if (provider === "pollinations-free") return "公共模型";
  return provider;
}

function collectSelectedNodeIds(nodes: CanvasNode[]) {
  const selectedIds = new Set(
    nodes.filter((node) => node.selected).map((node) => node.id)
  );
  let expanded = true;

  while (expanded) {
    expanded = false;
    for (const node of nodes) {
      if (
        typeof node.parentId === "string" &&
        selectedIds.has(node.parentId) &&
        !selectedIds.has(node.id)
      ) {
        selectedIds.add(node.id);
        expanded = true;
      }
    }
  }

  return selectedIds;
}

function collectSelectedNodes(nodes: CanvasNode[]) {
  const selectedIds = collectSelectedNodeIds(nodes);
  return nodes.filter((node) => selectedIds.has(node.id));
}

function getNodesAbsoluteBounds(
  nodes: CanvasNode[],
  allNodes: CanvasNode[]
) {
  const boxes = nodes
    .map((node) => {
      const position = getNodeAbsolutePosition(node, allNodes);
      const size = readCanvasNodeSize(node);

      if (!size) {
        return null;
      }

      return {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height
      };
    })
    .filter((box): box is { x: number; y: number; width: number; height: number } =>
      Boolean(box)
    );

  if (!boxes.length) {
    return null;
  }

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function getNodeAbsolutePosition(
  node: CanvasNode,
  allNodes: CanvasNode[]
): CanvasNodePosition {
  if (typeof node.parentId !== "string") {
    return node.position;
  }

  const parent = allNodes.find((candidate) => candidate.id === node.parentId);
  if (!parent) {
    return node.position;
  }

  const parentPosition = getNodeAbsolutePosition(parent, allNodes);
  return {
    x: parentPosition.x + node.position.x,
    y: parentPosition.y + node.position.y
  };
}

function findContinuationDraftPosition(input: {
  sourceNode: CanvasNode;
  draftNode: CanvasNode;
  nodes: CanvasNode[];
  requestedPosition?: CanvasNodePosition;
}): CanvasNodePosition {
  const draftSize = readCanvasNodeSize(input.draftNode) ?? {
    width: 320,
    height: 240
  };
  const sourcePosition = getNodeAbsolutePosition(input.sourceNode, input.nodes);
  const sourceSize = readCanvasNodeSize(input.sourceNode) ?? {
    width: 320,
    height: 240
  };
  const gap = 96;
  const rowGap = 72;
  const defaultPosition = {
    x: Math.round(sourcePosition.x + sourceSize.width + gap),
    y: Math.round(
      sourcePosition.y + sourceSize.height / 2 - draftSize.height / 2
    )
  };
  const candidates: CanvasNodePosition[] = [];

  if (input.requestedPosition) {
    candidates.push({
      x: Math.round(input.requestedPosition.x - draftSize.width / 2),
      y: Math.round(input.requestedPosition.y - draftSize.height / 2)
    });
  }

  candidates.push(defaultPosition);

  const columnStep = draftSize.width + gap;
  const rowStep = draftSize.height + rowGap;
  const rowOrder = [0, 1, -1, 2, -2, 3, -3, 4, -4];

  for (let column = 0; column <= 8; column += 1) {
    for (const row of rowOrder) {
      candidates.push({
        x: Math.round(defaultPosition.x + column * columnStep),
        y: Math.round(defaultPosition.y + row * rowStep)
      });
    }
  }

  for (const candidate of candidates) {
    if (
      isCanvasPositionFree(candidate, draftSize, input.nodes, {
        padding: 36
      })
    ) {
      return candidate;
    }
  }

  return findAvailableCanvasPosition(defaultPosition, draftSize, input.nodes);
}

function findAvailableCanvasPosition(
  preferredPosition: CanvasNodePosition,
  size: { width: number; height: number } | null,
  nodes: CanvasNode[],
  options?: {
    excludeIds?: Set<string>;
    padding?: number;
  }
): CanvasNodePosition {
  const nodeSize = size ?? { width: 320, height: 240 };
  const padding = options?.padding ?? 36;
  const stepX = Math.max(nodeSize.width + padding, 260);
  const stepY = Math.max(nodeSize.height + padding, 220);

  for (let ring = 0; ring <= 10; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) {
          continue;
        }

        const candidate = {
          x: Math.round(preferredPosition.x + dx * stepX),
          y: Math.round(preferredPosition.y + dy * stepY)
        };

        if (isCanvasPositionFree(candidate, nodeSize, nodes, {
          excludeIds: options?.excludeIds,
          padding
        })) {
          return candidate;
        }
      }
    }
  }

  return {
    x: Math.round(preferredPosition.x + stepX * 2),
    y: Math.round(preferredPosition.y + stepY * 2)
  };
}

function isCanvasPositionFree(
  position: CanvasNodePosition,
  size: { width: number; height: number },
  nodes: CanvasNode[],
  options: {
    excludeIds?: Set<string>;
    padding: number;
  }
) {
  const candidateRect = {
    x: position.x - options.padding,
    y: position.y - options.padding,
    width: size.width + options.padding * 2,
    height: size.height + options.padding * 2
  };

  return nodes.every((node) => {
    if (node.hidden || options.excludeIds?.has(node.id)) {
      return true;
    }

    const nodeSize = readCanvasNodeSize(node);
    if (!nodeSize) {
      return true;
    }

    const nodePosition = getNodeAbsolutePosition(node, nodes);
    return !rectsOverlap(candidateRect, {
      x: nodePosition.x,
      y: nodePosition.y,
      width: nodeSize.width,
      height: nodeSize.height
    });
  });
}

function rectsOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number }
) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function isAutosaveError(error: string | null, fallbackMessage: string) {
  return (
    error === fallbackMessage ||
    error?.startsWith("Failed to save canvas snapshot:") === true
  );
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
