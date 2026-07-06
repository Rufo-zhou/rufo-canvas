"use client";

import { type NodeProps } from "@xyflow/react";
import {
  CircleAlert,
  Film,
  ImageIcon,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { useCanvasNodeActions } from "./CanvasNodeActionsContext";
import { CanvasConnectionHandle } from "./CanvasConnectionHandle";
import type { CanvasNode } from "./types";

export function GenerationTaskNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const actions = useCanvasNodeActions();
  const progress = Math.max(0, Math.min(data.progress ?? 0, 100));
  const status = data.status ?? "pending";
  const failed = status === "failed";
  const draft = status === "draft";
  const MediaIcon = data.mediaType === "video" ? Film : ImageIcon;

  return (
    <div
      className={
        selected
          ? "group relative h-full w-full overflow-visible ring-2 ring-slate-950 ring-offset-2 ring-offset-[#f7f7f8]"
          : "group relative h-full w-full overflow-visible"
      }
    >
      <CanvasConnectionHandle
        type="target"
        visible={selected}
      />

      <div className="relative h-full w-full overflow-hidden bg-slate-100">
        <div
          className={
            failed
              ? "absolute inset-0 bg-red-50"
              : draft
                ? "absolute inset-0 bg-slate-100"
                : "absolute inset-0 bg-slate-100"
          }
        />

        <div className="absolute inset-0 flex items-center justify-center">
          {failed ? (
            <div className="max-w-[82%] text-center text-red-600">
              <CircleAlert className="mx-auto h-7 w-7" aria-hidden="true" />
              <p className="mt-2 line-clamp-2 text-[11px] font-semibold">
                {data.errorMessage ?? "生成失败"}
              </p>
              {data.errorSolution ? (
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-red-500">
                  {data.errorSolution}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => actions?.onRetryGeneration(id)}
                className="nodrag mt-2 inline-flex h-7 items-center gap-1 rounded bg-white px-2 text-[10px] font-semibold text-red-700 shadow-sm"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                重试
              </button>
            </div>
          ) : draft ? (
            <button
              type="button"
              onClick={() => actions?.onRetryGeneration(id)}
              className="nodrag inline-flex items-center gap-2 rounded-full bg-slate-950/90 px-3 py-2 text-xs font-semibold text-white shadow-lg"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              配置生成
            </button>
          ) : (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center text-slate-700">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,0.22),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.08),transparent_42%,rgba(15,23,42,0.08))]" />
              <div className="rufo-generation-scan absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/75 to-transparent" />
              <div className="relative flex h-16 w-16 items-center justify-center">
                <span className="rufo-generation-orbit absolute h-14 w-14 rounded-full border border-slate-900/10" />
                <span className="rufo-generation-dot absolute h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-lg shadow-cyan-400/50" />
                <Sparkles className="h-6 w-6 text-slate-950" aria-hidden="true" />
              </div>
              <p className="relative mt-3 text-xs font-semibold">
                {data.statusLabel ?? "模型正在生成"}
              </p>
              <p className="relative mt-1 text-[11px] text-slate-500">
                {Math.round(progress)}%
              </p>
              <div className="relative mt-3 flex gap-1.5">
                <span className="rufo-generation-pulse h-1.5 w-1.5 rounded-full bg-slate-900" />
                <span className="rufo-generation-pulse h-1.5 w-1.5 rounded-full bg-slate-900 [animation-delay:140ms]" />
                <span className="rufo-generation-pulse h-1.5 w-1.5 rounded-full bg-slate-900 [animation-delay:280ms]" />
              </div>
            </div>
          )}
        </div>

        {!failed && !draft ? (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/10">
            <div
              className="h-full bg-slate-950 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}

        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm backdrop-blur">
          <MediaIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{data.aspectRatio ?? "1:1"}</span>
        </div>
      </div>

      <CanvasConnectionHandle
        type="source"
        visible={selected}
      />
    </div>
  );
}
