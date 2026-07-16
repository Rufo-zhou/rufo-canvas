"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from "react";
import {
  Check,
  CircleAlert,
  Clock3,
  Film,
  ImagePlus,
  Images,
  Loader2,
  Maximize2,
  Plus,
  RefreshCw,
  SendHorizontal,
  Settings2,
  Trash2,
  Upload,
  WandSparkles,
  X
} from "lucide-react";
import { ApiSettingsDialog } from "@/components/settings/ApiSettingsDialog";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  usePreferences,
  type RufoLanguage
} from "@/components/settings/PreferencesProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createSignedAssetUrl,
  listProjectAssets,
  listProjectGenerationTasks,
  uploadProjectFile,
  type GeneratedAsset,
  type GenerationTask
} from "@/lib/supabase/database";
import { generateLocalImage } from "@/lib/local/image-generation";
import {
  getGenerationErrorInfo,
  type GenerationErrorInfo
} from "@/lib/media-generation/error-guidance";
import {
  credentialsForProvider,
  hasProviderCredential,
  loadProviderCredentials
} from "@/lib/media-generation/user-credentials";
import {
  imageAspectRatioPresets,
  qualityLabels,
  qualityResolutionLabel,
  resolveMediaDimensions,
  videoAspectRatioPresets
} from "@/lib/media-generation/presets";
import type {
  MediaAspectRatio,
  MediaGenerationProvider,
  MediaModel,
  MediaQuality,
  MediaReferenceFit,
  MediaReferenceMode,
  MediaType,
  ProviderCredentials
} from "@/lib/media-generation/types";
import type {
  CanvasGenerationRequest,
  CanvasGenerationUpdate,
  CanvasReferenceRequest,
  GeneratedCanvasMedia
} from "./types";

export type AgentSidebarProps = {
  projectId: string;
  initialPrompt?: string;
  focusRequest?: number;
  settingsRequest?: number;
  referenceRequest?: CanvasReferenceRequest | null;
  retryRequest?: CanvasGenerationRequest | null;
  onGenerationStart: (request: CanvasGenerationRequest) => void;
  onGenerationUpdate: (
    clientTaskId: string,
    update: CanvasGenerationUpdate
  ) => void;
  onGenerated: (media: GeneratedCanvasMedia, clientTaskId?: string) => void;
  onClose?: () => void;
};

type ModelOption = MediaModel & {
  available: boolean;
};

type MediaGenerationApiResponse = {
  data?: {
    status?: "processing" | "completed";
    asset?: GeneratedCanvasMedia;
    taskId?: string;
    progress?: number;
    pollAfterMs?: number;
  };
  error?: {
    code: string;
    message: string;
    solution?: string;
    provider?: string;
  };
};

type SidebarView = "create" | "history";

type AgentCopy = {
  subtitle: string;
  image: string;
  video: string;
  history: string;
  backToCreate: string;
  apiSettings: string;
  close: string;
  quickSkills: string;
  model: string;
  connected: string;
  needsKey: string;
  apiConnected: string;
  pendingConfig: string;
  connectApi: string;
  prompt: string;
  polish: string;
  seedanceOptimize: string;
  videoPromptTools: string;
  videoPromptToolsHint: string;
  imagePlaceholder: string;
  videoPlaceholder: string;
  aspectRatio: string;
  quality: string;
  duration: string;
  seconds: string;
  audio: string;
  generateAudio: string;
  unsupportedAudio: string;
  supplierQuota: string;
  videoRequiresKeyNote: string;
  referenceMode: string;
  referenceFit: string;
  referenceImages: string;
  addImage: string;
  referenceAssets: string;
  generating: string;
  submitting: string;
  generateImage: string;
  generateVideo: string;
};

const agentCopyByLanguage: Record<RufoLanguage, AgentCopy> = {
  "zh-CN": {
    subtitle: "多供应商创作工作台",
    image: "图片",
    video: "视频",
    history: "生成历史",
    backToCreate: "返回创作",
    apiSettings: "自助接入 API",
    close: "关闭对话",
    quickSkills: "快捷 Skills",
    model: "模型",
    connected: "已接入",
    needsKey: "需 API Key",
    apiConnected: "API 已接入",
    pendingConfig: "待配置",
    connectApi: "接入 API",
    prompt: "画面描述",
    polish: "润色",
    seedanceOptimize: "Seedance 优化",
    videoPromptTools: "视频快捷镜头",
    videoPromptToolsHint: "先点快捷镜头补充动作，再点 Seedance 优化生成完整视频提示词。",
    imagePlaceholder: "描述主体、构图、光线、材质和风格",
    videoPlaceholder: "描述主体、动作、镜头运动、光线和风格",
    aspectRatio: "画面比例",
    quality: "画质",
    duration: "时长",
    seconds: "秒",
    audio: "音频",
    generateAudio: "生成音频",
    unsupportedAudio: "模型不支持",
    supplierQuota: "按供应商额度调用",
    videoRequiresKeyNote: "公开稳定的视频生成接口目前都需要供应商 Key；填写自己的 Key 后即可使用视频模型。",
    referenceMode: "参考模式",
    referenceFit: "比例适配",
    referenceImages: "参考图片",
    addImage: "添加图片",
    referenceAssets: "参考素材",
    generating: "生成中",
    submitting: "正在提交",
    generateImage: "生成图片",
    generateVideo: "生成视频"
  },
  en: {
    subtitle: "Multi-provider creative workspace",
    image: "Image",
    video: "Video",
    history: "Generation history",
    backToCreate: "Back to create",
    apiSettings: "API settings",
    close: "Close panel",
    quickSkills: "Quick skills",
    model: "Model",
    connected: "Connected",
    needsKey: "Needs API key",
    apiConnected: "API connected",
    pendingConfig: "Not configured",
    connectApi: "Connect API",
    prompt: "Prompt",
    polish: "Polish",
    seedanceOptimize: "Seedance optimize",
    videoPromptTools: "Video shortcuts",
    videoPromptToolsHint: "Add a shortcut first, then optimize it into a complete Seedance prompt.",
    imagePlaceholder: "Describe subject, composition, lighting, materials, and style",
    videoPlaceholder: "Describe subject, action, camera movement, lighting, and style",
    aspectRatio: "Aspect ratio",
    quality: "Quality",
    duration: "Duration",
    seconds: "sec",
    audio: "Audio",
    generateAudio: "Generate audio",
    unsupportedAudio: "Not supported",
    supplierQuota: "Uses provider quota",
    videoRequiresKeyNote: "Stable public video-generation APIs currently require a provider key. Add your key to enable video models.",
    referenceMode: "Reference mode",
    referenceFit: "Fit mode",
    referenceImages: "Reference images",
    addImage: "Add image",
    referenceAssets: "References",
    generating: "Generating",
    submitting: "Submitting",
    generateImage: "Generate image",
    generateVideo: "Generate video"
  },
  ja: {
    subtitle: "マルチプロバイダー作成パネル",
    image: "画像",
    video: "動画",
    history: "生成履歴",
    backToCreate: "作成へ戻る",
    apiSettings: "API 設定",
    close: "閉じる",
    quickSkills: "クイックスキル",
    model: "モデル",
    connected: "接続済み",
    needsKey: "API Key 必要",
    apiConnected: "API 接続済み",
    pendingConfig: "未設定",
    connectApi: "API 接続",
    prompt: "プロンプト",
    polish: "改善",
    seedanceOptimize: "Seedance 最適化",
    videoPromptTools: "動画ショートカット",
    videoPromptToolsHint: "先にショートカットを追加し、Seedance 最適化で完成した動画プロンプトにします。",
    imagePlaceholder: "主体、構図、光、素材、スタイルを記述",
    videoPlaceholder: "主体、動き、カメラ、光、スタイルを記述",
    aspectRatio: "比率",
    quality: "品質",
    duration: "時間",
    seconds: "秒",
    audio: "音声",
    generateAudio: "音声生成",
    unsupportedAudio: "非対応",
    supplierQuota: "プロバイダー上限を使用",
    videoRequiresKeyNote: "安定した公開動画生成 API は現在プロバイダー Key が必要です。Key を追加すると動画モデルを使えます。",
    referenceMode: "参照モード",
    referenceFit: "比率調整",
    referenceImages: "参照画像",
    addImage: "画像追加",
    referenceAssets: "参照素材",
    generating: "生成中",
    submitting: "送信中",
    generateImage: "画像生成",
    generateVideo: "動画生成"
  },
  ko: {
    subtitle: "멀티 공급자 창작 패널",
    image: "이미지",
    video: "비디오",
    history: "생성 기록",
    backToCreate: "창작으로",
    apiSettings: "API 설정",
    close: "닫기",
    quickSkills: "빠른 스킬",
    model: "모델",
    connected: "연결됨",
    needsKey: "API Key 필요",
    apiConnected: "API 연결됨",
    pendingConfig: "미설정",
    connectApi: "API 연결",
    prompt: "프롬프트",
    polish: "다듬기",
    seedanceOptimize: "Seedance 최적화",
    videoPromptTools: "비디오 바로가기",
    videoPromptToolsHint: "먼저 바로가기를 추가한 뒤 Seedance 최적화로 완성된 비디오 프롬프트를 만드세요.",
    imagePlaceholder: "대상, 구도, 조명, 재질, 스타일을 설명하세요",
    videoPlaceholder: "대상, 동작, 카메라 움직임, 조명, 스타일을 설명하세요",
    aspectRatio: "비율",
    quality: "품질",
    duration: "시간",
    seconds: "초",
    audio: "오디오",
    generateAudio: "오디오 생성",
    unsupportedAudio: "지원 안 됨",
    supplierQuota: "공급자 한도 사용",
    videoRequiresKeyNote: "안정적인 공개 비디오 생성 API는 현재 공급자 Key가 필요합니다. Key를 추가하면 비디오 모델을 사용할 수 있습니다.",
    referenceMode: "참조 모드",
    referenceFit: "비율 맞춤",
    referenceImages: "참조 이미지",
    addImage: "이미지 추가",
    referenceAssets: "참조 소재",
    generating: "생성 중",
    submitting: "제출 중",
    generateImage: "이미지 생성",
    generateVideo: "비디오 생성"
  }
};

