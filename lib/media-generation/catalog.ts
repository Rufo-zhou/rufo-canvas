import type { MediaModel } from "./types";

const imageRatios: MediaModel["aspectRatios"] = [
  "1:1",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "16:9",
  "9:16",
  "21:9"
];
const videoRatios: MediaModel["aspectRatios"] = ["16:9", "9:16"];
const agnesVideoRatios: MediaModel["aspectRatios"] = [
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "3:4"
];
const imageQualities: MediaModel["qualityOptions"] = ["standard", "high", "ultra"];

export const mediaModels: MediaModel[] = [
  {
    id: "sana-free",
    provider: "pollinations-free",
    providerModel: "sana",
    label: "Sana Public",
    mediaType: "image",
    freeTier: true,
    requiresKey: false,
    supportsReference: false,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "无需密钥的公共图片模型，适合快速文字生图。"
  },
  {
    id: "flux",
    provider: "pollinations",
    providerModel: "flux",
    label: "Flux Schnell",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: false,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "使用 Pollinations 免费 Pollen 额度。"
  },
  {
    id: "zimage",
    provider: "pollinations",
    providerModel: "zimage",
    label: "Z-Image Turbo",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: false,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "使用 Pollinations 免费 Pollen 额度。"
  },
  {
    id: "kontext",
    provider: "pollinations",
    providerModel: "kontext",
    label: "FLUX Kontext",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["image"],
    maxReferenceImages: 1,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "擅长参考图编辑和上下文一致性。"
  },
  {
    id: "gptimage",
    provider: "pollinations",
    providerModel: "gptimage",
    label: "GPT Image Mini",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["image"],
    maxReferenceImages: 4,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "使用 Pollinations 免费 Pollen 额度。"
  },
  {
    id: "nano-banana",
    provider: "pollinations",
    providerModel: "nanobanana",
    label: "Nano Banana",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["image"],
    maxReferenceImages: 4,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "可使用 Pollinations 免费 Pollen 额度。"
  },
  {
    id: "nano-banana-2",
    provider: "pollinations",
    providerModel: "nanobanana-2",
    label: "Nano Banana 2",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["image"],
    maxReferenceImages: 4,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "更锐利的图片生成与编辑模型。"
  },
  {
    id: "nano-banana-pro",
    provider: "pollinations",
    providerModel: "nanobanana-pro",
    label: "Nano Banana Pro",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["image"],
    maxReferenceImages: 4,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "支持高分辨率与复杂推理的高级图片模型。"
  },
  {
    id: "gpt-image-2",
    provider: "pollinations",
    providerModel: "gpt-image-2",
    label: "GPT Image 2",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["image"],
    maxReferenceImages: 4,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "高保真图片生成与编辑。"
  },
  {
    id: "seedream",
    provider: "pollinations",
    providerModel: "seedream",
    label: "Seedream 4.0",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["image"],
    maxReferenceImages: 4,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "写实风格图片生成与编辑。"
  },
  {
    id: "ideogram-v4-turbo",
    provider: "pollinations",
    providerModel: "ideogram-v4-turbo",
    label: "Ideogram 4 Turbo",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: false,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "适合海报、Logo 与准确文字排版。"
  },
  {
    id: "wan-fast",
    provider: "pollinations",
    providerModel: "wan-fast",
    label: "Wan 2.2 Fast",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["start-frame", "start-end"],
    maxReferenceImages: 2,
    aspectRatios: videoRatios,
    qualityOptions: ["standard"],
    durationOptions: [5],
    description: "低成本 480p 文生视频和图生视频。"
  },
  {
    id: "seedance-pro",
    provider: "pollinations",
    providerModel: "seedance-pro",
    label: "Seedance Pro Fast",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["start-frame"],
    maxReferenceImages: 1,
    aspectRatios: videoRatios,
    qualityOptions: ["high"],
    durationOptions: [2, 4, 5, 8, 10],
    description: "720p 视频生成，使用免费 Pollen 额度。"
  },
  {
    id: "seedance-2",
    provider: "pollinations",
    providerModel: "seedance-2.0",
    label: "Seedance 2.0",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    supportsAudio: true,
    referenceModes: ["start-frame", "start-end"],
    maxReferenceImages: 2,
    aspectRatios: videoRatios,
    qualityOptions: ["high"],
    durationOptions: [4, 5, 8, 10, 15],
    description: "720p 多模态视频生成，支持原生音频。"
  },
  {
    id: "veo",
    provider: "pollinations",
    providerModel: "veo",
    label: "Veo 3.1 Fast",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    supportsAudio: true,
    referenceModes: ["start-frame", "start-end"],
    maxReferenceImages: 2,
    aspectRatios: videoRatios,
    qualityOptions: ["high"],
    durationOptions: [4, 6, 8],
    description: "支持音频的视频模型，额度消耗较高。"
  },
  {
    id: "ltx-2",
    provider: "pollinations",
    providerModel: "ltx-2",
    label: "LTX 2.3",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["start-frame"],
    maxReferenceImages: 1,
    aspectRatios: videoRatios,
    qualityOptions: ["standard", "high"],
    durationOptions: [5, 10, 15],
    description: "快速低成本视频模型，支持升频。"
  },
  {
    id: "wan-pro",
    provider: "pollinations",
    providerModel: "wan-pro",
    label: "Wan 2.7 Pro",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    supportsAudio: true,
    referenceModes: ["start-frame", "start-end"],
    maxReferenceImages: 2,
    aspectRatios: videoRatios,
    qualityOptions: ["high"],
    durationOptions: [5, 10, 15],
    description: "720p 关键帧视频与音频生成。"
  },
  {
    id: "wan-pro-1080p",
    provider: "pollinations",
    providerModel: "wan-pro-1080p",
    label: "Wan 2.7 Pro 1080p",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    supportsAudio: true,
    referenceModes: ["start-frame", "start-end"],
    maxReferenceImages: 2,
    aspectRatios: videoRatios,
    qualityOptions: ["ultra"],
    durationOptions: [5, 10, 15],
    description: "1080p 关键帧视频与音频生成。"
  },
  {
    id: "p-video-720p",
    provider: "pollinations",
    providerModel: "p-video-720p",
    label: "Pruna Video 720p",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["start-frame"],
    maxReferenceImages: 1,
    aspectRatios: videoRatios,
    qualityOptions: ["high"],
    durationOptions: [5, 10, 15],
    description: "720p 文生视频与图生视频。"
  },
  {
    id: "p-video-1080p",
    provider: "pollinations",
    providerModel: "p-video-1080p",
    label: "Pruna Video 1080p",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["start-frame"],
    maxReferenceImages: 1,
    aspectRatios: videoRatios,
    qualityOptions: ["ultra"],
    durationOptions: [5, 10, 15],
    description: "1080p 文生视频与图生视频。"
  },
  {
    id: "hf-flux",
    provider: "huggingface",
    providerModel: "black-forest-labs/FLUX.1-schnell",
    label: "Hugging Face Flux",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: false,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "使用 Hugging Face 每月免费推理额度。"
  },
  {
    id: "agnes-image-2.0",
    provider: "agnes",
    providerModel: "agnes-image-2.0-flash",
    label: "Agnes Image 2.0 Flash",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["image"],
    maxReferenceImages: 4,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "Agnes AI 快速图片生成模型，支持灵活尺寸。"
  },
  {
    id: "agnes-image-2.1",
    provider: "agnes",
    providerModel: "agnes-image-2.1-flash",
    label: "Agnes Image 2.1 Flash",
    mediaType: "image",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["image"],
    maxReferenceImages: 4,
    aspectRatios: imageRatios,
    qualityOptions: imageQualities,
    description: "Agnes AI 高密度视觉生成模型，适合营销图与复杂构图。"
  },
  {
    id: "agnes-video-2.0",
    provider: "agnes",
    providerModel: "agnes-video-v2.0",
    label: "Agnes Video 2.0",
    mediaType: "video",
    freeTier: true,
    requiresKey: true,
    supportsReference: true,
    referenceModes: ["start-frame", "start-end", "multi-image", "keyframes"],
    maxReferenceImages: 8,
    aspectRatios: agnesVideoRatios,
    qualityOptions: ["standard", "high", "ultra"],
    durationOptions: [3, 5, 10, 18],
    durationOptionsByQuality: {
      standard: [3, 5, 10, 18],
      high: [3, 5, 10],
      ultra: [3, 5]
    },
    description: "Agnes AI 异步视频模型，支持图生视频、多图与关键帧动画。"
  }
];

export function getMediaModel(modelId: string) {
  return mediaModels.find((model) => model.id === modelId);
}

export function isMediaModelAvailable(model: MediaModel) {
  if (!model.requiresKey) {
    return true;
  }

  if (model.provider === "pollinations") {
    return Boolean(process.env.POLLINATIONS_API_KEY);
  }

  if (model.provider === "huggingface") {
    return Boolean(process.env.HUGGINGFACE_API_KEY);
  }

  if (model.provider === "agnes") {
    return Boolean(process.env.AGNES_API_KEY);
  }

  return false;
}
