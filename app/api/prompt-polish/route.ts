import { NextResponse } from "next/server";
import { z } from "zod";

const promptPolishSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  mediaType: z.enum(["image", "video"]).default("image"),
  aspectRatio: z.string().trim().max(12).optional(),
  quality: z.string().trim().max(24).optional(),
  modelLabel: z.string().trim().max(120).optional(),
  referenceMode: z.string().trim().max(40).optional()
});

type PromptPolishInput = z.infer<typeof promptPolishSchema>;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = promptPolishSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "请输入需要润色的提示词。"
        }
      },
      { status: 400 }
    );
  }

  const fallback = localPolishPrompt(parsed.data);

  try {
    const polished = await polishWithTextModel(parsed.data);
    return NextResponse.json({
      data: {
        prompt: polished || fallback,
        provider: polished ? "pollinations-text" : "local"
      }
    });
  } catch {
    return NextResponse.json({
      data: {
        prompt: fallback,
        provider: "local"
      }
    });
  }
}

async function polishWithTextModel(input: PromptPolishInput) {
  const response = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.POLLINATIONS_API_KEY
        ? { Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}` }
        : {})
    },
    body: JSON.stringify({
      model: "openai",
      stream: false,
      temperature: 0.7,
      max_tokens: 420,
      messages: [
        {
          role: "system",
          content:
            "你是专业的视觉生成提示词编辑器。只输出一段可直接用于图片或视频生成的中文提示词，不要解释，不要 Markdown。"
        },
        {
          role: "user",
          content: buildPolishInstruction(input)
        }
      ]
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      }
    | null;
  return cleanPolishedPrompt(json?.choices?.[0]?.message?.content);
}

function buildPolishInstruction(input: PromptPolishInput) {
  const mediaInstruction =
    input.mediaType === "video"
      ? "强化主体动作、镜头运动、节奏、光线、场景连续性和视频质感。"
      : "强化主体、构图、光线、材质、细节、风格和画面层次。";
  const referenceInstruction =
    input.referenceMode && input.referenceMode !== "none"
      ? "需要明确保留参考素材的主体特征，并说明如何适配目标比例。"
      : "不要虚构参考图。";

  return [
    `原始提示词：${input.prompt}`,
    `媒体类型：${input.mediaType === "video" ? "视频" : "图片"}`,
    input.modelLabel ? `目标模型：${input.modelLabel}` : null,
    input.aspectRatio ? `目标比例：${input.aspectRatio}` : null,
    input.quality ? `画质：${input.quality}` : null,
    mediaInstruction,
    referenceInstruction,
    "请保留用户核心意图，补充必要的视觉细节，避免过度扩写，最终控制在 120 到 220 个中文字符。"
  ]
    .filter(Boolean)
    .join("\n");
}

function cleanPolishedPrompt(value: string | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/^```[\s\S]*?\n/, "")
    .replace(/```$/g, "")
    .replace(/^["“]|["”]$/g, "")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

function localPolishPrompt(input: PromptPolishInput) {
  const trimmed = input.prompt.trim();
  const ratio = input.aspectRatio ? `，${input.aspectRatio} 构图` : "";
  const quality =
    input.quality === "ultra"
      ? "，超高清细节"
      : input.quality === "high"
        ? "，高清质感"
        : "";

  if (input.mediaType === "video") {
    return `${trimmed}${ratio}${quality}，主体动作清晰，镜头运动自然，光线稳定，画面连贯，节奏流畅，电影感色彩，真实景深，避免畸变、闪烁和低清画质。`;
  }

  return `${trimmed}${ratio}${quality}，主体明确，构图干净，光线自然，材质细节丰富，层次清晰，色彩协调，真实景深，高质量商业视觉，避免畸变、模糊和多余元素。`;
}
