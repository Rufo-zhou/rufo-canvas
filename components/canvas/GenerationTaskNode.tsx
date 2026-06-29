"use client";

import { type NodeProps } from "@xyflow/react";
import {
  CircleAlert,
  Film,
  ImageIcon,
  Loader2,
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
            <div className="text-center text-slate-700">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-slate-900" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold">{Math.round(progress)}%</p>
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
