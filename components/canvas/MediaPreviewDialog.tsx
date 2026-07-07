"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Crop,
  Download,
  Maximize2,
  Minimize2,
  PenLine,
  SquareDashedMousePointer,
  Type,
  X,
  type LucideIcon
} from "lucide-react";
import type { CanvasMediaEditMode, CanvasNode } from "./types";

export function MediaPreviewDialog({
  node,
  onClose,
  onRename,
  onEdit
}: {
  node: CanvasNode;
  onClose: () => void;
  onRename: (name: string) => void;
  onEdit?: (mode: CanvasMediaEditMode) => void;
}) {
  const data = node.data;
  const mediaType = data.mediaType ?? "image";
  const previewRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(data.label);
  const [immersive, setImmersive] = useState(true);

  useEffect(() => {
    setName(data.label);
  }, [data.label]);

  function commitName() {
    const nextName = name.trim() || "未命名媒体";
    setName(nextName);
    onRename(nextName);
  }

  async function toggleImmersive() {
    const nextImmersive = !immersive;
    setImmersive(nextImmersive);

    if (!nextImmersive) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    await previewRef.current?.requestFullscreen?.().catch(() => undefined);
  }

  function closePreview() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    onClose();
  }

  return (
    <div
      ref={previewRef}
      className={
        immersive
          ? "fixed inset-0 z-[100] flex bg-black p-3"
          : "fixed inset-0 z-[100] flex bg-black/75 p-4 backdrop-blur-sm"
      }
    >
      <button
        type="button"
        title="关闭全屏预览"
        onClick={closePreview}
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        title={immersive ? "退出沉浸预览" : "沉浸预览"}
        onClick={() => void toggleImmersive()}
        className="absolute right-[4.25rem] top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg"
      >
        {immersive ? (
          <Minimize2 className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Maximize2 className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      <div
        className={
          immersive
            ? "m-auto flex h-full w-full items-center justify-center overflow-hidden bg-black"
            : "m-auto grid max-h-full w-full max-w-6xl grid-cols-[minmax(0,1fr)_280px] overflow-hidden rounded-lg bg-white shadow-2xl max-md:grid-cols-1"
        }
      >
        <div className={immersive ? "flex h-full w-full items-center justify-center bg-black" : "flex min-h-[55vh] items-center justify-center bg-black"}>
          {data.assetUrl && mediaType === "video" ? (
            <video
              src={data.assetUrl}
              className={immersive ? "max-h-[96vh] max-w-[96vw]" : "max-h-[82vh] max-w-full"}
              controls
              autoPlay
              loop
              playsInline
            />
          ) : data.assetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.assetUrl}
              alt={data.label}
              className={immersive ? "max-h-[96vh] max-w-[96vw] object-contain" : "max-h-[82vh] max-w-full object-contain"}
            />
          ) : (
            <p className="text-sm text-white/60">媒体不可用</p>
          )}
        </div>

        <aside className={immersive ? "hidden" : "overflow-y-auto p-5"}>
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            媒体属性
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">名称</span>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={commitName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitName();
                    event.currentTarget.blur();
                  }
                }}
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-900"
              />
              <button
                type="button"
                title="保存名称"
                onClick={commitName}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </label>
          <dl className="mt-5 space-y-3 text-xs">
            <Metadata label="类型" value={mediaType === "video" ? "视频" : "图片"} />
            <Metadata label="模型" value={String(data.model ?? "未知")} />
            <Metadata label="比例" value={String(data.aspectRatio ?? "未知")} />
            <Metadata
              label="尺寸"
              value={
                data.width && data.height ? `${data.width} × ${data.height}` : "未知"
              }
            />
            <Metadata label="画质" value={String(data.quality ?? "未知")} />
            {data.durationSeconds ? (
              <Metadata label="时长" value={`${data.durationSeconds} 秒`} />
            ) : null}
          </dl>
          {onEdit ? (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-slate-500">二次编辑</p>
              <div className="grid grid-cols-2 gap-2">
                <PreviewEditButton icon={Crop} label="裁切" onClick={() => { onEdit("crop"); closePreview(); }} />
                <PreviewEditButton icon={PenLine} label="涂鸦" onClick={() => { onEdit("doodle"); closePreview(); }} />
                <PreviewEditButton icon={SquareDashedMousePointer} label="框选" onClick={() => { onEdit("selection"); closePreview(); }} />
                <PreviewEditButton icon={Type} label="文字" onClick={() => { onEdit("text"); closePreview(); }} />
              </div>
            </div>
          ) : null}
          {data.prompt ? (
            <div className="mt-5">
              <p className="mb-1 text-xs font-medium text-slate-500">生成描述</p>
              <p className="rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                {data.prompt}
              </p>
            </div>
          ) : null}
          {data.assetUrl ? (
            <a
              href={data.assetUrl}
              download={data.label}
              className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-slate-950 text-xs font-semibold text-white"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              下载原文件
            </a>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function PreviewEditButton({
  icon: Icon,
  label,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="truncate text-right font-medium text-slate-700">{value}</dd>
    </div>
  );
}
