export type SeedanceVideoPromptInput = {
  prompt: string;
  aspectRatio?: string;
  quality?: string;
  modelLabel?: string;
  referenceMode?: string;
  referenceFit?: string;
  durationSeconds?: number;
  audio?: boolean;
};

type PromptProfile = {
  intent: string;
  visualStyle: string;
  camera: string;
  motion: string;
  lighting: string;
};

const ratioGuidance: Record<string, string> = {
  "1:1": "1:1 方形画幅，主体居中但保留四周安全空间，不能拉伸或挤压主体",
  "4:3": "4:3 经典画幅，主体比例稳定，同时保留适量环境信息",
  "3:4": "3:4 竖向画幅，突出主体高度，头顶和底部留白自然",
  "3:2": "3:2 编辑感画幅，横向留白自然，主体尺度不变形",
  "2:3": "2:3 竖向画幅，适合全身人物或产品优先构图",
  "16:9": "16:9 宽屏画幅，前景、中景、背景层次清晰，主体不能被横向拉伸",
  "9:16": "9:16 竖屏社媒画幅，主体保持在手机安全区域内，动作不出画",
  "21:9": "21:9 超宽画幅，使用环境扩展形成横向空间，不拉宽主体"
};

const qualityGuidance: Record<string, string> = {
  standard: "高清细节干净，运动稳定，不使用生硬锐化",
  high: "高分辨率质感，边缘稳定，高光受控，具备商业成片观感",
  ultra: "超清纹理，光线过渡细腻，微细节稳定，具备高端制作完成度"
};

export function optimizeSeedanceVideoPrompt(input: SeedanceVideoPromptInput) {
  const basePrompt = input.prompt.trim();
  const duration = clampDuration(input.durationSeconds);
  const profile = buildProfile(basePrompt);
  const ratio = ratioGuidance[input.aspectRatio ?? ""] ?? "composition must match the selected canvas aspect ratio without stretching or squeezing the subject";
  const quality = qualityGuidance[input.quality ?? ""] ?? "stable detail and clean visual quality";
  const reference = buildReferenceGuidance(input.referenceMode, input.referenceFit);
  const beats = buildTemporalBeats(duration, profile);
  const audio = input.audio
    ? "音频方向：加入轻微环境声来支撑动作；如果需要对白，保持短句、自然口吻，并与口型同步。"
    : "音频方向：不需要对白；让画面动作、环境氛围和节奏本身完成表达。";

  return [
    "Seedance 2.0 视频提示词：",
    `创作意图：${profile.intent}`,
    `主体与场景：${basePrompt}`,
    `视觉风格：${profile.visualStyle}`,
    `镜头语言：${profile.camera}`,
    `动作编排：${profile.motion}`,
    `光线与色彩：${profile.lighting}`,
    `时间结构（${duration} 秒）：${beats}`,
    reference,
    audio,
    `技术要求：${ratio}；${quality}；保持主体身份、物体几何、手部、文字和 Logo 稳定；避免扭曲、闪烁、随机切镜、重复肢体、融化边缘和参考素材被强行拉伸。`
  ].join("\n");
}

