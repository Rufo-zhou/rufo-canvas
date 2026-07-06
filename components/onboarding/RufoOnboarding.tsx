"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Layers3,
  MousePointer2,
  Sparkles,
  WandSparkles,
  X
} from "lucide-react";

const ONBOARDING_STORAGE_KEY = "rufo.onboarding.completed.v1";
const OPEN_ONBOARDING_EVENT = "rufo:open-onboarding";

export function openRufoOnboarding() {
  window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT));
}

export function RufoOnboarding() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const completed = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      setOpen(true);
    }

    function handleOpen() {
      setOpen(true);
    }

    window.addEventListener(OPEN_ONBOARDING_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, handleOpen);
  }, []);

  function close(markCompleted: boolean) {
    if (markCompleted) {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    }
    setOpen(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rufo-onboarding-title"
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Rufo 新手教程
            </span>
            <h2 id="rufo-onboarding-title" className="mt-3 text-2xl font-semibold text-slate-950">
              三分钟掌握无限画布生成流程
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              登录后可以从首页创建项目，也可以在画布里框选、打组、拖动素材，并通过右侧 Agent 调用图片或视频模型。
            </p>
          </div>
          <button
            type="button"
            title="关闭教程"
            onClick={() => close(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <GuideStep
            icon={WandSparkles}
            title="从首页开始"
            body="输入一句创作想法，或打开流程/模板详情，Rufo 会创建项目并带着提示词进入画布。"
          />
          <GuideStep
            icon={MousePointer2}
            title="框选与移动"
            body="在画布空白处拖拽可以框选多个节点；拖动选中的任意节点会整体移动。按住空格可平移画布。"
          />
          <GuideStep
            icon={Layers3}
            title="打组管理"
            body="选中两个以上节点后，顶部会出现批量工具条，可复制、删除、打组或取消打组。"
          />
          <GuideStep
            icon={CheckCircle2}
            title="生成与历史"
            body="右侧 Agent 支持模型、比例、画质、参考图和历史记录；生成结果会自动放回画布。"
          />
        </div>

        <footer className="flex flex-col gap-2 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => close(false)}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            稍后再看
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className="h-10 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            开始使用 Rufo
          </button>
        </footer>
      </section>
    </div>
  );
}

function GuideStep({
  icon: Icon,
  title,
  body
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-950 shadow-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-600">{body}</p>
    </article>
  );
}
