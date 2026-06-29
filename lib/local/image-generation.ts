import type { GeneratedCanvasMedia } from "@/components/canvas/types";

export async function generateLocalImage(
  prompt: string,
  providerModel: string,
  dimensions: { width: number; height: number },
  referenceFile?: File | null
): Promise<GeneratedCanvasMedia> {
  const { width, height } = dimensions;
  const referenceLabel = referenceFile ? `参考图：${escapeXml(referenceFile.name)}` : "文字生图";
  const safePrompt = escapeXml(prompt.slice(0, 120));
  const accent = providerModel === "flux" ? "#e9ff70" : "#8fd3ff";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#f4f4f1"/>
      <rect x="${width * 0.07}" y="${height * 0.07}" width="${width * 0.86}" height="${height * 0.86}" rx="28" fill="#ffffff" stroke="#d9d9d4" stroke-width="4"/>
      <rect x="${width * 0.11}" y="${height * 0.11}" width="${Math.min(width * 0.32, 260)}" height="52" rx="26" fill="${accent}"/>
      <text x="${width * 0.11 + Math.min(width * 0.32, 260) / 2}" y="${height * 0.11 + 34}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111111">${escapeXml(providerModel)}</text>
      <text x="${width * 0.11}" y="${height * 0.27}" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#111111">Rufo Mock Generation</text>
      <foreignObject x="${width * 0.11}" y="${height * 0.32}" width="${width * 0.78}" height="${height * 0.4}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:clamp(24px,4vw,42px);line-height:1.35;color:#1b1b1b;overflow-wrap:anywhere">${safePrompt}</div>
      </foreignObject>
      <text x="${width * 0.11}" y="${height * 0.86}" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">${referenceLabel}</text>
      <text x="${width * 0.89}" y="${height * 0.86}" text-anchor="end" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">本地演示模式</text>
    </svg>`;

  await new Promise((resolve) => window.setTimeout(resolve, 350));

  return {
    assetId: crypto.randomUUID(),
    assetUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    prompt,
    provider: "pollinations-free",
    model: providerModel,
    mediaType: "image",
    mimeType: "image/svg+xml",
    width,
    height
  };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
