import type { GenerateImageRequest } from "./types";
import { ImageGenerationError } from "./types";
import { imageGenerationClients } from "./providers";

export async function generateImage(input: GenerateImageRequest) {
  if (process.env.IMAGE_GENERATION_MOCK === "true") {
    return createMockImage(input);
  }

  const client = imageGenerationClients[input.provider];

  if (!client) {
    throw new ImageGenerationError("Unsupported image generation provider.", "PROVIDER_UNSUPPORTED", 400, input.provider);
  }

  return client.generateImage(input);
}

function createMockImage(input: GenerateImageRequest) {
  const width = input.width ?? 1024;
  const height = input.height ?? 1024;
  const title = escapeXml(input.prompt.slice(0, 80));
  const subtitle = input.referenceImageUrl ? "Image-to-image reference attached" : "Text-to-image generation";
  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="${width * 0.12}" y="${height * 0.22}" width="${width * 0.76}" height="${height * 0.56}" rx="32" fill="#ffffff" opacity="0.9"/>
  <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#0f172a">Rufo Mock Image</text>
  <text x="50%" y="52%" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#475569">${escapeXml(subtitle)}</text>
  <text x="50%" y="60%" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#1e293b">${title}</text>
</svg>`;

  return {
    id: crypto.randomUUID(),
    provider: input.provider,
    status: "completed" as const,
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    width,
    height,
    mimeType: "image/svg+xml",
    raw: {
      mock: true,
      prompt: input.prompt,
      referenceImageUrl: input.referenceImageUrl
    }
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
