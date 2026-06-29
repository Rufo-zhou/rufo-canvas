"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Check,
  CircleAlert,
  Film,
  ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { useCanvasNodeActions } from "./CanvasNodeActionsContext";
import type { CanvasNode } from "./types";

export function GenerationTaskNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const actions = useCanvasNodeActions();
  const progress = Math.max(0, Math.min(data.progress ?? 0, 100));
  const status = data.status ?? "pending";
  const failed = status === "failed";
  const completed = status === "completed";
  const draft = status === "draft";
  const MediaIcon = data.mediaType === "video" ? Film : ImageIcon;

  return (
    <div
      className={
        selected
          ? "h-full w-full overflow-hidden rounded-lg border border-slate-950 bg-white shadow-xl ring-2 ring-slate-950/15"
          : "h-full w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-200/60"
      }
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-900"
      />
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
              <MediaIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">
                {data.modelLabel ?? data.model ?? "生成任务"}
              </p>
              <p className="text-[10px] text-slate-400">
                {data.aspectRatio ?? "1:1"} · {data.quality ?? "standard"}
              </p>
            </div>
          </div>
          {failed ? (
            <CircleAlert className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          ) : completed ? (
            <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : draft ? (
            <Sparkles className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          ) : (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" aria-hidden="true" />
          )}
        </div>

        <div
          className={
            failed
              ? "relative mx-3 mt-3 flex min-h-24 items-center justify-center overflow-hidden rounded-md bg-red-50"
              : "relative mx-3 mt-3 flex min-h-24 items-center justify-center overflow-hidden rounded-md bg-slate-100"
          }
          style={{ aspectRatio: aspectRatioCss(data.aspectRatio) }}
        >
          {failed ? (
            <CircleAlert className="h-7 w-7 text-red-400" aria-hidden="true" />
          ) : completed ? (
            <Check className="h-7 w-7 text-emerald-500" aria-hidden="true" />
          ) : draft ? (
            <div className="text-center text-slate-500">
              <Sparkles className="mx-auto h-6 w-6" aria-hidden="true" />
              <p className="mt-2 text-[10px] font-semibold">等待配置</p>
            </div>
          ) : (
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
              <p className="mt-2 text-[10px] font-semibold text-slate-500">
                {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-between p-3">
          <p className="line-clamp-3 text-xs leading-5 text-slate-600">
            {data.prompt || data.label}
          </p>

          <div className="mt-3">
            {failed ? (
              <div className="rounded-md bg-red-50 p-2">
                <p className="text-[11px] font-medium text-red-700">
                  {data.errorMessage ?? "生成失败"}
                </p>
                {data.errorSolution ? (
                  <p className="mt-1 text-[10px] leading-4 text-red-600">
                    {data.errorSolution}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => actions?.onRetryGeneration(id)}
                  className="nodrag mt-2 inline-flex h-7 items-center gap-1 rounded bg-white px-2 text-[10px] font-semibold text-red-700 shadow-sm"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  调整后重试
                </button>
              </div>
            ) : draft ? (
              <button
                type="button"
                onClick={() => actions?.onRetryGeneration(id)}
                className="nodrag inline-flex h-8 w-full items-center justify-center gap-1 rounded-md bg-slate-950 text-[11px] font-semibold text-white"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                配置生成任务
              </button>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-slate-500">
                  <span>{completed ? "已完成" : data.statusLabel ?? "正在生成"}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={
                      completed
                        ? "h-full rounded-full bg-emerald-500 transition-[width]"
                        : "h-full rounded-full bg-blue-600 transition-[width]"
                    }
                    style={{ width: `${completed ? 100 : progress}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-900"
      />
    </div>
  );
}

function aspectRatioCss(value: CanvasNode["data"]["aspectRatio"]) {
  if (!value) {
    return "1 / 1";
  }
  const [width, height] = value.split(":").map(Number);
  return width > 0 && height > 0 ? `${width} / ${height}` : "1 / 1";
}
