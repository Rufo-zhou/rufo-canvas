"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import {
  ArrowUp,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Film,
  Grid3X3,
  Home,
  ImageIcon,
  Languages,
  Layers,
  Loader2,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Plus,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Trophy,
  WandSparkles,
  X,
  Zap,
  type LucideIcon
} from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { openRufoOnboarding } from "@/components/onboarding/RufoOnboarding";
import {
  usePreferences,
  type RufoLanguage,
  type RufoThemeMode
} from "@/components/settings/PreferencesProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createProject,
  deleteProject,
  listProjects,
  type Project
} from "@/lib/supabase/database";
import {
  createLocalProject,
  deleteLocalProject,
  listLocalProjects
} from "@/lib/local/database";
import { useAuth } from "@/components/auth/AuthProvider";

export type ProjectDashboardProps = {
  mode: "home" | "projects";
};

type QuickPrompt = {
  label: string;
  icon: LucideIcon;
  prompt: string;
};

type FeaturedCard = {
  title: string;
  subtitle: string;
  tag: string;
  image: string;
};

type ShowcaseItem = {
  author: string;
  title: string;
  meta: string;
  stars: number;
  image: string;
};

type ArenaCard = {
  status: string;
  title: string;
  description: string;
  prize: string;
};

type WorkflowDetail = {
  id: string;
  title: string;
  description: string;
  tag: string;
  image?: string;
  prompt: string;
  steps: string[];
  outputs: string[];
  models: string[];
};

type WorkflowCopy = {
  details: string;
  openDetail: string;
  usePrompt: string;
  startCanvas: string;
  close: string;
  promptTitle: string;
  stepsTitle: string;
  outputsTitle: string;
  modelsTitle: string;
  promptApplied: string;
  featuredPrefix: string;
  templatePrefix: string;
  challengePrefix: string;
  promptSuffix: string;
  steps: string[];
  outputs: string[];
  models: string[];
};

type DashboardCopy = {
  nav: {
    home: string;
    workspace: string;
    tv: string;
    arena: string;
    templates: string;
    freeTrial: string;
    logout: string;
  };
  preferences: {
    theme: string;
    language: string;
    system: string;
    light: string;
    dark: string;
  };
  hero: {
    badge: string;
    title: string;
    placeholder: string;
    note: string;
    submitTitle: string;
  };
  sections: {
    featured: string;
    explore: string;
    arena: string;
    templates: string;
    recent: string;
    allProjects: string;
    viewAll: string;
    enterCanvas: string;
    newProject: string;
    viewProcess: string;
    preview: string;
  };
  projects: {
    workspaceTitle: string;
    workspaceDescription: string;
    projectNamePlaceholder: string;
    createCanvas: string;
    loading: string;
    empty: string;
    delete: string;
    canvas: string;
    defaultName: string;
  };
  errors: {
    load: string;
    create: string;
    delete: string;
    supabaseMissing: string;
  };
  footer: {
    name: string;
    stack: string;
  };
  quickPrompts: QuickPrompt[];
  featuredCards: FeaturedCard[];
  showcaseItems: ShowcaseItem[];
  arenaCards: ArenaCard[];
  templateItems: string[];
};

