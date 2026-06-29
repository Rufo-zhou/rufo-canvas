"use client";

import { NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";
import { MapPin } from "lucide-react";
import { useCanvasNodeActions } from "./CanvasNodeActionsContext";
import { CanvasConnectionHandle } from "./CanvasConnectionHandle";
import type { CanvasNode } from "./types";

export function CanvasElementNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const { updateNodeData } = useReactFlow<CanvasNode>();
  const actions = useCanvasNodeActions();

  if (data.kind === "marker") {
    return (
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-white shadow-lg">
        <CanvasHandles />
        <MapPin className="h-6 w-6" aria-hidden="true" />
      </div>
    );
  }

  if (data.kind === "text") {
    return (
      <div className="relative h-full w-full">
        <CanvasHandles />
        <NodeResizer
          color="#0f172a"
          isVisible={selected}
          minWidth={120}
          minHeight={56}
          onResizeStart={() => actions?.onBeforeTransform()}
          onResizeEnd={() => actions?.onTransformEnd()}
          handleClassName="!h-2.5 !w-2.5 !border !border-white"
        />
        <textarea
          value={data.text ?? data.label}
          onChange={(event) => {
            updateNodeData(id, {
              text: event.target.value,
              label: event.target.value || "文字"
            });
          }}
          onFocus={() => actions?.onBeforeTransform()}
          onBlur={() => actions?.onTransformEnd()}
          className="nodrag h-full w-full resize-none overflow-hidden border-0 bg-transparent p-2 text-2xl font-semibold leading-tight text-slate-900 outline-none"
          aria-label="画布文字"
        />
      </div>
    );
  }

  if (data.kind === "drawing") {
    const width = data.width ?? 240;
    const height = data.height ?? 180;

    return (
      <div className="relative h-full w-full">
        <CanvasHandles />
        <NodeResizer
          color="#0f172a"
          isVisible={selected}
          minWidth={40}
          minHeight={40}
          onResizeStart={() => actions?.onBeforeTransform()}
          onResizeEnd={() => actions?.onTransformEnd()}
          handleClassName="!h-2.5 !w-2.5 !border !border-white"
        />
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full overflow-visible"
          aria-label={data.label}
        >
          <path
            d={data.path}
            fill="none"
            stroke={data.color ?? "#111827"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="h-full w-full border-2 border-dashed border-slate-400 bg-white/20">
      <NodeResizer
        color="#0f172a"
        isVisible={selected}
        minWidth={160}
        minHeight={120}
        onResizeStart={() => actions?.onBeforeTransform()}
        onResizeEnd={() => actions?.onTransformEnd()}
        handleClassName="!h-2.5 !w-2.5 !border !border-white"
      />
      <CanvasConnectionHandle type="target" visible={selected} />
      <div className="flex h-9 items-center border-b border-dashed border-slate-300 px-3 text-xs font-semibold text-slate-600">
        {data.label}
      </div>
      <CanvasConnectionHandle type="source" visible={selected} />
    </div>
  );
}

function CanvasHandles() {
  return (
    <>
      <CanvasConnectionHandle type="target" visible />
      <CanvasConnectionHandle type="source" visible />
    </>
  );
}