type GenerationHistoryRecord = {
  task: GenerationTask;
  asset?: GeneratedAsset;
  media?: GeneratedCanvasMedia;
  modelId?: string;
  modelLabel?: string;
  mediaType: MediaType;
  progress: number;
  error?: GenerationErrorInfo;
};

type SkillPreset = {
  label: string;
  description: string;
  mediaType: MediaType;
  prompt: string;
  aspectRatio: MediaAspectRatio;
  quality: MediaQuality;
  referenceMode?: MediaReferenceMode;
  preferredModelIds: string[];
};

type VideoPromptBooster = {
  id: string;
  label: string;
  description: string;
  prompt: string;
};

const fallbackModels: ModelOption[] = [
  {
    id: "sana-free",
    provider: "pollinations-free",
    providerModel: "sana",
    label: "Sana Public",
    mediaType: "image",
    freeTier: true,
    requiresKey: false,
    supportsReference: false,
    aspectRatios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "21:9"],
    qualityOptions: ["standard", "high", "ultra"],
    description: "无需密钥的公共图片模型，适合快速文字生图。",
    available: true
  },
  {
    id: "flux-realism-free",
    provider: "pollinations-free",
    providerModel: "flux-realism",
    label: "Flux Realism Public",
    mediaType: "image",
    freeTier: true,
    requiresKey: false,
    supportsReference: false,
    aspectRatios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "21:9"],
    qualityOptions: ["standard", "high", "ultra"],
    description: "无需密钥的公共写实图片模型，适合人物、产品和场景视觉。",
    available: true
  },
  {
    id: "any-dark-free",
    provider: "pollinations-free",
    providerModel: "any-dark",
    label: "Any Dark Public",
    mediaType: "image",
    freeTier: true,
    requiresKey: false,
    supportsReference: false,
    aspectRatios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "21:9"],
    qualityOptions: ["standard", "high", "ultra"],
    description: "无需密钥的公共风格化图片模型，适合暗调、海报和概念氛围图。",
    available: true
  },
  {
    id: "gptimage-free",
    provider: "pollinations-free",
    providerModel: "gptimage",
    label: "GPT Image Public",
    mediaType: "image",
    freeTier: true,
    requiresKey: false,
    supportsReference: false,
    aspectRatios: ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "21:9"],
    qualityOptions: ["standard", "high", "ultra"],
    description: "无需密钥的公共图片模型，适合文字理解更强的通用创作。",
    available: true
  }
];

const skillPresets: SkillPreset[] = [
  {
    label: "电商产品主图",
    description: "适合白底、场景海报、详情图和社媒封面",
    mediaType: "image",
    prompt: "为一款高端消费品生成电商产品主图，主体清晰，背景干净，包含专业布光、真实材质、可商用构图和高转化视觉层次。",
    aspectRatio: "1:1",
    quality: "high",
    preferredModelIds: ["flux-realism-free", "gptimage-free", "sana-free", "gptimage", "nano-banana", "agnes-image-2.0"]
  },
  {
    label: "Logo 设计",
    description: "适合品牌符号、字体标识和应用预览",
    mediaType: "image",
    prompt: "设计一个原创品牌 Logo，要求图形简洁、可识别、适合数字产品和社交头像，输出干净背景、清晰边缘和品牌应用感。",
    aspectRatio: "1:1",
    quality: "high",
    preferredModelIds: ["gptimage-free", "ideogram-v4-turbo", "gptimage", "sana-free"]
  },
  {
    label: "角色设定图",
    description: "适合人物三视图、服装和表情延展",
    mediaType: "image",
    prompt: "创建一个原创写实角色设定图，包含统一身份特征、服装细节、正面半身构图、可继续用于视频生成的一致性描述。",
    aspectRatio: "3:4",
    quality: "high",
    preferredModelIds: ["flux-realism-free", "gptimage-free", "seedream", "nano-banana", "sana-free"]
  },
  {
    label: "电影感运镜",
    description: "适合短片镜头、产品转场和氛围画面",
    mediaType: "video",
    prompt: "生成一段电影感短视频：主体稳定，镜头缓慢推进，柔和侧逆光，浅景深，质感真实，动作自然，适合作为品牌短片片段。",
    aspectRatio: "16:9",
    quality: "high",
    referenceMode: "none",
    preferredModelIds: ["agnes-video-2.0", "seedance-2", "veo", "wan-pro"]
  },
  {
    label: "首尾帧动画",
    description: "适合从参考图延展运动或转场",
    mediaType: "video",
    prompt: "根据首尾帧生成平滑转场视频，保持主体身份一致，镜头运动自然，避免形变和闪烁，画面具有广告级光影质感。",
    aspectRatio: "16:9",
    quality: "high",
    referenceMode: "start-end",
    preferredModelIds: ["agnes-video-2.0", "seedance-2", "wan-pro"]
  },
  {
    label: "社交媒体短片",
    description: "适合竖屏种草、广告和发布预告",
    mediaType: "video",
    prompt: "生成一支竖屏社交媒体短片，节奏紧凑，主体居中，前三秒有吸引力，适合产品发布、生活方式内容和短视频广告。",
    aspectRatio: "9:16",
    quality: "high",
    referenceMode: "none",
    preferredModelIds: ["agnes-video-2.0", "seedance-pro", "wan-fast"]
  }
];

const videoPromptBoostersByLanguage: Record<
  RufoLanguage,
  VideoPromptBooster[]