const copyByLanguage: Record<RufoLanguage, DashboardCopy> = {
  "zh-CN": {
    nav: {
      home: "主页",
      workspace: "工作空间",
      tv: "流程工坊",
      arena: "挑战计划",
      templates: "模板库",
      freeTrial: "免费体验",
      logout: "退出"
    },
    preferences: {
      theme: "主题",
      language: "语言",
      system: "跟随系统",
      light: "日间",
      dark: "夜间"
    },
    hero: {
      badge: "无限画布 Agent 正在接管重复工作",
      title: "今天要做点什么？",
      placeholder: "开始一段灵感对话，例如：为一款极简香氛产品生成电商主图和短视频首尾帧...",
      note: "自动创建项目并进入 Rufo 无限画布",
      submitTitle: "开始创作"
    },
    sections: {
      featured: "精选推荐",
      explore: "Rufo 流程工坊",
      arena: "Rufo 挑战计划",
      templates: "模板库",
      recent: "最近项目",
      allProjects: "全部项目",
      viewAll: "查看全部",
      enterCanvas: "进入画布",
      newProject: "新建项目",
      viewProcess: "查看流程",
      preview: "预览"
    },
    projects: {
      workspaceTitle: "工作空间",
      workspaceDescription: "管理你的 Rufo 画布项目，或新建一个空白无限画布。",
      projectNamePlaceholder: "项目名称",
      createCanvas: "新建画布",
      loading: "正在加载项目",
      empty: "还没有项目。输入一个创作想法或点击新建开始。",
      delete: "删除",
      canvas: "Canvas",
      defaultName: "Rufo Canvas"
    },
    errors: {
      load: "项目加载失败。",
      create: "项目创建失败。",
      delete: "项目删除失败。",
      supabaseMissing: "Supabase 客户端未配置。"
    },
    footer: {
      name: "Rufo Infinite Creative Canvas",
      stack: "Next.js · React Flow · Supabase · Free Model Workflow"
    },
    quickPrompts: [
      {
        label: "生成电商主图",
        icon: ImageIcon,
        prompt: "为一款高端香氛产品生成 4 张电商主图，包含极简白底、场景海报、细节特写和社媒封面。"
      },
      {
        label: "制作视频分镜",
        icon: Film,
        prompt: "为一支 15 秒新品发布短片生成电影感分镜，包含镜头运动、光影气氛和首尾帧提示。"
      },
      {
        label: "塑造原创角色",
        icon: Sparkles,
        prompt: "创建一个写实原创角色设定，输出正面、侧面、情绪表情和可用于视频生成的角色描述。"
      }
    ],
    featuredCards: [
      {
        title: "Rufo x Agnes 2.0 多模型画布",
        subtitle: "从一个提示词开始，自动进入无限画布生成图片与视频",
        tag: "模型工作流",
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        title: "参考图继续生成",
        subtitle: "从画布节点拉出新节点，继承比例并作为参考继续创作",
        tag: "节点生成",
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        title: "一键润色提示词",
        subtitle: "把粗略想法扩写成更稳定的视觉生成提示词",
        tag: "Prompt Agent",
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        title: "视频与图片同画布管理",
        subtitle: "生成记录、素材上传、项目持久化都在一个工作区完成",
        tag: "Creative OS",
        image: "/rufo-home/canvas-preview.jpg"
      }
    ],
    showcaseItems: [
      {
        author: "@Rufo Studio",
        title: "香氛新品全链路视觉",
        meta: "电商图组 · 18 张节点",
        stars: 128,
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        author: "@Canvas Lab",
        title: "AI 短片首尾帧推演",
        meta: "视频画布 · 06:24",
        stars: 86,
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        author: "@Prompt Agent",
        title: "角色三视图与场景延展",
        meta: "参考图生成 · 32 次迭代",
        stars: 214,
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        author: "@Open Canvas",
        title: "社媒广告一键适配",
        meta: "多比例输出 · 9:16 / 1:1",
        stars: 67,
        image: "/rufo-home/workspace-reference.jpg"
      }
    ],
    arenaCards: [
      {
        status: "进行中",
        title: "全盘免费模型接入挑战",
        description: "把可用免费图片与视频模型整理进一个自助 API 工作流。",
        prize: "开放模型池 + 项目模板"
      },
      {
        status: "即将开始",
        title: "无限画布短片周",
        description: "使用首尾帧、参考图和节点续写完成一支 15 秒短片。",
        prize: "视频生成积分池"
      },
      {
        status: "模板征集",
        title: "品牌视觉模板库",
        description: "沉淀电商、海报、社媒与产品广告可复用流程。",
        prize: "精选到 Rufo 首页"
      }
    ],
    templateItems: [
      "一键电商组图",
      "品牌海报矩阵",
      "九宫格分镜",
      "角色三视图",
      "视频首尾帧",
      "社媒多比例适配",
      "产品细节特写",
      "电影光影校正"
    ]
  },
  en: {
    nav: {
      home: "Home",
      workspace: "Workspace",
      tv: "Workflow Lab",
      arena: "Challenge Lab",
      templates: "Templates",
      freeTrial: "Try free",
      logout: "Sign out"
    },
    preferences: {
      theme: "Theme",
      language: "Language",
      system: "System",
      light: "Light",
      dark: "Dark"
    },
    hero: {
      badge: "Infinite canvas agents are handling the repetitive work",
      title: "What shall we create today?",
      placeholder: "Start with an idea, for example: generate ecommerce hero images and video keyframes for a minimalist fragrance product...",
      note: "Creates a project and opens the Rufo infinite canvas",
      submitTitle: "Start creating"
    },
    sections: {
      featured: "Featured",
      explore: "Rufo Workflow Lab",
      arena: "Rufo Challenge Lab",
      templates: "Templates",
      recent: "Recent Projects",
      allProjects: "All Projects",
      viewAll: "View all",
      enterCanvas: "Enter canvas",
      newProject: "New project",
      viewProcess: "View process",
      preview: "Preview"
    },
    projects: {
      workspaceTitle: "Workspace",
      workspaceDescription: "Manage your Rufo canvas projects or create a blank infinite canvas.",
      projectNamePlaceholder: "Project name",
      createCanvas: "New canvas",
      loading: "Loading projects",
      empty: "No projects yet. Enter an idea or create a new canvas.",
      delete: "Delete",
      canvas: "Canvas",
      defaultName: "Rufo Canvas"
    },
    errors: {
      load: "Failed to load projects.",
      create: "Failed to create project.",
      delete: "Failed to delete project.",
      supabaseMissing: "Supabase client is not configured."
    },
    footer: {
      name: "Rufo Infinite Creative Canvas",
      stack: "Next.js · React Flow · Supabase · Free Model Workflow"
    },
    quickPrompts: [
      {
        label: "Ecommerce images",
        icon: ImageIcon,
        prompt: "Create four ecommerce hero images for a premium fragrance product: clean white background, lifestyle scene, detail close-up, and social cover."
      },
      {
        label: "Video storyboard",
        icon: Film,
        prompt: "Create a cinematic storyboard for a 15-second product launch video, including camera movement, lighting mood, and first/last frame prompts."
      },
      {
        label: "Original character",
        icon: Sparkles,
        prompt: "Design a realistic original character with front view, side view, emotional expressions, and prompts usable for video generation."
      }
    ],
    featuredCards: [
      {
        title: "Rufo x Agnes 2.0 multi-model canvas",
        subtitle: "Start from one prompt and generate images and videos on an infinite canvas",
        tag: "Model workflow",
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        title: "Continue from references",
        subtitle: "Drag from a canvas node, inherit aspect ratio, and keep creating from the reference",
        tag: "Node generation",
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        title: "One-click prompt polish",
        subtitle: "Expand rough ideas into more stable visual generation prompts",
        tag: "Prompt Agent",
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        title: "Images and video in one canvas",
        subtitle: "Generation history, uploads, and project persistence in one workspace",
        tag: "Creative OS",
        image: "/rufo-home/canvas-preview.jpg"
      }
    ],
    showcaseItems: [
      {
        author: "@Rufo Studio",
        title: "Full fragrance launch visuals",
        meta: "Ecommerce set · 18 nodes",
        stars: 128,
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        author: "@Canvas Lab",
        title: "AI short-film keyframe study",
        meta: "Video canvas · 06:24",
        stars: 86,
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        author: "@Prompt Agent",
        title: "Character turnarounds and scenes",
        meta: "Reference generation · 32 iterations",
        stars: 214,
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        author: "@Open Canvas",
        title: "Social ad aspect adaptation",
        meta: "Multi-ratio output · 9:16 / 1:1",
        stars: 67,
        image: "/rufo-home/workspace-reference.jpg"
      }
    ],
    arenaCards: [
      {
        status: "Live",
        title: "Free model integration challenge",
        description: "Organize free image and video models into a self-serve API workflow.",
        prize: "Open model pool + project templates"
      },
      {
        status: "Soon",
        title: "Infinite canvas short-film week",
        description: "Use first/last frames, references, and node continuation to finish a 15-second film.",
        prize: "Video generation credit pool"
      },
      {
        status: "Templates",
        title: "Brand visual template library",
        description: "Collect reusable workflows for ecommerce, posters, social, and product ads.",
        prize: "Featured on Rufo home"
      }
    ],
    templateItems: [
      "One-tap ecommerce set",
      "Brand poster matrix",
      "Nine-shot storyboard",
      "Character turnaround",
      "Video first/last frames",
      "Social aspect adaptation",
      "Product detail close-ups",
      "Cinematic lighting correction"
    ]
  },
  ja: {
    nav: {
      home: "ホーム",
      workspace: "ワークスペース",
      tv: "ワークフローラボ",
      arena: "チャレンジ",
      templates: "テンプレート",
      freeTrial: "無料で試す",
      logout: "ログアウト"
    },
    preferences: {
      theme: "テーマ",
      language: "言語",
      system: "システム",
      light: "ライト",
      dark: "ダーク"
    },
    hero: {
      badge: "無限キャンバス Agent が反復作業を引き受けます",
      title: "今日は何を作りますか？",
      placeholder: "アイデアを入力してください。例：ミニマルな香水商品のEC画像と動画キーフレームを生成...",
      note: "プロジェクトを作成して Rufo 無限キャンバスを開きます",
      submitTitle: "作成を開始"
    },
    sections: {
      featured: "おすすめ",
      explore: "Rufo ワークフローラボ",
      arena: "Rufo チャレンジ",
      templates: "テンプレート",
      recent: "最近のプロジェクト",
      allProjects: "すべてのプロジェクト",
      viewAll: "すべて見る",
      enterCanvas: "キャンバスへ",
      newProject: "新規プロジェクト",
      viewProcess: "工程を見る",
      preview: "プレビュー"
    },
    projects: {
      workspaceTitle: "ワークスペース",
      workspaceDescription: "Rufo キャンバスプロジェクトを管理し、新しい無限キャンバスを作成します。",
      projectNamePlaceholder: "プロジェクト名",
      createCanvas: "新規キャンバス",
      loading: "プロジェクトを読み込み中",
      empty: "プロジェクトはまだありません。アイデアを入力するか、新規作成してください。",
      delete: "削除",
      canvas: "Canvas",
      defaultName: "Rufo Canvas"
    },
    errors: {
      load: "プロジェクトの読み込みに失敗しました。",
      create: "プロジェクトの作成に失敗しました。",
      delete: "プロジェクトの削除に失敗しました。",
      supabaseMissing: "Supabase クライアントが設定されていません。"
    },
    footer: {
      name: "Rufo Infinite Creative Canvas",
      stack: "Next.js · React Flow · Supabase · Free Model Workflow"
    },
    quickPrompts: [
      {
        label: "EC画像を生成",
        icon: ImageIcon,
        prompt: "高級香水商品のEC用メイン画像を4枚作成。白背景、ライフスタイルシーン、詳細クローズアップ、SNSカバーを含める。"
      },
      {
        label: "動画絵コンテ",
        icon: Film,
        prompt: "15秒の商品発表動画のシネマティックな絵コンテを作成。カメラワーク、光、最初と最後のフレームを含める。"
      },
      {
        label: "オリジナルキャラ",
        icon: Sparkles,
        prompt: "リアルなオリジナルキャラクターを作成。正面、側面、表情、動画生成用プロンプトを含める。"
      }
    ],
    featuredCards: [
      {
        title: "Rufo x Agnes 2.0 マルチモデルキャンバス",
        subtitle: "1つのプロンプトから無限キャンバスで画像と動画を生成",
        tag: "モデルワークフロー",
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        title: "参考画像から継続生成",
        subtitle: "ノードからドラッグし、比率を継承して参考素材として続ける",
        tag: "ノード生成",
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        title: "ワンクリックでプロンプト改善",
        subtitle: "粗いアイデアを安定した生成プロンプトへ拡張",
        tag: "Prompt Agent",
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        title: "画像と動画を同じキャンバスで管理",
        subtitle: "生成履歴、アップロード、保存を1つのワークスペースで",
        tag: "Creative OS",
        image: "/rufo-home/canvas-preview.jpg"
      }
    ],
    showcaseItems: [
      {
        author: "@Rufo Studio",
        title: "香水ローンチのビジュアル一式",
        meta: "ECセット · 18ノード",
        stars: 128,
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        author: "@Canvas Lab",
        title: "AI短編のキーフレーム検討",
        meta: "動画キャンバス · 06:24",
        stars: 86,
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        author: "@Prompt Agent",
        title: "キャラクター三面図とシーン展開",
        meta: "参考生成 · 32回反復",
        stars: 214,
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        author: "@Open Canvas",
        title: "SNS広告の比率展開",
        meta: "複数比率 · 9:16 / 1:1",
        stars: 67,
        image: "/rufo-home/workspace-reference.jpg"
      }
    ],
    arenaCards: [
      {
        status: "開催中",
        title: "無料モデル連携チャレンジ",
        description: "無料画像・動画モデルをセルフサービス API ワークフローに整理します。",
        prize: "オープンモデルプール + テンプレート"
      },
      {
        status: "近日開始",
        title: "無限キャンバス短編週間",
        description: "首尾フレーム、参考画像、ノード継続で15秒動画を完成させます。",
        prize: "動画生成クレジットプール"
      },
      {
        status: "テンプレート",
        title: "ブランドビジュアルテンプレート",
        description: "EC、ポスター、SNS、広告向けの再利用ワークフローを蓄積します。",
        prize: "Rufo ホームに掲載"
      }
    ],
    templateItems: [
      "EC画像セット",
      "ブランドポスターマトリクス",
      "九分割絵コンテ",
      "キャラクター三面図",
      "動画首尾フレーム",
      "SNS比率展開",
      "商品ディテール",
      "映画風ライティング補正"
    ]
  },
  ko: {
    nav: {
      home: "홈",
      workspace: "워크스페이스",
      tv: "워크플로우 랩",
      arena: "챌린지",
      templates: "템플릿",
      freeTrial: "무료 체험",
      logout: "로그아웃"
    },
    preferences: {
      theme: "테마",
      language: "언어",
      system: "시스템",
      light: "라이트",
      dark: "다크"
    },
    hero: {
      badge: "무한 캔버스 Agent가 반복 작업을 처리합니다",
      title: "오늘 무엇을 만들까요?",
      placeholder: "아이디어를 입력하세요. 예: 미니멀 향수 제품의 이커머스 이미지와 영상 키프레임 생성...",
      note: "프로젝트를 만들고 Rufo 무한 캔버스를 엽니다",
      submitTitle: "창작 시작"
    },
    sections: {
      featured: "추천",
      explore: "Rufo 워크플로우 랩",
      arena: "Rufo 챌린지",
      templates: "템플릿",
      recent: "최근 프로젝트",
      allProjects: "전체 프로젝트",
      viewAll: "전체 보기",
      enterCanvas: "캔버스로",
      newProject: "새 프로젝트",
      viewProcess: "과정 보기",
      preview: "미리보기"
    },
    projects: {
      workspaceTitle: "워크스페이스",
      workspaceDescription: "Rufo 캔버스 프로젝트를 관리하거나 빈 무한 캔버스를 만드세요.",
      projectNamePlaceholder: "프로젝트 이름",
      createCanvas: "새 캔버스",
      loading: "프로젝트 불러오는 중",
      empty: "아직 프로젝트가 없습니다. 아이디어를 입력하거나 새 캔버스를 만드세요.",
      delete: "삭제",
      canvas: "Canvas",
      defaultName: "Rufo Canvas"
    },
    errors: {
      load: "프로젝트를 불러오지 못했습니다.",
      create: "프로젝트를 만들지 못했습니다.",
      delete: "프로젝트를 삭제하지 못했습니다.",
      supabaseMissing: "Supabase 클라이언트가 설정되지 않았습니다."
    },
    footer: {
      name: "Rufo Infinite Creative Canvas",
      stack: "Next.js · React Flow · Supabase · Free Model Workflow"
    },
    quickPrompts: [
      {
        label: "이커머스 이미지",
        icon: ImageIcon,
        prompt: "프리미엄 향수 제품을 위한 이커머스 대표 이미지 4장을 생성하세요: 화이트 배경, 라이프스타일 장면, 디테일 클로즈업, 소셜 커버."
      },
      {
        label: "영상 스토리보드",
        icon: Film,
        prompt: "15초 제품 출시 영상의 시네마틱 스토리보드를 만드세요. 카메라 움직임, 조명 분위기, 첫/마지막 프레임을 포함합니다."
      },
      {
        label: "오리지널 캐릭터",
        icon: Sparkles,
        prompt: "사실적인 오리지널 캐릭터를 설계하세요. 정면, 측면, 표정, 영상 생성용 프롬프트를 포함합니다."
      }
    ],
    featuredCards: [
      {
        title: "Rufo x Agnes 2.0 멀티 모델 캔버스",
        subtitle: "하나의 프롬프트로 무한 캔버스에서 이미지와 영상을 생성",
        tag: "모델 워크플로우",
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        title: "레퍼런스에서 이어 만들기",
        subtitle: "노드에서 드래그해 비율을 유지하고 레퍼런스로 계속 생성",
        tag: "노드 생성",
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        title: "원클릭 프롬프트 다듬기",
        subtitle: "거친 아이디어를 안정적인 생성 프롬프트로 확장",
        tag: "Prompt Agent",
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        title: "이미지와 영상을 한 캔버스에서",
        subtitle: "생성 기록, 업로드, 프로젝트 저장을 하나의 워크스페이스에서",
        tag: "Creative OS",
        image: "/rufo-home/canvas-preview.jpg"
      }
    ],
    showcaseItems: [
      {
        author: "@Rufo Studio",
        title: "향수 런칭 비주얼 전체 세트",
        meta: "이커머스 세트 · 18 노드",
        stars: 128,
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        author: "@Canvas Lab",
        title: "AI 단편 키프레임 연구",
        meta: "영상 캔버스 · 06:24",
        stars: 86,
        image: "/rufo-home/workspace-reference.jpg"
      },
      {
        author: "@Prompt Agent",
        title: "캐릭터 턴어라운드와 장면 확장",
        meta: "레퍼런스 생성 · 32회 반복",
        stars: 214,
        image: "/rufo-home/canvas-preview.jpg"
      },
      {
        author: "@Open Canvas",
        title: "소셜 광고 비율 변환",
        meta: "멀티 비율 · 9:16 / 1:1",
        stars: 67,
        image: "/rufo-home/workspace-reference.jpg"
      }
    ],
    arenaCards: [
      {
        status: "진행 중",
        title: "무료 모델 연동 챌린지",
        description: "무료 이미지와 영상 모델을 셀프 API 워크플로우로 정리합니다.",
        prize: "오픈 모델 풀 + 프로젝트 템플릿"
      },
      {
        status: "곧 시작",
        title: "무한 캔버스 단편 주간",
        description: "첫/마지막 프레임, 레퍼런스, 노드 이어 만들기로 15초 영상을 완성합니다.",
        prize: "영상 생성 크레딧 풀"
      },
      {
        status: "템플릿",
        title: "브랜드 비주얼 템플릿",
        description: "이커머스, 포스터, 소셜, 제품 광고 워크플로우를 축적합니다.",
        prize: "Rufo 홈에 소개"
      }
    ],
    templateItems: [
      "이커머스 이미지 세트",
      "브랜드 포스터 매트릭스",
      "9컷 스토리보드",
      "캐릭터 턴어라운드",
      "영상 첫/마지막 프레임",
      "소셜 비율 변환",
      "제품 디테일 클로즈업",
      "시네마틱 조명 보정"
    ]
  }
};

