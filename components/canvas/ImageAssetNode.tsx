"use client";

import { useEffect, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import {
  Check,
  Copy,
  Crop,
  Download,
  GripHorizontal,
  Maximize2,
  PenLine,
  Sparkles,
  SquareDashedMousePointer,
  Trash2,
  Type
} from "lucide-react";
import { useCanvasNodeActions } from "./CanvasNodeActionsContext";
import { CanvasConnectionHandle } from "./CanvasConnectionHandle";
import type { CanvasNode } from "./types";

export function ImageAssetNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const actions = useCanvasNodeActions();
  const assetUrl = data.assetUrl;
  const mediaType = data.mediaType ?? "image";
  const objectFitClass = data.objectFit === "cover" ? "object-cover" : "object-contain";
  const [name, setName] = useState(data.label);

  useEffect(() => {
    setName(data.label);
  }, [data.label]);

  function commitName() {
    const nextName = name.trim() || "未命名媒体";
    setName(nextName);
    actions?.onRename(id, nextName);
  }

  return (
    <div
      className={
        selected
          ? "group relative h-full w-full overflow-visible ring-2 ring-slate-950 ring-offset-2 ring-offset-[#f7f7f8]"
          : "group relative h-full w-full overflow-visible"
      }
    >
      <NodeResizer
        color="#0f172a"
        isVisible={selected}
        keepAspectRatio={data.resizeMode !== "free"}
        minWidth={160}
        minHeight={120}
        onResizeStart={() => actions?.onBeforeTransform()}
        onResizeEnd={() => actions?.onTransformEnd()}
        handleClassName="!h-2.5 !w-2.5 !border !border-white"
      />
      {selected ? (
        <div className="nodrag absolute -top-12 left-1/2 z-20 flex max-w-[min(620px,96vw)] -translate-x-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-xl">
          <input
            value={name}
            aria-label="媒体名称"
            title="编辑媒体名称"
            onChange={(event) => setName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitName();
                event.currentTarget.blur();
              }
            }}
            className="nodrag h-8 w-36 rounded border-0 bg-transparent px-2 text-[11px] font-medium text-slate-600 outline-none focus:bg-slate-50"
          />
          <button
            type="button"
            title="保存名称"
            onClick={commitName}
            className="flex h-8 w-8 items-center justify-center rounded text-emerald-600 hover:bg-emerald-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title={data.objectFit === "cover" ? "恢复完整适应" : "裁切"}
            onClick={() => actions?.onEditMedia(id, "crop")}
            className={
              data.objectFit === "cover"
                ? "flex h-8 w-8 items-center justify-center rounded bg-slate-950 text-white"
                : "flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
            }
          >
            <Crop className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="涂鸦"
            onClick={() => actions?.onEditMedia(id, "doodle")}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="框选"
            onClick={() => actions?.onEditMedia(id, "selection")}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          >
            <SquareDashedMousePointer className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="添加文字"
            onClick={() => actions?.onEditMedia(id, "text")}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          >
            <Type className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="全屏预览"
            onClick={() => actions?.onOpenPreview(id)}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="作为参考继续生成"
            onClick={() => actions?.onUseAsReference(id)}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            title="复制"
            onClick={() => actions?.onDuplicate(id)}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
          {assetUrl ? (
            <a
              href={assetUrl}
              download={data.label}
              title="下载"
              className="flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            title="删除"
            onClick={() => actions?.onDelete(id)}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {mediaType === "video" ? (
        <div
          className={
            selected
              ? "media-drag-handle absolute left-1/2 top-2 z-10 flex h-7 w-12 -translate-x-1/2 cursor-grab items-center justify-center rounded bg-black/55 text-white shadow-sm active:cursor-grabbing"
              : "media-drag-handle absolute left-1/2 top-2 z-10 flex h-7 w-12 -translate-x-1/2 cursor-grab items-center justify-center rounded bg-black/55 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          }
          title="拖动视频"
        >
          <GripHorizontal className="h-4 w-4" aria-hidden="true" />
        </div>
      ) : null}

      <div className="h-full w-full overflow-hidden bg-slate-950/5">
        {assetUrl && mediaType === "video" ? (
          <video
            src={assetUrl}
            className={`nodrag nowheel h-full w-full ${objectFitClass}`}
            controls
            loop
            playsInline
            preload="metadata"
          />
        ) : assetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl}
            alt={data.label}
            className={`h-full w-full ${objectFitClass}`}
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            媒体不可用
          </div>
        )}
      </div>

      <CanvasConnectionHandle
        type="target"
        visible={selected}
      />
      <CanvasConnectionHandle
        type="source"
        visible={selected}
      />
    </div>
  );
}