> = {
  "zh-CN": [
    {
      id: "motivated-push",
      label: "镜头推进",
      description: "从环境推到关键细节",
      prompt:
        "镜头设计：从中景缓慢推进到主体关键细节，推进必须揭示新的信息，最后停在一个可截图的稳定画面。"
    },
    {
      id: "product-arc",
      label: "产品环绕",
      description: "突出材质与卖点",
      prompt:
        "产品运镜：摄像机围绕主体做 20-35 度轻微弧形移动，保持产品几何不变形，光线扫过材质并突出核心卖点。"
    },
    {
      id: "character-action",
      label: "人物动作",
      description: "稳定身份与手部",
      prompt:
        "动作编排：人物只执行一个清晰连续动作，面部身份、手部结构和服装细节保持一致，动作节奏自然且不突然跳变。"
    },
    {
      id: "start-end",
      label: "首尾帧",
      description: "让参考图自然过渡",
      prompt:
        "参考图要求：从起始参考画面的构图和主体身份出发，平滑过渡到目标动作或终止画面，禁止挤压参考图比例。"
    },
    {
      id: "social-hook",
      label: "短视频节奏",
      description: "前三秒建立吸引点",
      prompt:
        "节奏设计：前 1 秒建立视觉钩子，中段完成主体动作或卖点展示，最后 1-2 秒停留在清晰、有记忆点的结束画面。"
    }
  ],
  en: [
    {
      id: "motivated-push",
      label: "Push-in",
      description: "Reveal one key detail",
      prompt:
        "Camera design: start from a medium shot and slowly push toward the subject's key detail; the move must reveal new information and end on a stable frame."
    },
    {
      id: "product-arc",
      label: "Product arc",
      description: "Show material and value",
      prompt:
        "Product camera move: make a subtle 20-35 degree arc around the subject, keep product geometry unchanged, and let light reveal material and the core selling point."
    },
    {
      id: "character-action",
      label: "Character action",
      description: "Keep identity stable",
      prompt:
        "Motion choreography: the character performs one clear continuous action; keep facial identity, hand structure, and wardrobe details consistent without sudden jumps."
    },
    {
      id: "start-end",
      label: "Keyframes",
      description: "Bridge references",
      prompt:
        "Reference requirement: begin from the starting reference composition and subject identity, then transition smoothly to the target action or ending frame without squeezing the reference ratio."
    },
    {
      id: "social-hook",
      label: "Social beat",
      description: "Hook in the first second",
      prompt:
        "Rhythm design: establish a visual hook in the first second, complete the action or value reveal in the middle, then hold a clear memorable final frame for 1-2 seconds."
    }
  ],
  ja: [
    {
      id: "motivated-push",
      label: "プッシュ",
      description: "重要な細部を見せる",
      prompt:
        "カメラ設計：ミディアムショットから主体の重要な細部へゆっくり近づき、新しい情報を見せて、最後は安定したフレームで止める。"
    },
    {
      id: "product-arc",
      label: "商品アーク",
      description: "素材と訴求点を強調",
      prompt:
        "商品カメラ：主体の周囲を 20-35 度だけ緩やかに回り、商品の形状を変形させず、光で素材と主要な訴求点を見せる。"
    },
    {
      id: "character-action",
      label: "人物動作",
      description: "同一性を安定",
      prompt:
        "動作設計：人物は一つの明確で連続した動作だけを行い、顔の同一性、手の構造、衣装の細部を安定させ、急なジャンプを避ける。"
    },
    {
      id: "start-end",
      label: "キーフレーム",
      description: "参照を自然につなぐ",
      prompt:
        "参照要件：開始参照の構図と主体の同一性から始め、目標動作または終了フレームへ滑らかに移行し、参照比率を押しつぶさない。"
    },
    {
      id: "social-hook",
      label: "SNS リズム",
      description: "最初の1秒で引き込む",
      prompt:
        "リズム設計：最初の1秒で視覚的なフックを作り、中盤で動作または価値を見せ、最後の1-2秒は記憶に残る明瞭な終了画面で止める。"
    }
  ],
  ko: [
    {
      id: "motivated-push",
      label: "푸시인",
      description: "핵심 디테일 공개",
      prompt:
        "카메라 설계: 미디엄 샷에서 시작해 대상의 핵심 디테일로 천천히 다가가며, 움직임은 새로운 정보를 드러내고 마지막에는 안정적인 프레임에 멈춘다."
    },
    {
      id: "product-arc",
      label: "제품 아크",
      description: "재질과 장점 강조",
      prompt:
        "제품 카메라: 대상 주변을 20-35도 정도 부드럽게 아크 이동하며 제품 형태를 왜곡하지 않고, 빛이 재질과 핵심 장점을 드러내게 한다."
    },
    {
      id: "character-action",
      label: "인물 동작",
      description: "정체성 안정",
      prompt:
        "동작 설계: 인물은 하나의 명확하고 연속적인 동작만 수행하며, 얼굴 정체성, 손 구조, 의상 디테일을 유지하고 갑작스러운 점프를 피한다."
    },
    {
      id: "start-end",
      label: "키프레임",
      description: "참조 자연 연결",
      prompt:
        "참조 요구: 시작 참조의 구도와 대상 정체성에서 출발해 목표 동작 또는 종료 프레임으로 부드럽게 전환하며 참조 비율을 찌그러뜨리지 않는다."
    },
    {
      id: "social-hook",
      label: "숏폼 리듬",
      description: "첫 1초 후킹",
      prompt:
        "리듬 설계: 첫 1초에 시각적 훅을 만들고, 중간에는 동작 또는 가치 포인트를 보여주며, 마지막 1-2초는 선명하고 기억에 남는 종료 프레임으로 유지한다."
    }
  ]
};