const languageLabels: Record<RufoLanguage, string> = {
  "zh-CN": "简体中文",
  en: "English",
  ja: "日本語",
  ko: "한국어"
};

const workflowCopyByLanguage: Record<RufoLanguage, WorkflowCopy> = {
  "zh-CN": {
    details: "Rufo 工作流详情",
    openDetail: "查看工作流",
    usePrompt: "填入输入框",
    startCanvas: "直接创建画布",
    close: "关闭",
    promptTitle: "可执行提示词",
    stepsTitle: "实操步骤",
    outputsTitle: "预期产出",
    modelsTitle: "建议能力",
    promptApplied: "已填入创作输入框，可继续编辑或直接开始。",
    featuredPrefix: "请基于这个 Rufo 原创工作流创建一个可执行的无限画布项目：",
    templatePrefix: "请使用这个 Rufo 模板启动一个可复用的创作项目：",
    challengePrefix: "请基于这个 Rufo 挑战计划创建项目：",
    promptSuffix: "请拆解为首批节点、参考图策略、推荐比例、图片/视频模型选择、失败替代方案和后续迭代路径。",
    steps: [
      "在画布中心建立目标节点，写清楚风格、比例、使用场景和交付格式。",
      "生成首批 3-5 个图片或视频节点，保留失败节点原因与替代提示词。",
      "从最满意的节点继续拉线生成变体，并用参考图模式保持主体一致。",
      "整理成可复用模板，保存生成记录、素材和最终交付节点。"
    ],
    outputs: [
      "一个可继续迭代的 Rufo 无限画布项目",
      "可直接复制和再次润色的强化提示词",
      "图片/视频节点、参考素材和生成历史",
      "适合团队复用的流程模板"
    ],
    models: [
      "Sana Free 用于快速构图",
      "Agnes Image 2.0/2.1 用于高质量图片",
      "Agnes Video 2.0 用于短视频首尾帧",
      "提示词润色 Agent 用于稳定输出"
    ]
  },
  en: {
    details: "Rufo workflow details",
    openDetail: "View workflow",
    usePrompt: "Use prompt",
    startCanvas: "Create canvas",
    close: "Close",
    promptTitle: "Executable prompt",
    stepsTitle: "Action steps",
    outputsTitle: "Expected outputs",
    modelsTitle: "Suggested capabilities",
    promptApplied: "Prompt added to the composer. You can edit it or start now.",
    featuredPrefix: "Create an executable Rufo infinite-canvas project from this original workflow:",
    templatePrefix: "Start a reusable Rufo creative project with this template:",
    challengePrefix: "Create a Rufo project from this challenge plan:",
    promptSuffix: "Break it into first nodes, reference strategy, recommended aspect ratios, image/video model choices, fallback prompts, and follow-up iterations.",
    steps: [
      "Create a goal node with style, aspect ratio, use case, and delivery format.",
      "Generate the first 3-5 image or video nodes and keep failure reasons with alternate prompts.",
      "Continue from the best node with reference generation to preserve subject consistency.",
      "Save the generation history, assets, and final node set as a reusable workflow."
    ],
    outputs: [
      "A Rufo infinite-canvas project ready for iteration",
      "A strengthened prompt that can be copied and polished again",
      "Image/video nodes, references, and generation history",
      "A reusable workflow template for teams"
    ],
    models: [
      "Sana Free for fast composition",
      "Agnes Image 2.0/2.1 for high-quality images",
      "Agnes Video 2.0 for short-video frames",
      "Prompt polish Agent for more stable results"
    ]
  },
  ja: {
    details: "Rufo ワークフロー詳細",
    openDetail: "ワークフローを見る",
    usePrompt: "入力欄へ入れる",
    startCanvas: "キャンバス作成",
    close: "閉じる",
    promptTitle: "実行用プロンプト",
    stepsTitle: "実操作手順",
    outputsTitle: "想定アウトプット",
    modelsTitle: "推奨機能",
    promptApplied: "作成欄に入力しました。編集してから開始できます。",
    featuredPrefix: "この Rufo オリジナルワークフローから実行可能な無限キャンバスプロジェクトを作成してください：",
    templatePrefix: "この Rufo テンプレートで再利用可能な制作プロジェクトを開始してください：",
    challengePrefix: "この Rufo チャレンジ計画からプロジェクトを作成してください：",
    promptSuffix: "初期ノード、参考素材戦略、推奨比率、画像/動画モデル、失敗時の代替案、次の反復手順に分解してください。",
    steps: [
      "目的ノードを作り、スタイル、比率、用途、納品形式を明確にする。",
      "最初の画像/動画ノードを3-5個生成し、失敗理由と代替プロンプトを残す。",
      "最良ノードから参考生成で派生させ、主体の一貫性を保つ。",
      "生成履歴、素材、最終ノードを保存し、再利用できる形に整理する。"
    ],
    outputs: [
      "反復可能な Rufo 無限キャンバスプロジェクト",
      "コピーして再度改善できる強化プロンプト",
      "画像/動画ノード、参考素材、生成履歴",
      "チームで再利用できるワークフローテンプレート"
    ],
    models: [
      "Sana Free で素早く構図作成",
      "Agnes Image 2.0/2.1 で高品質画像",
      "Agnes Video 2.0 で短尺動画フレーム",
      "Prompt Agent で出力安定化"
    ]
  },
  ko: {
    details: "Rufo 워크플로우 상세",
    openDetail: "워크플로우 보기",
    usePrompt: "입력창에 넣기",
    startCanvas: "캔버스 만들기",
    close: "닫기",
    promptTitle: "실행 프롬프트",
    stepsTitle: "실행 단계",
    outputsTitle: "예상 결과",
    modelsTitle: "추천 기능",
    promptApplied: "입력창에 넣었습니다. 수정하거나 바로 시작할 수 있습니다.",
    featuredPrefix: "이 Rufo 오리지널 워크플로우를 기반으로 실행 가능한 무한 캔버스 프로젝트를 만드세요:",
    templatePrefix: "이 Rufo 템플릿으로 재사용 가능한 창작 프로젝트를 시작하세요:",
    challengePrefix: "이 Rufo 챌린지 계획으로 프로젝트를 만드세요:",
    promptSuffix: "첫 노드, 레퍼런스 전략, 추천 비율, 이미지/영상 모델, 실패 대안, 후속 반복 경로로 나눠주세요.",
    steps: [
      "목표 노드를 만들고 스타일, 비율, 사용 목적, 납품 형식을 명확히 합니다.",
      "첫 이미지/영상 노드 3-5개를 생성하고 실패 이유와 대체 프롬프트를 남깁니다.",
      "가장 좋은 노드에서 레퍼런스 생성으로 이어가며 주체 일관성을 유지합니다.",
      "생성 기록, 소재, 최종 노드를 저장해 재사용 가능한 흐름으로 정리합니다."
    ],
    outputs: [
      "반복 가능한 Rufo 무한 캔버스 프로젝트",
      "복사하고 다시 다듬을 수 있는 강화 프롬프트",
      "이미지/영상 노드, 레퍼런스, 생성 기록",
      "팀이 재사용할 수 있는 워크플로우 템플릿"
    ],
    models: [
      "Sana Free로 빠른 구도 생성",
      "Agnes Image 2.0/2.1로 고품질 이미지",
      "Agnes Video 2.0으로 짧은 영상 프레임",
      "Prompt Agent로 안정적인 출력"
    ]
  }
};

