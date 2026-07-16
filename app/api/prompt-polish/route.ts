import { NextResponse } from "next/server";
import { z } from "zod";
import { optimizeSeedanceVideoPrompt } from "@/lib/prompt/seedance-video";

const promptPolishSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  mediaType: z.enum(["image", "video"]).default("image"),
  aspectRatio: z.string().trim().max(12).optional(),
  quality: z.string().trim().max(24).optional(),
  modelId: z.string().trim().max(80).optional(),
  modelLabel: z.string().trim().max(120).optional(),
  referenceMode: z.string().trim().max(40).optional(),
  referenceFit: z.string().trim().max(40).optional(),
  durationSeconds: z.number().int().min(1).max(120).optional(),
  audio: z.boolean().optional(),
  optimizationMode: z.enum(["general", "seedance-video"]).default("general")
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

  if (isSeedanceVideoPolish(parsed.data) && !process.env.POLLINATIONS_API_KEY) {
    return NextResponse.json({
      data: {
        prompt: fallback,
        provider: "seedance-local"
      }
    });
  }

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
      max_tokens: isSeedanceVideoPolish(input) ? 760 : 420,
      messages: [
        {
          role: "system",
          content:
            isSeedanceVideoPolish(input)
              ? "你是 Seedance 2.0 视频提示词导演。你把用户想法改写成可执行的视频提示词：意图明确、镜头有动机、动作有节奏、光线有目的、参考素材不变形。只输出最终提示词，不解释，不要 Markdown。"
              : "你是专业的视觉生成提示词编辑器。只输出一段可直接用于图片生成的中文提示词，不要解释，不要 Markdown。"
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
  if (isSeedanceVideoPolish(input)) {
    return buildSeedancePolishInstruction(input);
  }

  const mediaInstruction = "强化主体、构图、光线、材质、细节、风格和画面层次。";
  const referenceInstruction =
    input.referenceMode && input.referenceMode !== "none"
      ? "需要明确保留参考素材的主体特征，并说明如何适配目标比例。"
      : "不要虚构参考图。";

  return [
    `原始提示词：${input.prompt}`,
    "媒体类型：图片",
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

function buildSeedancePolishInstruction(input: PromptPolishInput) {
  const fallback = optimizeSeedanceVideoPrompt(input);

  return [
    "请把原始想法改写为可直接用于 Seedance 2.0 的视频生成提示词。",
    "必须遵守：先明确创作意图，再补充主体与场景、视觉风格、镜头语言、动作编排、光线色彩、时间节奏、参考素材处理和技术约束。",
    "不要输出泛泛的“电影感大片”“超高质量”等空词；每个镜头、动作和光线描述都必须服务于用户原意。",
    "不要写 Markdown，不要解释，只输出最终提示词。",
    `原始提示词：${input.prompt}`,
    input.modelLabel ? `目标模型：${input.modelLabel}` : null,
    input.aspectRatio ? `画面比例：${input.aspectRatio}` : null,
    input.quality ? `画质：${input.quality}` : null,
    input.durationSeconds ? `视频时长：${input.durationSeconds} 秒` : null,
    input.audio ? "需要音频：是" : "需要音频：否",
    input.referenceMode && input.referenceMode !== "none"
      ? `参考模式：${input.referenceMode}；比例适配：${input.referenceFit ?? "outpaint"}。必须说明如何保持参考素材主体比例，不允许挤压变形。`
      : "无参考素材：不要虚构参考图内容。",
    "如果外部语言模型不稳定，可参考以下本地结构，但请根据用户原意进一步精炼：",
    fallback
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

  if (isSeedanceVideoPolish(input)) {
    return optimizeSeedanceVideoPrompt(input);
  }

  return `${trimmed}${ratio}${quality}，主体明确，构图干净，光线自然，材质细节丰富，层次清晰，色彩协调，真实景深，高质量商业视觉，避免畸变、模糊和多余元素。`;
}

function isSeedanceVideoPolish(input: PromptPolishInput) {
  return input.mediaType === "video" || input.optimizationMode === "seedance-video";
}