export function AgentSidebar({
  projectId,
  initialPrompt,
  focusRequest = 0,
  settingsRequest = 0,
  referenceRequest,
  retryRequest,
  onGenerationStart,
  onGenerationUpdate,
  onGenerated,
  onClose
}: AgentSidebarProps) {
  const { mode: appMode, user, getAccessToken } = useAuth();
  const { language } = usePreferences();
  const copy = agentCopyByLanguage[language];
  const videoPromptBoosters = videoPromptBoostersByLanguage[language];
  const supabase = useMemo(
    () => (appMode === "supabase" ? getSupabaseBrowserClient() : null),
    [appMode]
  );
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const handledReferenceRequestRef = useRef<string | null>(null);
  const handledRetryRequestRef = useRef<string | null>(null);
  const [view, setView] = useState<SidebarView>("create");
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [models, setModels] = useState<ModelOption[]>(fallbackModels);
  const [modelId, setModelId] = useState("sana-free");
  const [referenceMode, setReferenceMode] =
    useState<MediaReferenceMode>("none");
  const [referenceFit, setReferenceFit] =
    useState<MediaReferenceFit>("outpaint");
  const [canvasReferences, setCanvasReferences] = useState<
    CanvasReferenceRequest[]
  >([]);
  const [draftNodeId, setDraftNodeId] = useState<string | undefined>();
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<MediaAspectRatio>("1:1");
  const [quality, setQuality] = useState<MediaQuality>("standard");
  const [durationSeconds, setDurationSeconds] = useState(5);
  const [audio, setAudio] = useState(false);
  const [providerCredentials, setProviderCredentials] =
    useState<ProviderCredentials>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<number | null>(
    null
  );
  const [polishingPrompt, setPolishingPrompt] = useState(false);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSolution, setErrorSolution] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<
    GenerationHistoryRecord[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  const effectiveModels = useMemo(
    () =>
      models.map((model) => ({
        ...model,
        available:
          model.available ||
          hasProviderCredential(model.provider, providerCredentials)
      })),
    [models, providerCredentials]
  );
  const visibleModels = effectiveModels.filter(
    (model) => model.mediaType === mediaType
  );
  const selectedModel =
    effectiveModels.find((model) => model.id === modelId) ?? visibleModels[0];
  const aspectRatioPresets =
    mediaType === "image" ? imageAspectRatioPresets : videoAspectRatioPresets;
  const referenceModes: MediaReferenceMode[] = selectedModel?.supportsReference
    ? ["none", ...(selectedModel.referenceModes ?? [])]
    : ["none"];
  const maxReferenceImages = referenceModeLimit(
    referenceMode,
    selectedModel?.maxReferenceImages ?? 0
  );
  const referenceCount = canvasReferences.length + referenceFiles.length;
  const durationOptions = getDurationOptions(selectedModel, quality);
  const videoModelsRequireKey =
    mediaType === "video" &&
    visibleModels.length > 0 &&
    visibleModels.every((model) => !model.available);
  const promptPolishLabel =
    mediaType === "video" ? copy.seedanceOptimize : copy.polish;

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (focusRequest > 0) {
      setView("create");
      promptRef.current?.focus();
    }
  }, [focusRequest]);

  useEffect(() => {
    if (settingsRequest > 0) {
      setView("create");
      setSettingsOpen(true);
    }
  }, [settingsRequest]);

  useEffect(() => {
    setProviderCredentials(loadProviderCredentials().credentials);
  }, []);

  useEffect(() => {
    fetch("/api/media-generation")
      .then((response) => response.json())
      .then((payload: { data?: ModelOption[] }) => {
        if (payload.data?.length) {
          setModels(payload.data);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const firstAvailable =
      visibleModels.find((model) => model.available) ?? visibleModels[0];

    if (firstAvailable && !visibleModels.some((model) => model.id === modelId)) {
      setModelId(firstAvailable.id);
    }
  }, [mediaType, modelId, visibleModels]);

  useEffect(() => {
    if (!selectedModel) {
      return;
    }

    if (!selectedModel.aspectRatios.includes(aspectRatio)) {
      setAspectRatio(selectedModel.aspectRatios[0]);
    }
    if (!selectedModel.qualityOptions.includes(quality)) {
      setQuality(selectedModel.qualityOptions[0]);
    }
    if (
      selectedModel.mediaType === "video" &&
      durationOptions.length &&
      !durationOptions.includes(durationSeconds)
    ) {
      setDurationSeconds(durationOptions[0]);
    }
    if (!selectedModel.supportsAudio) {
      setAudio(false);
    }
    if (
      referenceMode !== "none" &&
      !selectedModel.referenceModes?.includes(referenceMode)
    ) {
      setReferenceMode("none");
      setReferenceFiles([]);
      setCanvasReferences([]);
    }
  }, [
    aspectRatio,
    durationOptions,
    durationSeconds,
    quality,
    referenceMode,
    selectedModel
  ]);

  useEffect(() => {
    if (
      !referenceRequest ||
      handledReferenceRequestRef.current === referenceRequest.requestId
    ) {
      return;
    }

    const requestMediaType = referenceRequest.mediaType ?? mediaType;
    const requestAspectRatio = referenceRequest.aspectRatio;
    const preferredMode: MediaReferenceMode =
      requestMediaType === "video" ? "start-frame" : "image";
    const targetModel =
      effectiveModels.find(
        (model) =>
          model.mediaType === requestMediaType &&
          model.available &&
          model.referenceModes?.includes(preferredMode) &&
          (!requestAspectRatio || model.aspectRatios.includes(requestAspectRatio))
      ) ??
      effectiveModels.find(
        (model) =>
          model.mediaType === requestMediaType &&
          model.referenceModes?.includes(preferredMode) &&
          (!requestAspectRatio || model.aspectRatios.includes(requestAspectRatio))
      ) ??
      effectiveModels.find(
        (model) =>
          model.mediaType === requestMediaType &&
          model.available &&
          model.referenceModes?.includes(preferredMode)
      ) ??
      effectiveModels.find(
        (model) =>
          model.mediaType === requestMediaType &&
          model.referenceModes?.includes(preferredMode)
      );

    if (!targetModel) {
      setError("当前媒体类型没有可接收参考素材的模型。");
      return;
    }

    handledReferenceRequestRef.current = referenceRequest.requestId;
    setMediaType(requestMediaType);
    setModelId(targetModel.id);
    if (requestAspectRatio) {
      setAspectRatio(requestAspectRatio);
    }
    setReferenceMode(preferredMode);
    setCanvasReferences([referenceRequest]);
    setDraftNodeId(referenceRequest.draftNodeId);
    setReferenceFiles([]);
    setError(null);
    setErrorSolution(null);
    setView("create");
  }, [effectiveModels, mediaType, referenceRequest]);

  useEffect(() => {
    if (
      !retryRequest ||
      handledRetryRequestRef.current === retryRequest.clientTaskId
    ) {
      return;
    }

    handledRetryRequestRef.current = retryRequest.clientTaskId;
    setMediaType(retryRequest.mediaType);
    setModelId(retryRequest.modelId);
    setPrompt(retryRequest.prompt);
    setAspectRatio(retryRequest.aspectRatio);
    setQuality(retryRequest.quality);
    setDurationSeconds(retryRequest.durationSeconds ?? 5);
    setError(null);
    setErrorSolution(null);
    setView("create");
    window.setTimeout(() => promptRef.current?.focus(), 0);
  }, [retryRequest]);

  useEffect(() => {
    if (view !== "history" || appMode === "demo") {
      return;
    }

    let mounted = true;
    setHistoryLoading(true);

    void loadGenerationHistory(requireSupabase(supabase), projectId)
      .then((records) => {
        if (mounted) {
          setHistoryRecords(records);
        }
      })
      .catch((caughtError) => {
        if (mounted) {
          const info = getGenerationErrorInfo({
            message:
              caughtError instanceof Error
                ? caughtError.message
                : "生成历史加载失败。"
          });
          setError(info.message);
          setErrorSolution(info.solution);
        }
      })
      .finally(() => {
        if (mounted) {
          setHistoryLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [appMode, historyVersion, projectId, supabase, view]);

  useEffect(() => {
    const nextPreviewUrls = referenceFiles.map((file) =>
      URL.createObjectURL(file)
    );
    setPreviewUrls(nextPreviewUrls);
    return () => nextPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [referenceFiles]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError(`请输入${mediaType === "video" ? "视频" : "图片"}描述。`);
      return;
    }

    if (!selectedModel) {
      setError("请选择模型。");
      return;
    }

    if (!selectedModel.available && appMode !== "demo") {
      setError("该模型尚未接入 API Key，暂时不能提交生成。");
      setErrorSolution(
        `请点击“自助接入 API”填写 ${providerDisplayName(selectedModel.provider)} Key，或等待站点管理员配置服务器 Key。`
      );
      setSettingsOpen(true);
      return;
    }

    const minimumReferences = referenceModeMinimum(referenceMode);
    if (referenceCount < minimumReferences) {
      setError(`当前参考模式至少需要 ${minimumReferences} 张图片。`);
      return;
    }

    const clientTaskId = crypto.randomUUID();
    const generationRequest: CanvasGenerationRequest = {
      clientTaskId,
      draftNodeId,
      prompt: trimmedPrompt,
      provider: selectedModel.provider,
      modelId: selectedModel.id,
      modelLabel: selectedModel.label,
      mediaType,
      aspectRatio,
      quality,
      durationSeconds: mediaType === "video" ? durationSeconds : undefined,
      createdAt: new Date().toISOString()
    };
    onGenerationStart(generationRequest);
    setSubmitting(true);
    setGenerationProgress(3);
    setError(null);
    setErrorSolution(null);
    let estimatedProgress = 3;
    const progressTimer = window.setInterval(() => {
      estimatedProgress = Math.min(estimatedProgress + 2, 86);
      setGenerationProgress(estimatedProgress);
      onGenerationUpdate(clientTaskId, {
        status: "processing",
        progress: estimatedProgress,
        statusLabel: "模型正在生成"
      });
    }, 1800);

    try {
      if (appMode === "demo") {
        if (mediaType === "video") {
          throw new Error("本地演示模式暂不生成视频，请切换到 Supabase 模式。");
        }

        const dimensions = resolveMediaDimensions("image", aspectRatio, quality);
        const generated = await generateLocalImage(
          trimmedPrompt,
          selectedModel.providerModel,
          dimensions,
          referenceFiles[0]
        );
        onGenerationUpdate(clientTaskId, {
          status: "completed",
          progress: 100,
          statusLabel: "生成完成"
        });
        onGenerated(
          {
            ...generated,
            aspectRatio,
            quality,
            width: dimensions.width,
            height: dimensions.height
          },
          clientTaskId
        );
        setReferenceFiles([]);
        setCanvasReferences([]);
        setDraftNodeId(undefined);
        setHistoryVersion((current) => current + 1);
        return;
      }

      const uploadedReferencePaths = await Promise.all(
        referenceFiles.map(async (file) => {
          const uploaded = await uploadProjectFile(requireSupabase(supabase), {
            userId: user.id,
            projectId,
            file,
            filename: file.name,
            folder: "references",
            contentType: file.type
          });
          return uploaded.path;
        })
      );
      const referenceImagePaths = [
        ...canvasReferences.map((reference) => reference.storagePath),
        ...uploadedReferencePaths
      ];

      const { width, height } = resolveMediaDimensions(
        mediaType,
        aspectRatio,
        quality
      );
      const token = await getAccessToken();
      const providerCredential = credentialsForProvider(
        selectedModel.provider,
        providerCredentials
      );
      let serverTaskId: string | undefined;
      const response = await fetch("/api/media-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          modelId: selectedModel.id,
          prompt: trimmedPrompt,
          referenceImagePaths,
          referenceMode,
          referenceFit,
          width,
          height,
          aspectRatio,
          quality,
          durationSeconds: mediaType === "video" ? durationSeconds : undefined,
          audio: mediaType === "video" ? audio : undefined,
          providerCredentials: providerCredential
        })
      });
      let payload = (await response.json()) as MediaGenerationApiResponse;
      serverTaskId = payload.data?.taskId;

      if (!response.ok) {
        throw generationUiError(payload.error);
      }

      if (payload.data?.status === "processing" && payload.data.taskId) {
        serverTaskId = payload.data.taskId;
        onGenerationUpdate(clientTaskId, {
          status: "processing",
          taskId: serverTaskId,
          progress: payload.data.progress ?? estimatedProgress,
          statusLabel: "供应商正在处理"
        });
        payload = await pollGenerationTask({
          taskId: payload.data.taskId,
          providerCredentials: providerCredential,
          getAccessToken,
          onProgress: (progress) => {
            estimatedProgress = Math.max(estimatedProgress, progress);
            setGenerationProgress(estimatedProgress);
            onGenerationUpdate(clientTaskId, {
              status: "processing",
              taskId: serverTaskId,
              progress: estimatedProgress,
              statusLabel: "供应商正在处理"
            });
          },
          initialDelayMs: payload.data.pollAfterMs
        });
      }

      if (!payload.data?.asset) {
        throw new Error(payload.error?.message ?? "媒体生成结果不完整。");
      }

      onGenerationUpdate(clientTaskId, {
        status: "completed",
        taskId: serverTaskId,
        progress: 100,
        statusLabel: "生成完成"
      });
      onGenerated(
        {
          ...payload.data.asset,
          aspectRatio: payload.data.asset.aspectRatio ?? aspectRatio,
          quality: payload.data.asset.quality ?? quality,
          width: payload.data.asset.width ?? width,
          height: payload.data.asset.height ?? height
        },
        clientTaskId
      );
      setReferenceFiles([]);
      setCanvasReferences([]);
      setDraftNodeId(undefined);
      setHistoryVersion((current) => current + 1);
    } catch (caughtError) {
      const info =
        caughtError instanceof GenerationUiError
          ? caughtError.info
          : getGenerationErrorInfo({
              code:
                caughtError instanceof TypeError
                  ? "PROVIDER_NETWORK_ERROR"
                  : "GENERATION_FAILED",
              message:
                caughtError instanceof Error
                  ? caughtError.message
                  : "媒体生成失败。",
              provider: selectedModel.provider
            });
      setError(info.message);
      setErrorSolution(info.solution);
      onGenerationUpdate(clientTaskId, {
        status: "failed",
        progress: estimatedProgress,
        errorCode: info.code,
        errorMessage: info.message,
        errorSolution: info.solution,
        statusLabel: "生成失败"
      });
      setHistoryVersion((current) => current + 1);
    } finally {
      window.clearInterval(progressTimer);
      setSubmitting(false);
      setGenerationProgress(null);
    }
  }

  async function handlePolishPrompt() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError("请先输入需要润色的提示词。");
      setErrorSolution(null);
      promptRef.current?.focus();
      return;
    }

    setPolishingPrompt(true);
    setError(null);
    setErrorSolution(null);

    try {
      const response = await fetch("/api/prompt-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          mediaType,
          aspectRatio,
          quality,
          modelId: selectedModel?.id,
          modelLabel: selectedModel?.label,
          referenceMode,
          referenceFit,
          durationSeconds: mediaType === "video" ? durationSeconds : undefined,
          audio: mediaType === "video" ? audio : undefined,
          optimizationMode: mediaType === "video" ? "seedance-video" : "general"
        })
      });
      const payload = (await response.json()) as {
        data?: { prompt?: string };
        error?: { message?: string };
      };

      if (!response.ok || !payload.data?.prompt) {
        throw new Error(payload.error?.message ?? "提示词润色失败。");
      }

      setPrompt(payload.data.prompt);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "提示词润色失败。";
      setError(message);
      setErrorSolution("请稍后重试，或先手动补充主体、场景、光线、风格和构图要求。");
    } finally {
      setPolishingPrompt(false);
    }
  }

  function applyVideoPromptBooster(booster: VideoPromptBooster) {
    setPrompt((current) => {
      const trimmedCurrent = current.trim();

      if (!trimmedCurrent) {
        return booster.prompt;
      }

      if (trimmedCurrent.includes(booster.prompt)) {
        return current;
      }

      return `${trimmedCurrent}\n\n${booster.prompt}`;
    });
    setError(null);
    setErrorSolution(null);
    window.setTimeout(() => promptRef.current?.focus(), 0);
  }

  function changeMediaType(nextType: MediaType) {
    setMediaType(nextType);
    setReferenceMode("none");
    setReferenceFiles([]);
    setCanvasReferences([]);
    setDraftNodeId(undefined);
    setAspectRatio(nextType === "video" ? "16:9" : "1:1");
    setQuality("standard");
    setAudio(false);
    setError(null);
    const nextModel =
      effectiveModels.find(
        (model) => model.mediaType === nextType && model.available
      ) ??
      effectiveModels.find((model) => model.mediaType === nextType);
    if (nextModel) {
      setModelId(nextModel.id);
    }
  }

  function applySkillPreset(preset: SkillPreset) {
    const targetModel =
      effectiveModels.find(
        (model) =>
          model.mediaType === preset.mediaType &&
          preset.preferredModelIds.includes(model.id) &&
          model.available
      ) ??
      effectiveModels.find(
        (model) =>
          model.mediaType === preset.mediaType &&
          preset.preferredModelIds.includes(model.id)
      ) ??
      effectiveModels.find(
        (model) => model.mediaType === preset.mediaType && model.available
      ) ??
      effectiveModels.find((model) => model.mediaType === preset.mediaType);

    setMediaType(preset.mediaType);
    if (targetModel) {
      setModelId(targetModel.id);
    }
    setPrompt(preset.prompt);
    setAspectRatio(preset.aspectRatio);
    setQuality(preset.quality);
    setReferenceMode(preset.referenceMode ?? "none");
    setReferenceFit("outpaint");
    setError(null);
    setErrorSolution(null);
    setView("create");
    window.setTimeout(() => promptRef.current?.focus(), 0);
  }

  return (
    <aside className="flex min-h-0 w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-50 max-lg:w-[min(380px,100vw)] max-lg:shadow-2xl">
      <header className="flex h-12 items-center justify-between border-b border-slate-100 px-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Rufo Agent</h2>
          <p className="text-[10px] text-slate-400">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={view === "history" ? copy.backToCreate : copy.history}
            aria-label={view === "history" ? copy.backToCreate : copy.history}
            onClick={() =>
              setView((current) => (current === "history" ? "create" : "history"))
            }
            className={
              view === "history"
                ? "rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white"
                : "rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            }
          >
            <Clock3 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title={copy.apiSettings}
            aria-label={copy.apiSettings}
            onClick={() => setSettingsOpen(true)}
            className="rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" title={copy.close} aria-label={copy.close} onClick={onClose} className="rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {view === "create" ? (
      <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => changeMediaType("image")}
            className={mediaType === "image" ? "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white text-xs font-semibold text-slate-900 shadow-sm" : "inline-flex h-11 items-center justify-center gap-2 text-xs text-slate-500"}
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {copy.image}
          </button>
          <button
            type="button"
            onClick={() => changeMediaType("video")}
            className={mediaType === "video" ? "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white text-xs font-semibold text-slate-900 shadow-sm" : "inline-flex h-11 items-center justify-center gap-2 text-xs text-slate-500"}
          >
            <Film className="h-4 w-4" aria-hidden="true" />
            {copy.video}
          </button>
        </div>

        <h3 className="mb-2 text-xs font-semibold text-slate-700">{copy.quickSkills}</h3>
        <div className="mb-5 grid gap-2">
          {skillPresets
            .filter((preset) => preset.mediaType === mediaType)
            .slice(0, 3)
            .map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applySkillPreset(preset)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
            >
              <span className="block font-semibold">{preset.label}</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">
                {preset.description}
              </span>
            </button>
          ))}
        </div>

        <form id="rufo-generation-form" onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{copy.model}</span>
            <select
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-900"
            >
              {visibleModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} · {model.available ? copy.connected : copy.needsKey}
                </option>
              ))}
            </select>
            {selectedModel ? (
              <div className="mt-2 flex items-start justify-between gap-2">
                <p className="text-xs leading-5 text-slate-500">{selectedModel.description}</p>
                <span className={selectedModel.available ? "shrink-0 rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700" : "shrink-0 rounded bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"}>
                  {selectedModel.available ? copy.apiConnected : copy.pendingConfig}
                </span>
              </div>
            ) : null}
            {selectedModel?.provider === "pollinations" ? (
              <p className="mt-1 text-[10px] leading-4 text-amber-700">
                Pollinations 模型会消耗 Pollen；API Key 已接入不代表账户有可用余额。
              </p>
            ) : null}
            {videoModelsRequireKey && appMode !== "demo" ? (
              <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600">
                {copy.videoRequiresKeyNote}
              </p>
            ) : null}
            {selectedModel && !selectedModel.available && appMode !== "demo" ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span>该模型需要接入 {providerDisplayName(selectedModel.provider)} Key 后才能生成。</span>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="shrink-0 rounded bg-white px-2 py-1 font-semibold text-amber-800 shadow-sm hover:bg-amber-100"
                >
                  {copy.connectApi}
                </button>
              </div>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">{copy.prompt}</span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  title="放大编辑提示词"
                  aria-label="放大编辑提示词"
                  onClick={() => setPromptEditorOpen(true)}
                  className="inline-flex h-11 min-w-16 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  放大
                </button>
                <button
                  type="button"
                  title={promptPolishLabel}
                  aria-label={promptPolishLabel}
                  onClick={handlePolishPrompt}
                  disabled={polishingPrompt}
                  className="inline-flex h-11 min-w-16 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {polishingPrompt ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {promptPolishLabel}
                </button>
              </span>
            </span>
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="h-32 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900"
              placeholder={mediaType === "video" ? copy.videoPlaceholder : copy.imagePlaceholder}
            />
          </label>

          {mediaType === "video" ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {copy.videoPromptTools}
                </span>
                <span className="rounded bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
                  Seedance 2.0
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {videoPromptBoosters.map((booster) => (
                  <button
                    key={booster.id}
                    type="button"
                    title={booster.description}
                    onClick={() => applyVideoPromptBooster(booster)}
                    className="min-h-14 rounded-md border border-slate-200 bg-white px-2 py-2 text-left hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span className="block text-xs font-semibold text-slate-800">
                      {booster.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">
                      {booster.description}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                {copy.videoPromptToolsHint}
              </p>
            </div>
          ) : null}

          <div>
            <span className="mb-2 block text-xs font-medium text-slate-600">{copy.aspectRatio}</span>
            <div className="grid grid-cols-4 gap-2">
              {aspectRatioPresets
                .filter((preset) => selectedModel?.aspectRatios.includes(preset.value))
                .map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setAspectRatio(preset.value)}
                    title={preset.label}
                    className={
                      aspectRatio === preset.value
                        ? "flex h-14 flex-col items-center justify-center gap-1 rounded-md border border-slate-900 bg-slate-950 text-white"
                        : "flex h-14 flex-col items-center justify-center gap-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                    }
                  >
                    <span
                      className="block border border-current"
                      style={ratioSwatchStyle(preset.value)}
                    />
                    <span className="text-[10px] font-semibold">{preset.value}</span>
                  </button>
                ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium text-slate-600">{copy.quality}</span>
            <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1">
              {(["standard", "high", "ultra"] as const).map((option) => {
                const supported = selectedModel?.qualityOptions.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={!supported}
                    onClick={() => setQuality(option)}
                    className={
                      quality === option && supported
                        ? "h-11 rounded-md bg-white text-slate-900 shadow-sm"
                        : "h-11 rounded-md text-slate-500 disabled:cursor-not-allowed disabled:opacity-30"
                    }
                  >
                    <span className="block text-xs font-semibold">{qualityLabels[option]}</span>
                    <span className="block text-[10px]">{qualityResolutionLabel(mediaType, option)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {mediaType === "video" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">{copy.duration}</span>
                <select
                  value={durationSeconds}
                  onChange={(event) => setDurationSeconds(Number(event.target.value))}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  {durationOptions.map((seconds) => (
                    <option key={seconds} value={seconds}>{seconds} {copy.seconds}</option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-1 block text-xs font-medium text-slate-600">{copy.audio}</span>
                <button
                  type="button"
                  disabled={!selectedModel?.supportsAudio}
                  onClick={() => setAudio((current) => !current)}
                  className={
                    audio
                      ? "flex h-11 w-full items-center justify-between rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white"
                      : "flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 disabled:opacity-40"
                  }
                >
                  <span>{selectedModel?.supportsAudio ? copy.generateAudio : copy.unsupportedAudio}</span>
                  <span className={audio ? "h-4 w-7 rounded-full bg-white/25 p-0.5" : "h-4 w-7 rounded-full bg-slate-200 p-0.5"}>
                    <span className={audio ? "block h-3 w-3 translate-x-3 rounded-full bg-white" : "block h-3 w-3 rounded-full bg-white"} />
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-11 items-center justify-between rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
              <span>{copy.supplierQuota}</span>
              <span>{resolveMediaDimensions("image", aspectRatio, quality).width} × {resolveMediaDimensions("image", aspectRatio, quality).height}</span>
            </div>
          )}

          {selectedModel?.supportsReference ? (
            <div>
              <span className="mb-2 block text-xs font-medium text-slate-600">
                {copy.referenceMode}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {referenceModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setReferenceMode(mode);
                      setReferenceFiles([]);
                      setCanvasReferences([]);
                      setError(null);
                    }}
                    className={
                      referenceMode === mode
                        ? "h-11 rounded-md bg-slate-950 px-3 text-xs font-semibold text-white"
                        : "h-11 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:border-slate-400"
                    }
                  >
                    {referenceModeLabel(mode)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {referenceMode !== "none" ? (
            <div className="space-y-2">
              <div>
                <span className="mb-2 block text-xs font-medium text-slate-600">
                  {copy.referenceFit}
                </span>
                <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1">
                  {(["outpaint", "crop", "contain"] as const).map((fit) => (
                    <button
                      key={fit}
                      type="button"
                      onClick={() => setReferenceFit(fit)}
                      className={
                        referenceFit === fit
                          ? "h-11 rounded-md bg-white text-xs font-semibold text-slate-900 shadow-sm"
                          : "h-11 rounded-md text-xs font-medium text-slate-500"
                      }
                    >
                      {referenceFitLabel(fit)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  {copy.referenceImages}
                </span>
                <span className="text-[10px] text-slate-400">
                  {referenceCount}/{maxReferenceImages}
                </span>
              </div>
              <input
                ref={referenceInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple={maxReferenceImages > 1}
                className="sr-only"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  const oversized = files.find(
                    (file) => file.size > 20 * 1024 * 1024
                  );
                  if (oversized) {
                    setError("单张参考图不能超过 20MB。");
                    return;
                  }
                  setReferenceFiles((current) =>
                    [...current, ...files].slice(
                      0,
                      Math.max(maxReferenceImages - canvasReferences.length, 0)
                    )
                  );
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                {canvasReferences.map((reference, index) => (
                  <div
                    key={reference.requestId}
                    className="relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={reference.assetUrl}
                      alt={referenceSlotLabel(referenceMode, index)}
                      className="h-full w-full object-contain"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-medium text-white">
                      {referenceSlotLabel(referenceMode, index)}
                    </span>
                    <button
                      type="button"
                      title="移除参考图"
                      aria-label="移除参考图"
                      onClick={() =>
                        setCanvasReferences((current) =>
                          current.filter(
                            (candidate) =>
                              candidate.requestId !== reference.requestId
                          )
                        )
                      }
                      className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded bg-white/90 text-slate-600 shadow-sm hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {previewUrls.map((url, index) => (
                  <div
                    key={`${referenceFiles[index]?.name}-${index}`}
                    className="relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={referenceSlotLabel(
                        referenceMode,
                        canvasReferences.length + index
                      )}
                      className="h-full w-full object-contain"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-medium text-white">
                      {referenceSlotLabel(
                        referenceMode,
                        canvasReferences.length + index
                      )}
                    </span>
                    <button
                      type="button"
                      title="移除参考图"
                      aria-label="移除参考图"
                      onClick={() =>
                        setReferenceFiles((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index)
                        )
                      }
                      className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded bg-white/90 text-slate-600 shadow-sm hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {referenceCount < maxReferenceImages ? (
                  <button
                    type="button"
                    aria-label={copy.addImage}
                    onClick={() => referenceInputRef.current?.click()}
                    className="flex aspect-video items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-500 hover:border-slate-500 hover:text-slate-700"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {copy.addImage}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
              <p className="font-semibold">{error}</p>
              {errorSolution ? (
                <p className="mt-1 text-red-600">解决办法：{errorSolution}</p>
              ) : null}
            </div>
          ) : null}
        </form>
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label={copy.referenceAssets}
            disabled={referenceMode === "none"}
            onClick={() => referenceInputRef.current?.click()}
            className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {referenceMode === "multi-image" ||
            referenceMode === "keyframes" ||
            referenceMode === "start-end" ? (
              <Images className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {copy.referenceAssets}
          </button>
          <button
            form="rufo-generation-form"
            type="submit"
            aria-label={mediaType === "video" ? copy.generateVideo : copy.generateImage}
            disabled={submitting}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <SendHorizontal className="h-4 w-4" aria-hidden="true" />}
            {submitting
              ? generationProgress !== null
                ? `${copy.generating} ${Math.round(generationProgress)}%`
                : copy.submitting
              : mediaType === "video" ? copy.generateVideo : copy.generateImage}
          </button>
        </div>
      </div>
      </>
      ) : (
        <GenerationHistoryView
          records={historyRecords}
          loading={historyLoading}
          onRefresh={() => setHistoryVersion((current) => current + 1)}
          onAddToCanvas={(media) => onGenerated(media)}
          onRetry={(record) => {
            applyHistoryRecord(record, {
              setView,
              setMediaType,
              setModelId,
              setPrompt,
              setAspectRatio,
              setQuality,
              setDurationSeconds,
              setError,
              setErrorSolution
            });
          }}
        />
      )}

      <ApiSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChange={setProviderCredentials}
      />
      {promptEditorOpen ? (
        <PromptEditorDialog
          value={prompt}
          placeholder={mediaType === "video" ? copy.videoPlaceholder : copy.imagePlaceholder}
          onChange={setPrompt}
          onClose={() => {
            setPromptEditorOpen(false);
            window.setTimeout(() => promptRef.current?.focus(), 0);
          }}
        />
      ) : null}
    </aside>
  );
}

function PromptEditorDialog({
  value,
  placeholder,
  onChange,
  onClose
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="flex max-h-[min(760px,calc(100vh-32px))] w-[min(860px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex h-12 items-center justify-between border-b border-slate-100 px-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">画面描述</h3>
            <p className="text-[10px] text-slate-400">适合编辑长提示词，不会占满整个屏幕</p>
          </div>
          <button
            type="button"
            title="关闭"
            aria-label="关闭"
            onClick={onClose}
            className="rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 p-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-[min(56vh,460px)] w-full resize-none rounded-lg border border-slate-200 p-4 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900"
          />
        </div>
        <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <span className="text-xs text-slate-400">{value.trim().length} 字符</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            套用并关闭
          </button>
        </footer>
      </section>
    </div>
  );
}

function GenerationHistoryView({
  records,
  loading,
  onRefresh,
  onAddToCanvas,
  onRetry
}: {
  records: GenerationHistoryRecord[];
  loading: boolean;
  onRefresh: () => void;
  onAddToCanvas: (media: GeneratedCanvasMedia) => void;
  onRetry: (record: GenerationHistoryRecord) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">生成历史</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            查看任务进度、失败原因并把结果重新放回画布
          </p>
        </div>
        <button
          type="button"
          title="刷新历史"
          aria-label="刷新历史"
          onClick={onRefresh}
          className="rufo-canvas-icon-button flex h-11 w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        >
          <RefreshCw
            className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            aria-hidden="true"
          />
        </button>
      </div>

      {loading && records.length === 0 ? (
        <div className="flex h-36 items-center justify-center text-xs text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          正在加载历史
        </div>
      ) : records.length ? (
        <div className="space-y-3">
          {records.map((record) => (
            <article
              key={record.task.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              {record.media?.assetUrl ? (
                <div className="aspect-video bg-slate-100">
                  {record.media.mediaType === "video" ? (
                    <video
                      src={record.media.assetUrl}
                      className="h-full w-full object-contain"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={record.media.assetUrl}
                      alt={record.task.prompt}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
              ) : null}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {record.modelLabel ?? record.modelId ?? record.task.provider}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                      {record.task.prompt}
                    </p>
                  </div>
                  <HistoryStatus status={record.task.status} />
                </div>

                {record.task.status === "processing" ||
                record.task.status === "pending" ? (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                      <span>生成中</span>
                      <span>{Math.round(record.progress)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${record.progress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {record.error ? (
                  <div className="mt-3 rounded-md bg-red-50 p-2">
                    <p className="text-[11px] font-semibold text-red-700">
                      {record.error.message}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-red-600">
                      解决办法：{record.error.solution}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <time className="text-[10px] text-slate-400">
                    {formatHistoryTime(record.task.created_at)}
                  </time>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRetry(record)}
                      className="inline-flex h-11 items-center gap-1 rounded-md border border-slate-200 px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      再次生成
                    </button>
                    {record.media ? (
                      <button
                        type="button"
                        onClick={() => onAddToCanvas(record.media!)}
                        className="h-11 rounded-md bg-slate-950 px-3 text-[10px] font-semibold text-white"
                      >
                        添加到画布
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center text-center">
          <Clock3 className="mb-2 h-6 w-6 text-slate-300" aria-hidden="true" />
          <p className="text-xs font-medium text-slate-500">暂无生成历史</p>
          <p className="mt-1 text-[10px] text-slate-400">
            首次生成后，任务和结果会保存在这里
          </p>
        </div>
      )}
    </div>
  );
}

function HistoryStatus({ status }: { status: GenerationTask["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
        <Check className="h-3 w-3" aria-hidden="true" />
        已完成
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
        <CircleAlert className="h-3 w-3" aria-hidden="true" />
        失败
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      生成中
    </span>
  );
}

function requireSupabase(client: ReturnType<typeof getSupabaseBrowserClient> | null) {
  if (!client) {
    throw new Error("Supabase 客户端未配置。");
  }

  return client;
}

async function pollGenerationTask(input: {
  taskId: string;
  providerCredentials?: ProviderCredentials;
  getAccessToken: () => Promise<string>;
  onProgress: (progress: number) => void;
  initialDelayMs?: number;
}) {
  let delayMs = input.initialDelayMs ?? 5000;
  let networkFailures = 0;

  for (let attempt = 0; attempt < 144; attempt += 1) {
    await wait(delayMs);

    try {
      const token = await input.getAccessToken();
      const response = await fetch("/api/media-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          operation: "poll",
          taskId: input.taskId,
          providerCredentials: input.providerCredentials
        })
      });
      const payload = (await response.json()) as MediaGenerationApiResponse;

      if (!response.ok) {
        if (
          (payload.error?.code === "PROVIDER_NETWORK_ERROR" ||
            payload.error?.code === "PROVIDER_TEMPORARY_ERROR" ||
            response.status >= 500) &&
          networkFailures < 3
        ) {
          networkFailures += 1;
          delayMs = Math.min(3000 * 2 ** networkFailures, 15000);
          continue;
        }
        throw generationUiError(payload.error, "视频任务查询失败。");
      }

      if (payload.data?.asset) {
        return payload;
      }

      if (payload.data?.status !== "processing") {
        throw new Error("视频任务返回了未知状态。");
      }

      input.onProgress(payload.data.progress ?? 0);
      delayMs = payload.data.pollAfterMs ?? 5000;
      networkFailures = 0;
    } catch (error) {
      if (error instanceof TypeError && networkFailures < 3) {
        networkFailures += 1;
        delayMs = Math.min(3000 * 2 ** networkFailures, 15000);
        continue;
      }

      throw error;
    }
  }

  throw new Error("视频生成等待超时，任务可能仍在供应商队列中。");
}

function referenceModeLabel(mode: MediaReferenceMode) {
  const labels: Record<MediaReferenceMode, string> = {
    none: "纯提示词",
    image: "参考图",
    "start-frame": "首帧",
    "start-end": "首尾帧",
    "multi-image": "多图参考",
    keyframes: "关键帧"
  };

  return labels[mode];
}

function referenceFitLabel(fit: MediaReferenceFit) {
  const labels: Record<MediaReferenceFit, string> = {
    outpaint: "扩图适配",
    crop: "智能裁切",
    contain: "完整保留"
  };

  return labels[fit];
}

function referenceModeMinimum(mode: MediaReferenceMode) {
  if (mode === "none") return 0;
  if (
    mode === "start-end" ||
    mode === "multi-image" ||
    mode === "keyframes"
  ) {
    return 2;
  }
  return 1;
}

function referenceModeLimit(mode: MediaReferenceMode, modelLimit: number) {
  if (mode === "none") return 0;
  if (mode === "start-frame") return 1;
  if (mode === "start-end") return Math.min(modelLimit, 2);
  return modelLimit;
}

function referenceSlotLabel(mode: MediaReferenceMode, index: number) {
  if (mode === "start-frame") return "首帧";
  if (mode === "start-end") return index === 0 ? "首帧" : "尾帧";
  if (mode === "keyframes") return `关键帧 ${index + 1}`;
  return `参考图 ${index + 1}`;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

class GenerationUiError extends Error {
  constructor(readonly info: GenerationErrorInfo) {
    super(info.message);
    this.name = "GenerationUiError";
  }
}

function generationUiError(
  error?: MediaGenerationApiResponse["error"],
  fallback = "媒体生成失败。"
) {
  return new GenerationUiError(
    getGenerationErrorInfo({
      code: error?.code,
      message: error?.message ?? fallback,
      provider: error?.provider
    })
  );
}

async function loadGenerationHistory(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  projectId: string
) {
  const [tasks, assets] = await Promise.all([
    listProjectGenerationTasks(supabase, projectId),
    listProjectAssets(supabase, projectId)
  ]);
  const assetsByTask = new Map(assets.map((asset) => [asset.task_id, asset]));

  return Promise.all(
    tasks.map(async (task): Promise<GenerationHistoryRecord> => {
      const request = asRecord(task.request_payload);
      const response = asRecord(task.response_payload);
      const asset = assetsByTask.get(task.id);
      const mediaType = readMediaType(request.mediaType);
      const modelId = readString(request.modelId);
      let media: GeneratedCanvasMedia | undefined;

      if (asset) {
        const metadata = asRecord(asset.metadata);
        media = {
          assetId: asset.id,
          assetUrl: asset.storage_path
            ? await createSignedAssetUrl(supabase, asset.storage_path, 3600)
            : asset.source_url ?? "",
          storagePath: asset.storage_path,
          sourceUrl: asset.source_url,
          prompt: asset.prompt,
          provider: normalizeHistoryProvider(asset.provider),
          model: readString(metadata.providerModel),
          mediaType: asset.media_type,
          mimeType: asset.mime_type ?? undefined,
          width: asset.width,
          height: asset.height,
          durationSeconds: asset.duration_seconds,
          aspectRatio: readAspectRatio(metadata.aspectRatio),
          quality: readQuality(metadata.quality),
          audio: metadata.audio === true
        };
      }

      return {
        task,
        asset,
        media,
        modelId,
        modelLabel: readString(request.providerModel) ?? modelId,
        mediaType,
        progress:
          task.status === "completed"
            ? 100
            : readNumber(response.progress) ?? (task.status === "pending" ? 3 : 10),
        error:
          task.status === "failed"
            ? getGenerationErrorInfo({
                code: readString(response.errorCode),
                message: task.error_message,
                provider: task.provider
              })
            : undefined
      };
    })
  );
}

function applyHistoryRecord(
  record: GenerationHistoryRecord,
  setters: {
    setView: (value: SidebarView) => void;
    setMediaType: (value: MediaType) => void;
    setModelId: (value: string) => void;
    setPrompt: (value: string) => void;
    setAspectRatio: (value: MediaAspectRatio) => void;
    setQuality: (value: MediaQuality) => void;
    setDurationSeconds: (value: number) => void;
    setError: (value: string | null) => void;
    setErrorSolution: (value: string | null) => void;
  }
) {
  const request = asRecord(record.task.request_payload);
  setters.setView("create");
  setters.setMediaType(record.mediaType);
  if (record.modelId) setters.setModelId(record.modelId);
  setters.setPrompt(record.task.prompt);
  setters.setAspectRatio(readAspectRatio(request.aspectRatio) ?? "1:1");
  setters.setQuality(readQuality(request.quality) ?? "standard");
  setters.setDurationSeconds(readNumber(request.durationSeconds) ?? 5);
  setters.setError(null);
  setters.setErrorSolution(null);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function readMediaType(value: unknown): MediaType {
  return value === "video" ? "video" : "image";
}

function readAspectRatio(value: unknown): MediaAspectRatio | undefined {
  return typeof value === "string" &&
    ["1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "21:9"].includes(
      value
    )
    ? (value as MediaAspectRatio)
    : undefined;
}

function readQuality(value: unknown): MediaQuality | undefined {
  return value === "standard" || value === "high" || value === "ultra"
    ? value
    : undefined;
}

function normalizeHistoryProvider(value: string): MediaGenerationProvider {
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

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getDurationOptions(
  model: ModelOption | undefined,
  quality: MediaQuality
) {
  return (
    model?.durationOptionsByQuality?.[quality] ??
    model?.durationOptions ??
    defaultDurationOptions
  );
}

function providerDisplayName(provider: MediaGenerationProvider) {
  if (provider === "pollinations") return "Pollinations";
  if (provider === "huggingface") return "Hugging Face";
  if (provider === "agnes") return "Agnes AI";
  if (provider === "nano-banana") return "Nano Banana";
  if (provider === "gptlmage2") return "GPTlmage2";
  return "公共模型";
}

const defaultDurationOptions = [5];

function ratioSwatchStyle(aspectRatio: MediaAspectRatio) {
  const [width, height] = aspectRatio.split(":").map(Number);
  const max = 22;
  const scale = max / Math.max(width, height);

  return {
    width: `${Math.max(Math.round(width * scale), 7)}px`,
    height: `${Math.max(Math.round(height * scale), 7)}px`
  };
}