export function ProjectDashboard({ mode }: ProjectDashboardProps) {
  return (
    <AuthGate>
      <ProjectDashboardContent mode={mode} />
    </AuthGate>
  );
}

function ProjectDashboardContent({ mode }: ProjectDashboardProps) {
  const router = useRouter();
  const { language } = usePreferences();
  const copy = copyByLanguage[language];
  const workflowCopy = workflowCopyByLanguage[language];
  const { mode: appMode, user, signOut } = useAuth();
  const supabase = appMode === "supabase" ? getSupabaseBrowserClient() : null;
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowDetail | null>(null);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextProjects =
        appMode === "demo"
          ? await listLocalProjects()
          : await listProjects(requireSupabase(supabase, copy));
      setProjects(nextProjects);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.errors.load);
    } finally {
      setLoading(false);
    }
  }, [appMode, copy, supabase]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  async function createProjectFromPrompt(
    nextPrompt: string,
    fallbackName = copy.projects.defaultName
  ) {
    if (!user) {
      return;
    }

    setCreating(true);
    setError(null);
    setStatus(null);

    try {
      const trimmedPrompt = nextPrompt.trim();
      const name =
        fallbackName.trim().slice(0, 48) ||
        trimmedPrompt.slice(0, 28) ||
        copy.projects.defaultName;
      const project =
        appMode === "demo"
          ? await createLocalProject(name, user.id)
          : await createProject(requireSupabase(supabase, copy), {
              name,
              ownerId: user.id
            });
      const query = trimmedPrompt
        ? `?prompt=${encodeURIComponent(trimmedPrompt)}`
        : "";
      router.push(`/projects/${project.id}${query}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.errors.create);
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateFromPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createProjectFromPrompt(prompt);
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const name = projectName.trim() || copy.projects.defaultName;
      const project =
        appMode === "demo"
          ? await createLocalProject(name, user.id)
          : await createProject(requireSupabase(supabase, copy), {
              name,
              ownerId: user.id
            });
      setProjectName("");
      await refreshProjects();
      router.push(`/projects/${project.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.errors.create);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    setError(null);

    try {
      if (appMode === "demo") {
        await deleteLocalProject(projectId);
      } else {
        await deleteProject(requireSupabase(supabase, copy), projectId);
      }
      setProjects((current) => current.filter((project) => project.id !== projectId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.errors.delete);
    }
  }

  function applyQuickPrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
    setStatus(workflowCopy.promptApplied);
    window.setTimeout(() => promptRef.current?.focus(), 0);
  }

  function openWorkflow(workflow: WorkflowDetail) {
    setActiveWorkflow(workflow);
  }

  function applyWorkflowPrompt(workflow: WorkflowDetail) {
    setPrompt(workflow.prompt);
    setStatus(workflowCopy.promptApplied);
    setActiveWorkflow(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => promptRef.current?.focus(), 200);
  }

  async function startWorkflow(workflow: WorkflowDetail) {
    setActiveWorkflow(null);
    await createProjectFromPrompt(workflow.prompt, workflow.title);
  }

  return (
    <main className="rufo-home-grid min-h-screen overflow-x-hidden text-[color:var(--rufo-home-fg)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-glass)] px-4 py-3 backdrop-blur-xl sm:px-7">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f7d65f,#53e0c3_45%,#6d8cff_75%,#f472b6)] text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/15">
              R
            </span>
            <span className="text-base font-semibold tracking-normal text-[color:var(--rufo-home-fg)]">
              Rufo
            </span>
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-pill)] p-1 text-sm font-medium text-[color:var(--rufo-home-muted)] shadow-2xl shadow-[color:var(--rufo-home-shadow)] md:flex">
            <NavLink active={mode === "home"} href="/" icon={Home}>
              {copy.nav.home}
            </NavLink>
            <NavLink active={mode === "projects"} href="/projects" icon={Grid3X3}>
              {copy.nav.workspace}
            </NavLink>
            <NavLink href="#explore" icon={Film}>
              {copy.nav.tv}
            </NavLink>
            <NavLink href="#arena" icon={Trophy}>
              {copy.nav.arena}
            </NavLink>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#templates"
              className="hidden text-sm font-medium text-[color:var(--rufo-home-muted)] transition hover:text-[color:var(--rufo-home-fg)] lg:inline"
            >
              {copy.nav.templates}
            </a>
            <PreferenceControls copy={copy} />
            <button
              type="button"
              onClick={openRufoOnboarding}
              className="hidden h-9 items-center gap-2 rounded-full border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-pill)] px-3 text-sm font-semibold text-[color:var(--rufo-home-muted)] transition hover:bg-[color:var(--rufo-home-card-hover)] hover:text-[color:var(--rufo-home-fg)] md:inline-flex"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              教程
            </button>
            <button
              type="button"
              onClick={() => {
                applyQuickPrompt(copy.quickPrompts[0]?.prompt ?? "");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hidden h-9 rounded-full bg-sky-500 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 sm:inline-flex sm:items-center"
            >
              {copy.nav.freeTrial}
            </button>
            <div className="hidden max-w-40 truncate text-xs text-[color:var(--rufo-home-soft)] xl:block">
              {user?.email}
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              title={copy.nav.logout}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-pill)] text-[color:var(--rufo-home-muted)] transition hover:bg-[color:var(--rufo-home-card-hover)] hover:text-[color:var(--rufo-home-fg)]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1480px] px-4 pb-14 pt-12 sm:px-7 lg:pt-18">
        {mode === "home" ? (
          <div className="rufo-home-fade-in mx-auto max-w-4xl text-center">
            <div className="rufo-float-label mb-4 ml-auto flex w-fit items-center gap-2 rounded-full border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-pill)] px-4 py-2 text-xs font-semibold text-[color:var(--rufo-home-muted)] shadow-xl shadow-[color:var(--rufo-home-shadow)]">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              {copy.hero.badge}
            </div>
            <h1 className="flex items-center justify-center gap-3 text-4xl font-semibold tracking-normal text-[color:var(--rufo-home-fg)] sm:text-5xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--rufo-home-primary)] text-[color:var(--rufo-home-primary-fg)]">
                <WandSparkles className="h-6 w-6" aria-hidden="true" />
              </span>
              {copy.hero.title}
            </h1>
            <form
              onSubmit={handleCreateFromPrompt}
              className="rufo-home-composer mt-7 overflow-hidden rounded-[28px] border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] text-left backdrop-blur-xl"
            >
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="h-28 w-full resize-none border-0 bg-transparent px-5 py-5 text-base leading-7 text-[color:var(--rufo-home-fg)] outline-none placeholder:text-[color:var(--rufo-home-soft)]"
                placeholder={copy.hero.placeholder}
              />
              <div className="flex items-center justify-between gap-4 border-t border-[color:var(--rufo-home-border)] px-4 py-3">
                <div className="flex items-center gap-3 text-xs text-[color:var(--rufo-home-soft)]">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {copy.hero.note}
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--rufo-home-primary)] text-[color:var(--rufo-home-primary-fg)] shadow-lg shadow-[color:var(--rufo-home-shadow)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                  title={copy.hero.submitTitle}
                >
                  {creating ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowUp className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {copy.quickPrompts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applyQuickPrompt(item.prompt)}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-pill)] px-4 text-sm text-[color:var(--rufo-home-muted)] transition hover:-translate-y-0.5 hover:bg-[color:var(--rufo-home-card-hover)] hover:text-[color:var(--rufo-home-fg)]"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <ProjectCreationPanel
            copy={copy}
            creating={creating}
            projectName={projectName}
            setProjectName={setProjectName}
            onSubmit={handleCreateProject}
          />
        )}

        {error ? (
          <p className="mx-auto mt-6 max-w-4xl rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-100">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="mx-auto mt-6 max-w-4xl rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-100">
            {status}
          </p>
        ) : null}
      </section>

      {mode === "home" ? (
        <>
          <HomeSection
            title={copy.sections.featured}
            actionLabel={copy.sections.viewAll}
            actionHref="/projects"
          >
            <div className="rufo-hide-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 sm:px-7">
              {copy.featuredCards.map((card, index) => (
                <FeaturedCardView
                  key={card.title}
                  card={card}
                  index={index}
                  workflowCopy={workflowCopy}
                  onOpen={() =>
                    openWorkflow(buildFeaturedWorkflow(workflowCopy, card, index))
                  }
                  onStart={() =>
                    void startWorkflow(buildFeaturedWorkflow(workflowCopy, card, index))
                  }
                />
              ))}
            </div>
          </HomeSection>

          <HomeSection
            id="explore"
            title={copy.sections.explore}
            actionLabel={copy.sections.enterCanvas}
            actionHref="/projects"
          >
            <div className="grid gap-3 px-4 sm:grid-cols-2 sm:px-7 lg:grid-cols-4">
              {copy.showcaseItems.map((item, index) => (
                <ShowcaseCard
                  key={item.title}
                  copy={copy}
                  workflowCopy={workflowCopy}
                  item={item}
                  index={index}
                  onOpen={() =>
                    openWorkflow(buildShowcaseWorkflow(workflowCopy, item, index))
                  }
                  onStart={() =>
                    void startWorkflow(buildShowcaseWorkflow(workflowCopy, item, index))
                  }
                />
              ))}
            </div>
          </HomeSection>

          <HomeSection
            id="arena"
            title={copy.sections.arena}
            actionLabel={copy.sections.newProject}
            actionHref="/projects"
          >
            <div className="grid gap-3 px-4 sm:px-7 lg:grid-cols-3">
              {copy.arenaCards.map((card, index) => (
                <ArenaCardView
                  key={card.title}
                  card={card}
                  workflowCopy={workflowCopy}
                  onOpen={() =>
                    openWorkflow(buildArenaWorkflow(workflowCopy, card, index))
                  }
                  onStart={() =>
                    void startWorkflow(buildArenaWorkflow(workflowCopy, card, index))
                  }
                />
              ))}
            </div>
          </HomeSection>

          <HomeSection
            id="templates"
            title={copy.sections.templates}
            actionLabel={copy.sections.allProjects}
            actionHref="/projects"
          >
            <div className="grid gap-3 px-4 sm:grid-cols-2 sm:px-7 lg:grid-cols-4">
              {copy.templateItems.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    openWorkflow(buildTemplateWorkflow(workflowCopy, item, index))
                  }
                  className="group flex h-28 items-end justify-between rounded-xl border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] p-4 text-left transition hover:-translate-y-1 hover:bg-[color:var(--rufo-home-card-hover)]"
                >
                  <span>
                    <span className="mb-3 inline-flex rounded-full bg-[color:var(--rufo-home-pill)] px-2 py-1 text-[11px] font-semibold text-[color:var(--rufo-home-soft)]">
                      {copy.sections.preview}
                    </span>
                    <span className="block text-sm font-semibold text-[color:var(--rufo-home-fg)]">{item}</span>
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--rufo-home-primary)] text-[color:var(--rufo-home-primary-fg)] transition group-hover:translate-x-1">
                    {index % 2 === 0 ? (
                      <Zap className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Layers className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </HomeSection>
        </>
      ) : null}

      <HomeSection
        title={mode === "home" ? copy.sections.recent : copy.sections.allProjects}
        actionLabel={mode === "home" ? copy.sections.viewAll : undefined}
        actionHref={mode === "home" ? "/projects" : undefined}
      >
        <div className="px-4 sm:px-7">
          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] text-[color:var(--rufo-home-muted)]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              {copy.projects.loading}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] p-10 text-center">
              <p className="text-sm text-[color:var(--rufo-home-muted)]">
                {copy.projects.empty}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(mode === "home" ? projects.slice(0, 8) : projects).map((project, index) => (
                <ProjectCard
                  key={project.id}
                  copy={copy}
                  project={project}
                  index={index}
                  onDelete={() => void handleDeleteProject(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </HomeSection>

      {activeWorkflow ? (
        <WorkflowDialog
          workflow={activeWorkflow}
          copy={workflowCopy}
          creating={creating}
          onClose={() => setActiveWorkflow(null)}
          onUsePrompt={() => applyWorkflowPrompt(activeWorkflow)}
          onStart={() => void startWorkflow(activeWorkflow)}
        />
      ) : null}

      <footer className="mx-auto flex max-w-[1480px] flex-col gap-2 px-4 py-10 text-xs text-[color:var(--rufo-home-soft)] sm:px-7 md:flex-row md:items-center md:justify-between">
        <span>{copy.footer.name}</span>
        <span>{copy.footer.stack}</span>
      </footer>
    </main>
  );
}

function NavLink({
  active = false,
  href,
  icon: Icon,
  children
}: {
  active?: boolean;
  href: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex h-9 items-center gap-2 rounded-full bg-[color:var(--rufo-home-primary)] px-4 text-[color:var(--rufo-home-primary-fg)]"
          : "inline-flex h-9 items-center gap-2 rounded-full px-4 hover:bg-[color:var(--rufo-home-card-hover)] hover:text-[color:var(--rufo-home-fg)]"
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

function PreferenceControls({ copy }: { copy: DashboardCopy }) {
  const { themeMode, language, setThemeMode, setLanguage } = usePreferences();
  const themeIcon = themeMode === "light" ? Sun : themeMode === "dark" ? Moon : Monitor;
  const ThemeIcon = themeIcon;

  return (
    <div className="flex items-center gap-2">
      <label className="hidden items-center gap-1 rounded-full border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-pill)] px-2.5 py-1.5 text-xs text-[color:var(--rufo-home-muted)] sm:flex">
        <ThemeIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{copy.preferences.theme}</span>
        <select
          value={themeMode}
          onChange={(event) => setThemeMode(event.target.value as RufoThemeMode)}
          className="bg-transparent text-xs font-medium outline-none"
          aria-label={copy.preferences.theme}
        >
          <option value="system">{copy.preferences.system}</option>
          <option value="light">{copy.preferences.light}</option>
          <option value="dark">{copy.preferences.dark}</option>
        </select>
      </label>
      <label className="flex items-center gap-1 rounded-full border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-pill)] px-2.5 py-1.5 text-xs text-[color:var(--rufo-home-muted)]">
        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{copy.preferences.language}</span>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as RufoLanguage)}
          className="max-w-[96px] bg-transparent text-xs font-medium outline-none sm:max-w-none"
          aria-label={copy.preferences.language}
        >
          {Object.entries(languageLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function HomeSection({
  id,
  title,
  actionLabel,
  actionHref,
  children
}: {
  id?: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto mt-9 max-w-[1480px] scroll-mt-24">
      <div className="mb-4 flex items-center justify-between px-4 sm:px-7">
        <h2 className="text-lg font-semibold text-[color:var(--rufo-home-fg)]">{title}</h2>
        {actionLabel && actionHref ? (
          <Link href={actionHref} className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--rufo-home-muted)] hover:text-[color:var(--rufo-home-fg)]">
            {actionLabel}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FeaturedCardView({
  card,
  index,
  workflowCopy,
  onOpen,
  onStart
}: {
  card: FeaturedCard;
  index: number;
  workflowCopy: WorkflowCopy;
  onOpen: () => void;
  onStart: () => void;
}) {
  return (
    <article
      className="rufo-home-fade-in group relative h-[305px] min-w-[min(470px,82vw)] overflow-hidden rounded-xl border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] shadow-2xl shadow-[color:var(--rufo-home-shadow)] transition duration-300 hover:-translate-y-1 hover:bg-[color:var(--rufo-home-card-hover)]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.image}
        alt={card.title}
        className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
      <div className="absolute left-5 top-5 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-cyan-100 backdrop-blur">
        {card.tag}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-base font-semibold text-white">{card.title}</h3>
        <p className="mt-2 text-sm leading-5 text-white/70">{card.subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100"
          >
            {workflowCopy.openDetail}
          </button>
          <button
            type="button"
            onClick={onStart}
            className="rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 transition hover:bg-slate-900"
          >
            {workflowCopy.startCanvas}
          </button>
        </div>
      </div>
    </article>
  );
}

function ShowcaseCard({
  copy,
  workflowCopy,
  item,
  index,
  onOpen,
  onStart
}: {
  copy: DashboardCopy;
  workflowCopy: WorkflowCopy;
  item: ShowcaseItem;
  index: number;
  onOpen: () => void;
  onStart: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] shadow-xl shadow-[color:var(--rufo-home-shadow)] transition duration-300 hover:-translate-y-1 hover:bg-[color:var(--rufo-home-card-hover)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={item.title}
          className="h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
          draggable={false}
        />
        <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
          0{index + 2}:1{index}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 opacity-0 transition group-hover:opacity-100"
        >
          {copy.sections.viewProcess}
        </button>
      </div>
      <div className="p-4">
        <p className="text-xs text-[color:var(--rufo-home-soft)]">{item.author}</p>
        <h3 className="mt-1 truncate text-sm font-semibold text-[color:var(--rufo-home-fg)]">{item.title}</h3>
        <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--rufo-home-soft)]">
          <span>{item.meta}</span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            {item.stars}
          </span>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="h-8 rounded-full border border-[color:var(--rufo-home-border)] px-3 text-xs font-semibold text-[color:var(--rufo-home-muted)] hover:bg-[color:var(--rufo-home-card-hover)] hover:text-[color:var(--rufo-home-fg)]"
          >
            {workflowCopy.openDetail}
          </button>
          <button
            type="button"
            onClick={onStart}
            className="h-8 rounded-full bg-[color:var(--rufo-home-primary)] px-3 text-xs font-semibold text-[color:var(--rufo-home-primary-fg)] hover:opacity-90"
          >
            {workflowCopy.startCanvas}
          </button>
        </div>
      </div>
    </article>
  );
}

function ArenaCardView({
  card,
  workflowCopy,
  onOpen,
  onStart
}: {
  card: ArenaCard;
  workflowCopy: WorkflowCopy;
  onOpen: () => void;
  onStart: () => void;
}) {
  return (
    <article className="min-h-56 rounded-xl border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] p-5 shadow-xl shadow-[color:var(--rufo-home-shadow)]">
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-semibold text-emerald-500">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {card.status}
      </span>
      <h3 className="mt-20 text-lg font-semibold text-[color:var(--rufo-home-fg)]">{card.title}</h3>
      <p className="mt-3 text-sm leading-6 text-[color:var(--rufo-home-muted)]">{card.description}</p>
      <p className="mt-4 text-sm font-semibold text-[color:var(--rufo-home-accent)]">{card.prize}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="h-9 rounded-full border border-[color:var(--rufo-home-border)] px-3 text-xs font-semibold text-[color:var(--rufo-home-muted)] hover:bg-[color:var(--rufo-home-card-hover)] hover:text-[color:var(--rufo-home-fg)]"
        >
          {workflowCopy.openDetail}
        </button>
        <button
          type="button"
          onClick={onStart}
          className="h-9 rounded-full bg-[color:var(--rufo-home-primary)] px-3 text-xs font-semibold text-[color:var(--rufo-home-primary-fg)] hover:opacity-90"
        >
          {workflowCopy.startCanvas}
        </button>
      </div>
    </article>
  );
}

function WorkflowDialog({
  workflow,
  copy,
  creating,
  onClose,
  onUsePrompt,
  onStart
}: {
  workflow: WorkflowDetail;
  copy: WorkflowCopy;
  creating: boolean;
  onClose: () => void;
  onUsePrompt: () => void;
  onStart: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-dialog-title"
        className="max-h-[min(820px,calc(100vh-32px))] w-full max-w-5xl overflow-hidden rounded-2xl border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-bg)] text-[color:var(--rufo-home-fg)] shadow-2xl shadow-black/30"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--rufo-home-border)] p-5">
          <div>
            <span className="inline-flex rounded-full bg-[color:var(--rufo-home-pill)] px-3 py-1 text-xs font-semibold text-[color:var(--rufo-home-accent)]">
              {workflow.tag}
            </span>
            <h2 id="workflow-dialog-title" className="mt-3 text-2xl font-semibold tracking-normal">
              {workflow.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--rufo-home-muted)]">
              {workflow.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={copy.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-pill)] text-[color:var(--rufo-home-muted)] hover:bg-[color:var(--rufo-home-card-hover)] hover:text-[color:var(--rufo-home-fg)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="grid max-h-[calc(100vh-190px)] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-5">
            {workflow.image ? (
              <div className="mb-5 overflow-hidden rounded-xl border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={workflow.image}
                  alt={workflow.title}
                  className="aspect-video w-full object-cover opacity-85"
                  draggable={false}
                />
              </div>
            ) : null}

            <InfoBlock title={copy.promptTitle}>
              <p className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--rufo-home-muted)]">
                {workflow.prompt}
              </p>
            </InfoBlock>

            <InfoBlock title={copy.stepsTitle}>
              <ol className="space-y-2">
                {workflow.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6 text-[color:var(--rufo-home-muted)]">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--rufo-home-primary)] text-xs font-semibold text-[color:var(--rufo-home-primary-fg)]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </InfoBlock>
          </div>

          <aside className="border-t border-[color:var(--rufo-home-border)] p-5 lg:border-l lg:border-t-0">
            <InfoBlock title={copy.outputsTitle}>
              <ul className="space-y-2">
                {workflow.outputs.map((output) => (
                  <li key={output} className="rounded-lg bg-[color:var(--rufo-home-card)] px-3 py-2 text-sm text-[color:var(--rufo-home-muted)]">
                    {output}
                  </li>
                ))}
              </ul>
            </InfoBlock>

            <InfoBlock title={copy.modelsTitle}>
              <ul className="space-y-2">
                {workflow.models.map((model) => (
                  <li key={model} className="rounded-lg border border-[color:var(--rufo-home-border)] px-3 py-2 text-sm text-[color:var(--rufo-home-muted)]">
                    {model}
                  </li>
                ))}
              </ul>
            </InfoBlock>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={onStart}
                disabled={creating}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[color:var(--rufo-home-primary)] px-4 text-sm font-semibold text-[color:var(--rufo-home-primary-fg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                )}
                {copy.startCanvas}
              </button>
              <button
                type="button"
                onClick={onUsePrompt}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] px-4 text-sm font-semibold text-[color:var(--rufo-home-fg)] hover:bg-[color:var(--rufo-home-card-hover)]"
              >
                {copy.usePrompt}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-3 text-sm font-semibold text-[color:var(--rufo-home-fg)]">{title}</h3>
      {children}
    </section>
  );
}

function ProjectCreationPanel({
  copy,
  creating,
  projectName,
  setProjectName,
  onSubmit
}: {
  copy: DashboardCopy;
  creating: boolean;
  projectName: string;
  setProjectName: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-4xl font-semibold tracking-normal text-[color:var(--rufo-home-fg)]">{copy.projects.workspaceTitle}</h1>
        <p className="mt-3 text-sm text-[color:var(--rufo-home-muted)]">{copy.projects.workspaceDescription}</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] p-3 shadow-2xl shadow-[color:var(--rufo-home-shadow)] sm:flex-row">
        <input
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          className="h-12 min-w-0 flex-1 rounded-lg border border-[color:var(--rufo-home-border)] bg-transparent px-4 text-sm text-[color:var(--rufo-home-fg)] outline-none placeholder:text-[color:var(--rufo-home-soft)] focus:border-[color:var(--rufo-home-accent)]"
          placeholder={copy.projects.projectNamePlaceholder}
        />
        <button
          type="submit"
          disabled={creating}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[color:var(--rufo-home-primary)] px-5 text-sm font-semibold text-[color:var(--rufo-home-primary-fg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          {copy.projects.createCanvas}
        </button>
      </form>
    </div>
  );
}

function ProjectCard({
  copy,
  project,
  index,
  onDelete
}: {
  copy: DashboardCopy;
  project: Project;
  index: number;
  onDelete: () => void;
}) {
  const image = index % 2 === 0 ? "/rufo-home/canvas-preview.jpg" : "/rufo-home/workspace-reference.jpg";

  return (
    <article className="group overflow-hidden rounded-xl border border-[color:var(--rufo-home-border)] bg-[color:var(--rufo-home-card)] shadow-xl shadow-[color:var(--rufo-home-shadow)] transition duration-300 hover:-translate-y-1 hover:bg-[color:var(--rufo-home-card-hover)]">
      <Link href={`/projects/${project.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={project.name}
            className="h-full w-full object-cover opacity-72 transition duration-700 group-hover:scale-105 group-hover:opacity-95"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white/78 backdrop-blur">
            {copy.projects.canvas}
          </span>
        </div>
        <div className="p-4">
          <h3 className="truncate text-base font-semibold text-[color:var(--rufo-home-fg)]">{project.name}</h3>
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-[color:var(--rufo-home-soft)]">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatProjectDate(project.updated_at)}
          </p>
        </div>
      </Link>
      <div className="flex justify-end px-4 pb-4">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[color:var(--rufo-home-danger)] transition hover:bg-red-500/12"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.projects.delete}
        </button>
      </div>
    </article>
  );
}

function buildFeaturedWorkflow(
  copy: WorkflowCopy,
  card: FeaturedCard,
  index: number
): WorkflowDetail {
  return {
    id: `featured-${index}`,
    title: card.title,
    description: card.subtitle,
    tag: card.tag,
    image: card.image,
    prompt: `${copy.featuredPrefix}${card.title}\n${card.subtitle}\n\n${copy.promptSuffix}`,
    steps: copy.steps,
    outputs: copy.outputs,
    models: copy.models
  };
}

function buildShowcaseWorkflow(
  copy: WorkflowCopy,
  item: ShowcaseItem,
  index: number
): WorkflowDetail {
  return {
    id: `showcase-${index}`,
    title: item.title,
    description: `${item.author} · ${item.meta}`,
    tag: "Rufo Workflow",
    image: item.image,
    prompt: `${copy.featuredPrefix}${item.title}\n${item.meta}\n\n${copy.promptSuffix}`,
    steps: copy.steps,
    outputs: copy.outputs,
    models: copy.models
  };
}

function buildArenaWorkflow(
  copy: WorkflowCopy,
  card: ArenaCard,
  index: number
): WorkflowDetail {
  return {
    id: `challenge-${index}`,
    title: card.title,
    description: card.description,
    tag: card.status,
    prompt: `${copy.challengePrefix}${card.title}\n${card.description}\n${card.prize}\n\n${copy.promptSuffix}`,
    steps: copy.steps,
    outputs: copy.outputs,
    models: copy.models
  };
}

function buildTemplateWorkflow(
  copy: WorkflowCopy,
  title: string,
  index: number
): WorkflowDetail {
  return {
    id: `template-${index}`,
    title,
    description: `${copy.templatePrefix}${title}`,
    tag: "Rufo Template",
    prompt: `${copy.templatePrefix}${title}\n\n${copy.promptSuffix}`,
    steps: copy.steps,
    outputs: copy.outputs,
    models: copy.models
  };
}

function formatProjectDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function requireSupabase(
  client: ReturnType<typeof getSupabaseBrowserClient> | null,
  copy: DashboardCopy
) {
  if (!client) {
    throw new Error(copy.errors.supabaseMissing);
  }

  return client;
}