function buildProfile(prompt: string): PromptProfile {
  const normalized = prompt.toLowerCase();

  if (matches(normalized, ["产品", "商品", "电商", "广告", "品牌", "瓶", "鞋", "包", "手机", "product", "commercial", "brand"])) {
    return {
      intent: "让产品在第一秒就显得可理解、可触摸、有购买欲，并让卖点自然成立。",
      visualStyle: "高端商业写实风格，反光受控，表面干净，主体层级明确。",
      camera: "使用有动机的慢速推进或约 20 度弧形移动，先揭示材质细节，再停在主要卖点角度。",
      motion: "产品几何保持锁定，辅助元素轻微运动，用来展示尺度、质感或使用场景。",
      lighting: "柔和主光配合轻微轮廓光，反射受控，阴影自然，色彩克制。"
    };
  }

  if (matches(normalized, ["人物", "角色", "女孩", "男孩", "人像", "演员", "portrait", "character", "person", "woman", "man"])) {
    return {
      intent: "通过可读的表情、姿态和环境传达人物情绪与身份。",
      visualStyle: "自然写实视频质感，皮肤纹理真实，服装细节统一，景深可信。",
      camera: "从中景开始，只有当表情或动作带来新信息时才逐步靠近。",
      motion: "安排一个清晰的连续身体动作，手部稳定，脸部身份一致，姿态不突然跳变。",
      lighting: "有来源的柔和侧光，面部对比温和，肤色稳定，背景与主体分离。"
    };
  }

  if (matches(normalized, ["转场", "首尾帧", "变化", "变成", "过渡", "transition", "transform", "start frame", "end frame"])) {
    return {
      intent: "让转场从起始状态到最终状态都可追踪、顺滑且有明确目的。",
      visualStyle: "视觉连续性干净，尺度、镜头感和环境逻辑在变化中保持一致。",
      camera: "保持稳定镜头路径，让变化过程被看见，而不是用切镜隐藏。",
      motion: "用连续的因果动作推动变化，保留主体轮廓和关键视觉锚点。",
      lighting: "光线方向和色温保持一致，只在最终揭示处做可控强调。"
    };
  }

  if (matches(normalized, ["风景", "城市", "建筑", "自然", "海", "山", "street", "city", "landscape", "architecture", "nature"])) {
    return {
      intent: "通过尺度、氛围和一个有记忆点的运动，让观众理解这个地点。",
      visualStyle: "真实旅行短片质感，空间层次明确，环境纹理清晰。",
      camera: "通过前景元素做缓慢横移或轻推进，形成视差并揭示空间。",
      motion: "环境运动符合物理规律，人物、风、水、交通或光影变化速度自然。",
      lighting: "符合时间段的自然光，曝光稳定，阴影方向统一，色彩服务场景情绪。"
    };
  }

  return {
    intent: "把想法变成一个清晰短视频瞬间：一个可读主体、一个有目的动作、一个有记忆点的结束画面。",
    visualStyle: "写实视频质感，纹理具体，背景细节受控，视觉层级干净。",
    camera: "使用能揭示新信息的有动机运镜，避免随机移动，构图保持稳定。",
    motion: "主体完成一个连续动作，节奏可信，尺度一致，不出现突然瞬移。",
    lighting: "自然且有来源的光线，曝光稳定，空间深度清楚，色彩对比服务主体。"
  };
}

function buildTemporalBeats(duration: number, profile: PromptProfile) {
  if (duration <= 4) {
    return `0-1 秒建立主体与场景；1-3 秒配合“${profile.camera}”完成主要动作；最后 1 秒停在干净稳定的结束画面。`;
  }

  if (duration <= 6) {
    return `0-1 秒建立视觉钩子；1-${duration - 1} 秒用有控制的镜头动机发展主体动作；${duration - 1}-${duration} 秒沉淀到有记忆点的最终构图。`;
  }

  if (duration <= 8) {
    return `0-2 秒建立主体、场景和情绪；2-5 秒揭示关键动作或产品细节；5-${duration} 秒放慢运动并保留可用的结束帧。`;
  }

  return `0-2 秒建立语境；2-6 秒用一个连续运动推进主要动作；6-${Math.max(7, duration - 2)} 秒加入次级细节或揭示；最后 2 秒停在完整的结束画面。`;
}

function buildReferenceGuidance(referenceMode?: string, referenceFit?: string) {
  const fit =
    referenceFit === "crop"
      ? "只裁切可舍弃背景来适配画幅，绝不挤压主体。"
      : referenceFit === "contain"
        ? "完整保留参考主体，通过自然留白或环境扩展适配画幅。"
        : "自然扩展周围环境来适配目标比例，主体比例保持不变。";

  if (!referenceMode || referenceMode === "none") {
    return "参考素材处理：没有提供参考素材时，不虚构参考图细节，只根据文字概念建立主体和场景。";
  }

  if (referenceMode === "start-frame") {
    return `参考素材处理：把参考图作为开场身份和构图锚点；${fit}`;
  }

  if (referenceMode === "start-end") {
    return `参考素材处理：从首帧保持主体身份，通过可见的连续运动到达尾帧构图；${fit}`;
  }

  if (referenceMode === "multi-image" || referenceMode === "keyframes") {
    return `参考素材处理：把多张参考作为关键视觉锚点，保留共同身份特征，并在它们之间平滑插值运动；${fit}`;
  }

  return `参考素材处理：保留参考主体、材质和关键几何关系，同时适配目标视频画幅；${fit}`;
}

function clampDuration(duration?: number) {
  if (!duration || Number.isNaN(duration)) {
    return 5;
  }

  return Math.min(Math.max(Math.round(duration), 1), 120);
}

function matches(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}
