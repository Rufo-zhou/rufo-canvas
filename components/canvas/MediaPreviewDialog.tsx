"use client";

import { useEffect, useState } from "react";
import { Check, Download, Maximize2, X } from "lucide-react";
import type { CanvasNode } from "./types";

export function MediaPreviewDialog({
  node,
  onClose,
  onRename
}: {
  node: CanvasNode;
  onClose: () => void;
  onRename: (name: string) => void;
}) {
  const data = node.data;
  const mediaType = data.mediaType ?? "image";
  const [name, setName] = useState(data.label);

  useEffect(() => {
    setName(data.label);
  }, [data.label]);

  function commitName() {
    const nextName = name.trim() || "未命名媒体";
    setName(nextName);
    onRename(nextName);
  }

  return (
    <div className="fixed inset-0 z-[100] flex bg-black/75 p-4 backdrop-blur-sm">
      <button
        type="button"
        title="关闭全屏预览"
        onClick={onClose}
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="m-auto grid max-h-full w-full max-w-6xl grid-cols-[minmax(0,1fr)_280px] overflow-hidden rounded-lg bg-white shadow-2xl max-md:grid-cols-1">
        <div className="flex min-h-[55vh] items-center justify-center bg-black">
          {data.assetUrl && mediaType === "video" ? (
            <video
              src={data.assetUrl}
              className="max-h-[82vh] max-w-full"
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
              className="max-h-[82vh] max-w-full object-contain"
            />
          ) : (
            <p className="text-sm text-white/60">媒体不可用</p>
          )}
        </div>

        <aside className="overflow-y-auto p-5">
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

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="truncate text-right font-medium text-slate-700">{value}</dd>
    </div>
  );
}
