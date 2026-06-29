import "server-only";
import sharp from "sharp";
import type { MediaReferenceFit } from "./types";

export type NormalizedGeneratedImage = {
  bytes: Buffer;
  mimeType: "image/webp";
  width: number;
  height: number;
};

export async function normalizeGeneratedImage(
  bytes: Buffer,
  target: { width: number; height: number }
): Promise<NormalizedGeneratedImage> {
  const width = normalizeDimension(target.width);
  const height = normalizeDimension(target.height);
  const result = await sharp(bytes)
    .rotate()
    .resize(width, height, {
      fit: "cover",
      position: "attention"
    })
    .webp({
      quality: 95,
      effort: 4,
      smartSubsample: true
    })
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: result.data,
    mimeType: "image/webp",
    width: result.info.width,
    height: result.info.height
  };
}

export async function prepareReferenceImage(
  bytes: Buffer,
  target: {
    width: number;
    height: number;
    fit: MediaReferenceFit;
  }
) {
  const width = normalizeDimension(target.width);
  const height = normalizeDimension(target.height);

  if (target.fit === "crop") {
    return sharp(bytes)
      .rotate()
      .resize(width, height, {
        fit: "cover",
        position: "attention"
      })
      .webp({ quality: 92, effort: 4 })
      .toBuffer();
  }

  const foreground = await sharp(bytes)
    .rotate()
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 94, effort: 4 })
    .toBuffer();

  if (target.fit === "contain") {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 245, g: 246, b: 248, alpha: 1 }
      }
    })
      .composite([{ input: foreground }])
      .webp({ quality: 94, effort: 4 })
      .toBuffer();
  }

  const background = await sharp(bytes)
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .blur(Math.max(Math.round(Math.min(width, height) / 36), 12))
    .modulate({ brightness: 0.78, saturation: 0.72 })
    .webp({ quality: 88, effort: 3 })
    .toBuffer();

  return sharp(background)
    .composite([{ input: foreground }])
    .webp({ quality: 94, effort: 4 })
    .toBuffer();
}

function normalizeDimension(value: number) {
  return Math.min(Math.max(Math.round(value), 256), 2048);
}
