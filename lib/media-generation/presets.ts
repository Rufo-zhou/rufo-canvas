import type {
  MediaAspectRatio,
  MediaQuality,
  MediaType
} from "./types";

export type MediaPreset = {
  value: MediaAspectRatio;
  label: string;
};

export const imageAspectRatioPresets: MediaPreset[] = [
  { value: "1:1", label: "方形" },
  { value: "4:3", label: "横版" },
  { value: "3:4", label: "竖版" },
  { value: "3:2", label: "摄影横版" },
  { value: "2:3", label: "摄影竖版" },
  { value: "16:9", label: "宽屏" },
  { value: "9:16", label: "手机竖屏" },
  { value: "21:9", label: "超宽屏" }
];

export const videoAspectRatioPresets: MediaPreset[] = [
  { value: "16:9", label: "横屏" },
  { value: "9:16", label: "竖屏" },
  { value: "1:1", label: "方形" },
  { value: "4:3", label: "传统横版" },
  { value: "3:4", label: "传统竖版" }
];

export const qualityLabels: Record<MediaQuality, string> = {
  standard: "标准",
  high: "高清",
  ultra: "超清"
};

export function qualityResolutionLabel(
  mediaType: MediaType,
  quality: MediaQuality
) {
  if (mediaType === "video") {
    return quality === "standard" ? "480p" : quality === "high" ? "720p" : "1080p";
  }

  return quality === "standard" ? "约 1K" : quality === "high" ? "约 1.5K" : "约 2K";
}

export function resolveMediaDimensions(
  mediaType: MediaType,
  aspectRatio: MediaAspectRatio,
  quality: MediaQuality
) {
  if (mediaType === "video") {
    return videoDimensions[quality][aspectRatio];
  }

  return imageDimensions[quality][aspectRatio];
}

const imageDimensions: Record<
  MediaQuality,
  Record<MediaAspectRatio, { width: number; height: number }>
> = {
  standard: {
    "1:1": { width: 1024, height: 1024 },
    "4:3": { width: 1152, height: 864 },
    "3:4": { width: 864, height: 1152 },
    "3:2": { width: 1152, height: 768 },
    "2:3": { width: 768, height: 1152 },
    "16:9": { width: 1280, height: 720 },
    "9:16": { width: 720, height: 1280 },
    "21:9": { width: 1344, height: 576 }
  },
  high: {
    "1:1": { width: 1536, height: 1536 },
    "4:3": { width: 1536, height: 1152 },
    "3:4": { width: 1152, height: 1536 },
    "3:2": { width: 1536, height: 1024 },
    "2:3": { width: 1024, height: 1536 },
    "16:9": { width: 1536, height: 864 },
    "9:16": { width: 864, height: 1536 },
    "21:9": { width: 1792, height: 768 }
  },
  ultra: {
    "1:1": { width: 2048, height: 2048 },
    "4:3": { width: 2048, height: 1536 },
    "3:4": { width: 1536, height: 2048 },
    "3:2": { width: 2048, height: 1365 },
    "2:3": { width: 1365, height: 2048 },
    "16:9": { width: 2048, height: 1152 },
    "9:16": { width: 1152, height: 2048 },
    "21:9": { width: 2048, height: 878 }
  }
};

const videoDimensions: Record<
  MediaQuality,
  Record<MediaAspectRatio, { width: number; height: number }>
> = {
  standard: {
    "1:1": { width: 480, height: 480 },
    "4:3": { width: 640, height: 480 },
    "3:4": { width: 480, height: 640 },
    "3:2": { width: 720, height: 480 },
    "2:3": { width: 480, height: 720 },
    "16:9": { width: 854, height: 480 },
    "9:16": { width: 480, height: 854 },
    "21:9": { width: 1120, height: 480 }
  },
  high: {
    "1:1": { width: 720, height: 720 },
    "4:3": { width: 960, height: 720 },
    "3:4": { width: 720, height: 960 },
    "3:2": { width: 1152, height: 768 },
    "2:3": { width: 768, height: 1152 },
    "16:9": { width: 1280, height: 720 },
    "9:16": { width: 720, height: 1280 },
    "21:9": { width: 1680, height: 720 }
  },
  ultra: {
    "1:1": { width: 1080, height: 1080 },
    "4:3": { width: 1440, height: 1080 },
    "3:4": { width: 1080, height: 1440 },
    "3:2": { width: 1620, height: 1080 },
    "2:3": { width: 1080, height: 1620 },
    "16:9": { width: 1920, height: 1080 },
    "9:16": { width: 1080, height: 1920 },
    "21:9": { width: 2048, height: 878 }
  }
};
