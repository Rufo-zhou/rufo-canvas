import type { MediaGenerationProvider } from "./types";

export type GenerationErrorInfo = {
  code: string;
  message: string;
  solution: string;
  provider?: MediaGenerationProvider | string;
};

export function getGenerationErrorInfo(input: {
  code?: string;
  message?: string | null;
  provider?: MediaGenerationProvider | string;
}): GenerationErrorInfo {
  const code = input.code ?? "GENERATION_FAILED";
  const raw = input.message?.trim() ?? "";
  const normalized = raw.toLowerCase();
  const providerName = providerLabel(input.provider);

  if (
    code === "PROVIDER_BALANCE_REQUIRED" ||
    normalized.includes("insufficient balance") ||
    normalized.includes("payment_required") ||
    normalized.includes("余额不足")
  ) {
    return {
      code: "PROVIDER_BALANCE_REQUIRED",
      message: `${providerName}账户余额不足，任务未能开始。`,
      solution: "前往供应商控制台补充额度，或切换到有余额的模型后重新生成。",
      provider: input.provider
    };
  }

  if (
    code === "PROVIDER_AUTH_ERROR" ||
    normalized.includes("unauthorized") ||
    normalized.includes("invalid api key") ||
    normalized.includes("invalid token") ||
    normalized.includes("authentication") ||
    normalized.includes("密钥无效") ||
    normalized.includes("鉴权失败")
  ) {
    return {
      code: "PROVIDER_AUTH_ERROR",
      message: `${providerName}密钥无效、已过期或没有模型权限。`,
      solution: "打开“自助接入 API”，更新密钥并确认该账号已获得所选模型权限。",
      provider: input.provider
    };
  }

  if (
    code === "PROVIDER_RATE_LIMITED" ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("quota exceeded") ||
    normalized.includes("请求过多") ||
    normalized.includes("额度已达到")
  ) {
    return {
      code: "PROVIDER_RATE_LIMITED",
      message: `${providerName}当前请求过多或额度已达到上限。`,
      solution: "等待几分钟后重试，降低画质或时长，或更换其他模型。",
      provider: input.provider
    };
  }

  if (
    code === "PROVIDER_NETWORK_ERROR" ||
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("econn") ||
    normalized.includes("socket") ||
    normalized.includes("无法连接")
  ) {
    return {
      code: "PROVIDER_NETWORK_ERROR",
      message: `暂时无法连接${providerName}服务。`,
      solution: "检查网络后重试。异步视频任务可在“历史记录”中查看，避免重复提交。",
      provider: input.provider
    };
  }

  if (
    code === "PROVIDER_TEMPORARY_ERROR" ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("service unavailable") ||
    normalized.includes("bad gateway") ||
    normalized.includes("暂时不可用")
  ) {
    return {
      code: "PROVIDER_TEMPORARY_ERROR",
      message: `${providerName}服务暂时不可用。`,
      solution: "稍后重试，或切换其他模型继续创作。",
      provider: input.provider
    };
  }

  if (
    code === "DURATION_UNSUPPORTED" ||
    normalized.includes("num_frames") ||
    normalized.includes("max frames") ||
    normalized.includes("duration")
  ) {
    return {
      code: "DURATION_UNSUPPORTED",
      message: "当前画质不支持所选视频时长。",
      solution: "缩短视频时长或降低画质后重新生成。",
      provider: input.provider
    };
  }

  if (
    code === "ASPECT_RATIO_UNSUPPORTED" ||
    normalized.includes("aspect ratio") ||
    normalized.includes("ratio is not supported")
  ) {
    return {
      code: "ASPECT_RATIO_UNSUPPORTED",
      message: "当前模型不支持所选画面比例。",
      solution: "选择模型支持的比例，或切换 Agnes Video 等支持更多比例的模型。",
      provider: input.provider
    };
  }

  if (
    code === "PROVIDER_CONFIG_MISSING" ||
    normalized.includes("api key") ||
    normalized.includes("missing credential")
  ) {
    return {
      code: "PROVIDER_CONFIG_MISSING",
      message: `${providerName}尚未配置 API 密钥。`,
      solution: "打开右上角“自助接入 API”，填写对应供应商密钥后保存。",
      provider: input.provider
    };
  }

  if (code === "DAILY_QUOTA_EXCEEDED") {
    return {
      code,
      message: raw || "今日共享模型生成次数已用完。",
      solution: "明天再试，或在“自助接入 API”中使用自己的供应商密钥。",
      provider: input.provider
    };
  }

  if (code === "UNAUTHENTICATED") {
    return {
      code,
      message: "登录状态已失效。",
      solution: "重新登录 Rufo 后再次提交任务。",
      provider: input.provider
    };
  }

  return {
    code,
    message:
      raw && !looksLikeTechnicalError(raw)
        ? raw
        : "生成任务失败，供应商没有返回可直接理解的原因。",
    solution: "检查 API 密钥、账户余额和模型参数；仍失败时可切换模型后重试。",
    provider: input.provider
  };
}

function providerLabel(provider?: string) {
  const labels: Record<string, string> = {
    agnes: "Agnes AI",
    pollinations: "Pollinations",
    "pollinations-free": "公共图片模型",
    huggingface: "Hugging Face",
    "nano-banana": "Nano Banana",
    gptlmage2: "GPT Image"
  };

  return provider ? labels[provider] ?? provider : "模型供应商";
}

function looksLikeTechnicalError(message: string) {
  return (
    message.length > 180 ||
    /[{}[\]\\]/.test(message) ||
    /\b(error|exception|stack|status|litellm|openai)\b/i.test(message)
  );
}
